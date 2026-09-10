use std::collections::HashMap;
use std::sync::Mutex;

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Result payload returned immediately after launching a job.
#[derive(serde::Serialize)]
struct JobStarted {
    ok: bool,
    started: bool,
}

#[derive(serde::Serialize)]
struct StatusPayload {
    ok: bool,
    message: String,
}

/// Holds all currently-running sidecar children. Children are keyed by their
/// client-provided `token` so multiple concurrent jobs never interfere.
struct ChildState {
    active: Mutex<HashMap<String, CommandChild>>,
}

/// Builds the argv for a luma invocation.
///
/// The `--json` / `--progress-json` global flags must appear before the
/// subcommand, so we inject them at the front.
fn build_argv(args: &[String], progress: bool) -> Vec<String> {
    let mut argv = Vec::new();
    if progress {
        argv.push("--progress-json".to_string());
    } else {
        argv.push("--json".to_string());
    }
    argv.extend_from_slice(args);
    argv
}

/// Launch a luma sidecar job in the background, streaming NDJSON events to the
/// frontend. Every event is wrapped with the job's numeric id so the frontend
/// can route events to the correct job, even when multiple run concurrently.
#[tauri::command]
fn run_luma(
    app: AppHandle,
    state: State<'_, ChildState>,
    args: Vec<String>,
    progress: bool,
    token: String,
) -> Result<JobStarted, String> {
    let sidecar = app
        .shell()
        .sidecar("luma-sidecar")
        .map_err(|e| format!("Failed to locate luma sidecar: {e}"))?;

    let argv = build_argv(&args, progress);
    let (mut rx, child) = match sidecar.args(&argv).spawn() {
        Ok(x) => x,
        Err(e) => return Err(format!("Failed to spawn luma sidecar: {e}")),
    };

    state.active.lock().unwrap().insert(token.clone(), child);

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }
                    match serde_json::from_str::<Value>(trimmed) {
                        Ok(value) => {
                            let wrapped = serde_json::json!({ "job": token, "data": value });
                            let _ = app.emit("luma://job", wrapped);
                        }
                        Err(_) => {
                            let wrapped = serde_json::json!({ "job": token, "line": trimmed });
                            let _ = app.emit("luma://log", wrapped);
                        }
                    }
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    let wrapped = serde_json::json!({ "job": token, "line": line.trim() });
                    let _ = app.emit("luma://log", wrapped);
                }
                CommandEvent::Terminated(payload) => {
                    let wrapped = serde_json::json!({ "job": token, "code": payload.code });
                    let _ = app.emit("luma://terminated", wrapped);
                }
                _ => {}
            }
        }
        let state = app.state::<ChildState>();
        state.active.lock().unwrap().remove(&token);
        let _ = app.emit("luma://exit", serde_json::json!({ "job": token }));
    });

    Ok(JobStarted {
        ok: true,
        started: true,
    })
}

/// Kill a specific running luma sidecar job by its token.
#[tauri::command]
fn kill_luma(state: State<'_, ChildState>, token: String) -> StatusPayload {
    let child = state.active.lock().unwrap().remove(&token);
    match child {
        Some(child) => {
            let _ = child.kill();
            StatusPayload {
                ok: true,
                message: format!("Job {token} terminated"),
            }
        }
        None => StatusPayload {
            ok: true,
            message: format!("No running job {token}"),
        },
    }
}

/// Report how many jobs are currently running.
#[tauri::command]
fn luma_running(state: State<'_, ChildState>) -> StatusPayload {
    let count = state.active.lock().unwrap().len();
    StatusPayload {
        ok: count > 0,
        message: if count > 0 {
            format!("{count} job(s) running")
        } else {
            "idle".to_string()
        },
    }
}

/// Kill every running luma sidecar job (used to clear orphaned jobs after a
/// frontend reload loses track of them).
#[tauri::command]
fn kill_all_luma(state: State<'_, ChildState>) -> StatusPayload {
    let mut active = state.active.lock().unwrap();
    let count = active.len();
    for (_, child) in active.drain() {
        let _ = child.kill();
    }
    StatusPayload {
        ok: true,
        message: if count > 0 {
            format!("{count} job(s) terminated")
        } else {
            "no jobs running".to_string()
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .manage(ChildState {
            active: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![run_luma, kill_luma, luma_running, kill_all_luma])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
