mod store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            store::store_location,
            store::choose_store_path,
            store::open_store_file,
            store::remember_store_path,
            store::reset_store_path,
            store::load_store,
            store::save_store,
            store::save_xlsx
        ])
        .run(tauri::generate_context!())
        .expect("Gita başlatılamadı");
}
