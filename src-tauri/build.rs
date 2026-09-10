use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    tauri_build::build();

    // The sidecar is a PyInstaller one-dir (onedir) bundle: a small launcher
    // binary plus a sibling `_internal/` folder that holds the actual Python
    // runtime and bundled libraries. Tauri only copies the launcher binary into
    // the cargo target dir during `tauri dev`/`build`, so we copy the `_internal`
    // folder next to it here, where the launcher expects it to live.
    //
    // Source layout:
    //   src-tauri/binaries/luma-sidecar-aarch64-apple-darwin   (launcher)
    //   src-tauri/binaries/_internal/                          (onedir payload)
    // Destination (dev):
    //   src-tauri/target/debug/luma-sidecar  +  src-tauri/target/debug/_internal
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let profile = env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    let target_bin_dir = manifest_dir.join("target").join(&profile);

    let src_internal = manifest_dir.join("binaries").join("_internal");
    if src_internal.is_dir() {
        let dst_internal = target_bin_dir.join("_internal");
        let _ = fs::remove_dir_all(&dst_internal);
        fs::create_dir_all(&target_bin_dir).ok();
        if let Err(e) = copy_dir(&src_internal, &dst_internal) {
            eprintln!("[luma build.rs] warning: could not stage _internal next to sidecar: {e}");
        } else {
            println!("[luma build.rs] staged _internal next to dev sidecar");
        }
    }
}

fn copy_dir(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir(&from, &to)?;
        } else if file_type.is_symlink() {
            #[cfg(unix)]
            {
                let link = fs::read_link(&from)?;
                let _ = std::os::unix::fs::symlink(link, &to);
            }
        } else {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}
