use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

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

struct ChildState {
    active: Mutex<Option<CommandChild>>,
    running: AtomicBool,
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

/// Launch a luma sidecar job in the background, streaming NDJSON progress
/// events to the frontend and emitting a final result event.
#[tauri::command]
fn run_luma(
    app: AppHandle,
    state: State<'_, ChildState>,
    args: Vec<String>,
    progress: bool,
) -> Result<JobStarted, String> {
    if let Some(child) = state.active.lock().unwrap().take() {
        let _ = child.kill();
        state.running.store(false, Ordering::SeqCst);
    }

    let sidecar = app
        .shell()
        .sidecar("luma-sidecar")
        .map_err(|e| format!("Failed to locate luma sidecar: {e}"))?;

    let argv = build_argv(&args, progress);
    let (mut rx, child) = sidecar
        .args(&argv)
        .spawn()
        .map_err(|e| format!("Failed to spawn luma sidecar: {e}"))?;

    *state.active.lock().unwrap() = Some(child);
    state.running.store(true, Ordering::SeqCst);

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
                            let _ = app.emit("luma://job", value);
                        }
                        Err(_) => {
                            let _ = app.emit("luma://log", Value::String(trimmed.to_string()));
                        }
                    }
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    let _ = app.emit("luma://log", Value::String(line.trim().to_string()));
                }
                CommandEvent::Terminated(payload) => {
                    let _ = app.emit("luma://terminated", payload.code);
                }
                _ => {}
            }
        }
        {
            let state = app.state::<ChildState>();
            *state.active.lock().unwrap() = None;
            state.running.store(false, Ordering::SeqCst);
        }
        let _ = app.emit("luma://exit", Value::Null);
    });

    Ok(JobStarted {
        ok: true,
        started: true,
    })
}

/// Kill any currently running luma sidecar job.
#[tauri::command]
fn kill_luma(state: State<'_, ChildState>) -> StatusPayload {
    let child = state.active.lock().unwrap().take();
    match child {
        Some(child) => {
            let _ = child.kill();
            state.running.store(false, Ordering::SeqCst);
            StatusPayload {
                ok: true,
                message: "Job terminated".to_string(),
            }
        }
        None => StatusPayload {
            ok: true,
            message: "No job running".to_string(),
        },
    }
}

/// Report whether a job is currently running.
#[tauri::command]
fn luma_running(state: State<'_, ChildState>) -> StatusPayload {
    StatusPayload {
        ok: state.running.load(Ordering::SeqCst),
        message: if state.running.load(Ordering::SeqCst) {
            "running".to_string()
        } else {
            "idle".to_string()
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(ChildState {
            active: Mutex::new(None),
            running: AtomicBool::new(false),
        })
        .invoke_handler(tauri::generate_handler![run_luma, kill_luma, luma_running])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
