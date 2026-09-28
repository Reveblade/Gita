use serde_json::Value;
use std::path::{Path, PathBuf};

fn default_store_path() -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../dev-data/okullar.json"))
    } else {
        let exe = std::env::current_exe().map_err(|error| error.to_string())?;
        let dir = exe.parent().ok_or("Kurulum klasörü bulunamadı")?;
        Ok(dir.join("data").join("okullar.json"))
    }
}

fn pointer_path() -> Result<PathBuf, String> {
    let store = default_store_path()?;
    let dir = store.parent().ok_or("Kayıt klasörü bulunamadı")?;
    Ok(dir.join("gita-yol.txt"))
}

fn resolve_store_path(default_path: &Path, pointer_text: Option<&str>) -> PathBuf {
    match pointer_text.map(str::trim).filter(|text| !text.is_empty()) {
        Some(text) => PathBuf::from(text),
        None => default_path.to_path_buf(),
    }
}

fn ensure_json(path: PathBuf) -> PathBuf {
    match path.extension().and_then(|ext| ext.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("json") => path,
        _ => path.with_extension("json"),
    }
}

fn read_pointer() -> Result<Option<String>, String> {
    let path = pointer_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let text = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    Ok(Some(text))
}

fn store_path() -> Result<PathBuf, String> {
    let default_path = default_store_path()?;
    let pointer = read_pointer()?;
    Ok(resolve_store_path(&default_path, pointer.as_deref()))
}

fn write_pointer(path: &Path) -> Result<(), String> {
    let pointer = pointer_path()?;
    if let Some(parent) = pointer.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let tmp = pointer.with_extension("txt.tmp");
    std::fs::write(&tmp, path.to_string_lossy().as_bytes()).map_err(|error| error.to_string())?;
    if pointer.exists() {
        std::fs::remove_file(&pointer).map_err(|error| error.to_string())?;
    }
    if let Err(error) = std::fs::rename(&tmp, &pointer) {
        let _ = std::fs::remove_file(&tmp);
        return Err(error.to_string());
    }
    Ok(())
}

