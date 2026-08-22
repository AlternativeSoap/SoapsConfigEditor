use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

#[derive(Serialize)]
struct ScannedYamlFile {
    path: String,
    name: String,
    content: String,
}

#[derive(Serialize)]
struct SaveResult {
    backup_path: Option<String>,
}

#[tauri::command]
fn scan_yaml_files(root_path: String) -> Result<Vec<ScannedYamlFile>, String> {
    let root = PathBuf::from(root_path);
    if !root.exists() {
        return Err("Selected folder does not exist.".to_string());
    }

    let mut files: Vec<ScannedYamlFile> = Vec::new();
    for entry in WalkDir::new(&root).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) else {
            continue;
        };
        let ext_lower = ext.to_ascii_lowercase();
        if ext_lower != "yml" && ext_lower != "yaml" {
            continue;
        }

        let full_path = entry.path().to_path_buf();
        let relative_path = full_path
            .strip_prefix(&root)
            .map_err(|_| "Failed to compute relative path.".to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let name = entry.file_name().to_string_lossy().to_string();
        let content = fs::read_to_string(&full_path)
            .map_err(|err| format!("Could not read {}: {}", relative_path, err))?;

        files.push(ScannedYamlFile {
            path: relative_path,
            name,
            content,
        });
    }

    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(files)
}

#[tauri::command]
fn save_yaml_file(root_path: String, relative_path: String, content: String) -> Result<SaveResult, String> {
    let root = PathBuf::from(root_path);
    let full_path = root.join(&relative_path);
    let original = fs::read_to_string(&full_path).unwrap_or_default();
    let backup_name = format!(
        "{}.bak.{}",
        full_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file.yml"),
        chrono_like_timestamp()
    );
    let backup_path = full_path.with_file_name(backup_name);
    let tmp_path = full_path.with_extension("tmp_write");

    fs::write(&tmp_path, content).map_err(|err| format!("Could not write temp file: {}", err))?;
    fs::rename(&tmp_path, &full_path).map_err(|err| format!("Could not finalize save: {}", err))?;

    let backup_result = fs::write(&backup_path, original).ok().map(|_| {
        backup_path
            .strip_prefix(&root)
            .unwrap_or(&backup_path)
            .to_string_lossy()
            .replace('\\', "/")
    });

    Ok(SaveResult {
        backup_path: backup_result,
    })
}

fn chrono_like_timestamp() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|dur| dur.as_millis())
        .unwrap_or(0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_yaml_files, save_yaml_file])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
