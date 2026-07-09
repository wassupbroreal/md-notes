use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Note {
    id: String,
    title: String,
    #[serde(default)]
    description: String,
    content: String,
    updated_at: u64,
    #[serde(default)]
    path: String,
}

fn get_notes_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app_handle.path().document_dir()
        .map_err(|e| e.to_string())?;
    path.push("MD Notes");
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[tauri::command]
fn load_notes(app_handle: tauri::AppHandle) -> Result<Vec<Note>, String> {
    let notes_dir = get_notes_dir(&app_handle)?;
    let mut notes = Vec::new();
    
    let entries = fs::read_dir(notes_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            if let Ok(mut note) = serde_json::from_str::<Note>(&content) {
                note.path = path.to_string_lossy().into_owned();
                notes.push(note);
            }
        }
    }
    
    notes.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(notes)
}

#[tauri::command]
fn save_note(app_handle: tauri::AppHandle, id: String, title: String, description: String, content: String) -> Result<Note, String> {
    let notes_dir = get_notes_dir(&app_handle)?;
    let file_path = notes_dir.join(format!("{}.json", id));
    let path_str = file_path.to_string_lossy().into_owned();
    
    let note = Note {
        id: id.clone(),
        title,
        description,
        content,
        updated_at: get_current_timestamp(),
        path: path_str,
    };
    
    let json = serde_json::to_string_pretty(&note).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;
    
    Ok(note)
}

#[tauri::command]
fn delete_note(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&app_handle)?;
    let file_path = notes_dir.join(format!("{}.json", id));
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_in_browser(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app_handle.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![load_notes, save_note, delete_note, open_in_browser])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