fn clear_pointer() -> Result<(), String> {
    let pointer = pointer_path()?;
    if pointer.exists() {
        std::fs::remove_file(pointer).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn canonical_if_possible(path: &Path) -> PathBuf {
    if let Ok(canon) = std::fs::canonicalize(path) {
        return canon;
    }
    if let (Some(parent), Some(name)) = (path.parent(), path.file_name()) {
        if let Ok(dir) = std::fs::canonicalize(parent) {
            return dir.join(name);
        }
    }
    path.to_path_buf()
}

fn same_store_path(left: &Path, right: &Path) -> bool {
    canonical_if_possible(left) == canonical_if_possible(right)
}

fn display_path(path: &Path) -> String {
    let text = canonical_if_possible(path).to_string_lossy().into_owned();
    text.strip_prefix(r"\\?\").unwrap_or(&text).to_string()
}

fn remember_or_clear(path: &Path) -> Result<(), String> {
    if same_store_path(path, &default_store_path()?) {
        clear_pointer()
    } else {
        write_pointer(Path::new(&display_path(path)))
    }
}

fn location_for(path: &Path) -> Result<StoreLocation, String> {
    let default_path = default_store_path()?;
    Ok(StoreLocation {
        path: display_path(path),
        custom: !same_store_path(path, &default_path),
        exists: path.is_file(),
    })
}

fn write_store_at(path: &Path, store: &Value) -> Result<(), String> {
    let text = serde_json::to_string_pretty(store).map_err(|error| error.to_string())?;
    atomic_write(path, text.as_bytes())
}

fn read_store_value(path: &Path) -> Result<Value, String> {
    let meta = std::fs::metadata(path).map_err(|error| error.to_string())?;
    if meta.len() > 5 * 1024 * 1024 {
        return Err("Dosya çok büyük".into());
    }
    let text = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    let value: Value = serde_json::from_str(&text).map_err(|_| "Dosya JSON değil".to_string())?;
    let object = value.as_object().ok_or("Kayıt bir nesne değil")?;
    if object.get("version").and_then(Value::as_i64) != Some(1) {
        return Err("Kayıt sürümü desteklenmiyor".into());
    }
    if !object.get("schools").is_some_and(Value::is_array) {
        return Err("Okul listesi yok".into());
    }
    Ok(value)
}

#[derive(serde::Serialize)]
pub struct StoreLocation {
    pub path: String,
    pub custom: bool,
    pub exists: bool,
}

#[derive(serde::Serialize)]
pub struct OpenedStore {
    pub path: String,
    pub store: Value,
}

const SEED_STORE: &[u8] = include_bytes!("../../dev-data/test-okulu.json");

fn write_seed_if_missing(path: &Path, bytes: &[u8]) -> Result<bool, String> {
    if path.is_file() {
        return Ok(false);
    }
    atomic_write(path, bytes)?;
    Ok(true)
}

fn ensure_seeded(path: &Path) -> Result<(), String> {
    if cfg!(debug_assertions) || path.is_file() {
        return Ok(());
    }
    if !same_store_path(path, &default_store_path()?) {
        return Ok(());
    }
    write_seed_if_missing(path, SEED_STORE)?;
    Ok(())
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, bytes).map_err(|error| error.to_string())?;
    if path.exists() {
        std::fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    if let Err(error) = std::fs::rename(&tmp, path) {
        let _ = std::fs::remove_file(&tmp);
        return Err(error.to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn store_location() -> Result<StoreLocation, String> {
    location_for(&store_path()?)
}

#[tauri::command]
pub fn choose_store_path(store: Value) -> Result<Option<StoreLocation>, String> {
    let current = store_path()?;
    let mut dialog = rfd::FileDialog::new()
        .set_title("Nöbet kaydının konumu")
        .set_file_name("okullar.json")
        .add_filter("JSON", &["json"]);
    if let Some(parent) = current.parent() {
        if parent.is_dir() {
            dialog = dialog.set_directory(parent);
        }
    }
    let Some(picked) = dialog.save_file() else {
        return Ok(None);
    };
    let path = ensure_json(picked);
    write_store_at(&path, &store)?;
    remember_or_clear(&path)?;
    Ok(Some(location_for(&path)?))
}

#[tauri::command]
pub fn open_store_file() -> Result<Option<OpenedStore>, String> {
    let current = store_path()?;
    let mut dialog = rfd::FileDialog::new()
        .set_title("Nöbet kaydı aç")
        .add_filter("JSON", &["json"]);
    if let Some(parent) = current.parent() {
        if parent.is_dir() {
            dialog = dialog.set_directory(parent);
        }
    }
    let Some(path) = dialog.pick_file() else {
        return Ok(None);
    };
    let store = read_store_value(&path)?;
    Ok(Some(OpenedStore {
        path: path.to_string_lossy().into_owned(),
        store,
    }))
}

#[tauri::command]
pub fn remember_store_path(path: String) -> Result<StoreLocation, String> {
    let path = PathBuf::from(path);
    let _ = read_store_value(&path)?;
    remember_or_clear(&path)?;
    location_for(&path)
}

#[tauri::command]
pub fn reset_store_path(store: Value) -> Result<StoreLocation, String> {
    let path = default_store_path()?;
    write_store_at(&path, &store)?;
    clear_pointer()?;
    location_for(&path)
}

#[tauri::command]
pub fn load_store() -> Result<Option<Value>, String> {
    let path = store_path()?;
    ensure_seeded(&path)?;
    if !path.exists() {
        return Ok(None);
    }
    let text = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    let value = serde_json::from_str(&text).map_err(|error| error.to_string())?;
    Ok(Some(value))
}

#[tauri::command]
pub fn save_store(store: Value) -> Result<(), String> {
    let path = store_path()?;
    let text = serde_json::to_string_pretty(&store).map_err(|error| error.to_string())?;
    atomic_write(&path, text.as_bytes())
}

#[tauri::command]
pub fn save_xlsx(filename: String, bytes: Vec<u8>) -> Result<(), String> {
    let Some(path) = rfd::FileDialog::new()
        .set_title("Excel kaydet")
        .set_file_name(filename)
        .add_filter("Excel", &["xlsx"])
        .save_file()
    else {
        return Ok(());
    };
    std::fs::write(path, bytes).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{atomic_write, ensure_json, resolve_store_path, same_store_path, write_seed_if_missing, SEED_STORE};
    use std::path::PathBuf;

    #[test]
    fn replaces_existing_json() {
        let dir = std::env::temp_dir().join(format!("gita-store-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("okullar.json");
        atomic_write(&path, b"{\"version\":1}").unwrap();
        atomic_write(&path, b"{\"version\":1,\"schools\":[]}").unwrap();
        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("schools"));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn pointer_overrides_default_path() {
        let default_path = PathBuf::from("C:/Gita/data/okullar.json");
        let resolved = resolve_store_path(&default_path, Some(" D:/Okul/nobet.json \n"));
        assert_eq!(resolved, PathBuf::from("D:/Okul/nobet.json"));
    }

    #[test]
    fn empty_pointer_keeps_default_path() {
        let default_path = PathBuf::from("C:/Gita/data/okullar.json");
        assert_eq!(resolve_store_path(&default_path, None), default_path);
        assert_eq!(resolve_store_path(&default_path, Some("  ")), default_path);
    }

    #[test]
    fn same_path_ignores_parent_dotdot() {
        let dir = std::env::temp_dir().join(format!("gita-path-{}", std::process::id()));
        let nested = dir.join("nested");
        std::fs::create_dir_all(&nested).unwrap();
        let file = dir.join("okullar.json");
        std::fs::write(&file, b"{}").unwrap();
        let via_dot = nested.join("../okullar.json");
        assert!(same_store_path(&file, &via_dot));
        assert!(!same_store_path(&file, &nested.join("baska.json")));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn seed_is_utf8_store_and_does_not_replace_existing_file() {
        let value: serde_json::Value = serde_json::from_slice(SEED_STORE).unwrap();
        assert_eq!(value["version"], 1);
        assert!(value["schools"].as_array().unwrap().iter().any(|school| {
            school["id"] == "test-okulu"
        }));

        let dir = std::env::temp_dir().join(format!("gita-seed-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("okullar.json");
        assert!(write_seed_if_missing(&path, SEED_STORE).unwrap());
        atomic_write(&path, b"{\"version\":1,\"schools\":[]}").unwrap();
        assert!(!write_seed_if_missing(&path, SEED_STORE).unwrap());
        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("\"schools\":[]"));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn adds_json_extension() {
        assert_eq!(ensure_json(PathBuf::from("okullar")), PathBuf::from("okullar.json"));
        assert_eq!(
            ensure_json(PathBuf::from("okullar.JSON")),
            PathBuf::from("okullar.JSON")
        );
    }
}
