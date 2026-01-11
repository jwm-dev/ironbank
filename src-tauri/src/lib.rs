use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct LedgerInfo {
    pub name: String,
    pub filename: String,
    pub path: String,
    pub modified: u64,
    pub size: u64,
}

/// Get the ledgers directory path
fn get_ledgers_dir() -> Result<PathBuf, String> {
    let documents = dirs::document_dir()
        .ok_or_else(|| "Could not find Documents directory".to_string())?;
    let ledgers_dir = documents.join("Ironbank").join("ledgers");
    
    // Create directory if it doesn't exist
    if !ledgers_dir.exists() {
        fs::create_dir_all(&ledgers_dir)
            .map_err(|e| format!("Failed to create ledgers directory: {}", e))?;
    }
    
    Ok(ledgers_dir)
}

/// List all ledger files in the ledgers directory
#[tauri::command]
fn list_ledgers() -> Result<Vec<LedgerInfo>, String> {
    let ledgers_dir = get_ledgers_dir()?;
    let mut ledgers = Vec::new();
    
    let entries = fs::read_dir(&ledgers_dir)
        .map_err(|e| format!("Failed to read ledgers directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "json" {
                    let metadata = fs::metadata(&path)
                        .map_err(|e| format!("Failed to read metadata: {}", e))?;
                    
                    let filename = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();
                    
                    // Try to read the ledger name from the file
                    let name = if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                            json.get("name")
                                .and_then(|n| n.as_str())
                                .unwrap_or(&filename)
                                .to_string()
                        } else {
                            filename.clone()
                        }
                    } else {
                        filename.clone()
                    };
                    
                    let modified = metadata.modified()
                        .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                        .unwrap_or(0);
                    
                    ledgers.push(LedgerInfo {
                        name,
                        filename,
                        path: path.to_string_lossy().to_string(),
                        modified,
                        size: metadata.len(),
                    });
                }
            }
        }
    }
    
    // Sort by modified date, newest first
    ledgers.sort_by(|a, b| b.modified.cmp(&a.modified));
    
    Ok(ledgers)
}

/// Read a ledger file
#[tauri::command]
fn read_ledger(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read ledger: {}", e))
}

/// Save a ledger file
#[tauri::command]
fn save_ledger(filename: String, content: String) -> Result<String, String> {
    let ledgers_dir = get_ledgers_dir()?;
    let path = ledgers_dir.join(&filename);
    
    fs::write(&path, &content)
        .map_err(|e| format!("Failed to save ledger: {}", e))?;
    
    Ok(path.to_string_lossy().to_string())
}

/// Delete a ledger file
#[tauri::command]
fn delete_ledger(path: String) -> Result<(), String> {
    fs::remove_file(&path)
        .map_err(|e| format!("Failed to delete ledger: {}", e))
}

/// Reset the tutorial ledger by copying fresh from bundled resources
#[tauri::command]
fn reset_tutorial_ledger(app_handle: tauri::AppHandle) -> Result<(), String> {
    let ledgers_dir = get_ledgers_dir()?;
    let tutorial_dest = ledgers_dir.join("tutorial.ledger.json");
    
    // Try to find and copy the bundled tutorial ledger
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let tutorial_src = resource_path.join("resources").join("tutorial.ledger.json");
        if tutorial_src.exists() {
            fs::copy(&tutorial_src, &tutorial_dest)
                .map_err(|e| format!("Failed to reset tutorial ledger: {}", e))?;
            return Ok(());
        }
    }
    
    // For dev mode, try the local resources directory
    #[cfg(debug_assertions)]
    {
        let dev_path = std::env::current_dir()
            .map(|p| p.join("resources").join("tutorial.ledger.json"))
            .ok();
        
        if let Some(dev_src) = dev_path {
            if dev_src.exists() {
                fs::copy(&dev_src, &tutorial_dest)
                    .map_err(|e| format!("Failed to reset tutorial ledger: {}", e))?;
                return Ok(());
            }
        }
    }
    
    Err("Tutorial source file not found".to_string())
}

/// Get the ledgers directory path
#[tauri::command]
fn get_ledgers_directory() -> Result<String, String> {
    let ledgers_dir = get_ledgers_dir()?;
    Ok(ledgers_dir.to_string_lossy().to_string())
}

/// Open the ledgers directory in file explorer
#[tauri::command]
fn open_ledgers_directory() -> Result<(), String> {
    let ledgers_dir = get_ledgers_dir()?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&ledgers_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&ledgers_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&ledgers_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }
    
    Ok(())
}

/// Get fresh tutorial data (always reads from bundled resource, never saves)
#[tauri::command]
fn get_tutorial_data(app_handle: tauri::AppHandle) -> Result<String, String> {
    // Try to find the bundled tutorial ledger
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let tutorial_src = resource_path.join("resources").join("tutorial.ledger.json");
        if tutorial_src.exists() {
            return fs::read_to_string(&tutorial_src)
                .map_err(|e| format!("Failed to read tutorial data: {}", e));
        }
    }
    
    // For dev mode, try the local resources directory
    #[cfg(debug_assertions)]
    {
        let dev_path = std::env::current_dir()
            .map(|p| p.join("resources").join("tutorial.ledger.json"))
            .ok();
        
        if let Some(dev_src) = dev_path {
            if dev_src.exists() {
                return fs::read_to_string(&dev_src)
                    .map_err(|e| format!("Failed to read tutorial data: {}", e));
            }
        }
    }
    
    Err("Tutorial data not found".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Copy tutorial ledger to ledgers directory on first run
            if let Ok(ledgers_dir) = get_ledgers_dir() {
                let tutorial_dest = ledgers_dir.join("tutorial.ledger.json");
                
                // Only copy if tutorial doesn't exist yet
                if !tutorial_dest.exists() {
                    // Try to find the bundled tutorial ledger
                    if let Ok(resource_path) = app.path().resource_dir() {
                        let tutorial_src = resource_path.join("resources").join("tutorial.ledger.json");
                        if tutorial_src.exists() {
                            let _ = fs::copy(&tutorial_src, &tutorial_dest);
                        }
                    }
                    
                    // For dev mode, try the local resources directory
                    #[cfg(debug_assertions)]
                    {
                        let dev_path = std::env::current_dir()
                            .map(|p| p.join("resources").join("tutorial.ledger.json"))
                            .ok();
                        
                        if let Some(dev_src) = dev_path {
                            if dev_src.exists() && !tutorial_dest.exists() {
                                let _ = fs::copy(&dev_src, &tutorial_dest);
                            }
                        }
                    }
                }
            }
            
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_ledgers,
            read_ledger,
            save_ledger,
            delete_ledger,
            reset_tutorial_ledger,
            get_ledgers_directory,
            open_ledgers_directory,
            get_tutorial_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
