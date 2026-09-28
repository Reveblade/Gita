import { emptyStore, parseStore, type Store } from "@gita/domain";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./platform";

const STORAGE_KEY = "gita.okullar";
const HANDLE_DB = "gita";
const HANDLE_STORE = "files";
const HANDLE_KEY = "okullar";

export type StoreLocation = {
  path: string;
  custom: boolean;
  exists: boolean;
  kind: "file" | "browser";
  downloaded?: boolean;
};

type FileHandle = {
  name: string;
  queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type PickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<FileHandle>;
  showOpenFilePicker?: (options: {
    types?: { description: string; accept: Record<string, string[]> }[];
    multiple?: boolean;
  }) => Promise<FileHandle[]>;
};

const jsonPickerTypes = [{ description: "JSON", accept: { "application/json": [".json"] } }];

function pickerWindow(): PickerWindow {
  return window as PickerWindow;
}

function canUseFilePicker(): boolean {
  const host = pickerWindow();
  return typeof host.showSaveFilePicker === "function" && typeof host.showOpenFilePicker === "function";
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HANDLE_STORE)) {
        request.result.createObjectStore(HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Dosya kaydı açılamadı"));
  });
}

async function readHandle(): Promise<FileHandle | null> {
  if (!canUseFilePicker()) return null;
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(HANDLE_STORE).objectStore(HANDLE_STORE).get(HANDLE_KEY);
    request.onsuccess = () => resolve((request.result as FileHandle | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Dosya kaydı okunamadı"));
  });
}

async function writeHandle(handle: FileHandle | null): Promise<void> {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const store = db.transaction(HANDLE_STORE, "readwrite").objectStore(HANDLE_STORE);
    const request = handle ? store.put(handle, HANDLE_KEY) : store.delete(HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Dosya kaydı yazılamadı"));
  });
}

async function handleGranted(handle: FileHandle): Promise<boolean> {
  if (!handle.queryPermission) return true;
  const state = await handle.queryPermission({ mode: "readwrite" });
  return state === "granted";
}

async function readHandleStore(handle: FileHandle): Promise<Store | null> {
  const file = await handle.getFile();
  if (file.size === 0) return emptyStore();
  return parseStore(JSON.parse(await file.text()) as unknown);
}

async function writeHandleStore(handle: FileHandle, store: Store): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(store, null, 2));
  await writable.close();
}

function browserLocation(handle: FileHandle | null): StoreLocation {
  if (!handle) {
    return {
      path: "Bu tarayıcının yerel deposu",
      custom: false,
      exists: true,
      kind: "browser",
    };
  }
  return {
    path: handle.name,
    custom: true,
    exists: true,
    kind: "browser",
  };
}

export async function storeLocation(): Promise<StoreLocation> {
  if (isTauri()) {
    const location = await invoke<Omit<StoreLocation, "kind">>("store_location");
    return { ...location, kind: "file" };
  }
  return browserLocation(await grantedHandle());
}

async function grantedHandle(): Promise<FileHandle | null> {
  const handle = await readHandle();
  if (!handle || !(await handleGranted(handle))) return null;
  return handle;
}

function downloadStore(store: Store): void {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "okullar.json";
  link.click();
  URL.revokeObjectURL(url);
}

function pickJsonInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      resolve(file);
    };
    input.addEventListener("change", () => finish(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => finish(null));
    input.click();
  });
}

export async function chooseStorePath(store: Store): Promise<StoreLocation | null> {
  if (isTauri()) {
    const location = await invoke<Omit<StoreLocation, "kind"> | null>("choose_store_path", { store });
    return location ? { ...location, kind: "file" } : null;
  }
  const host = pickerWindow();
  if (!host.showSaveFilePicker) {
    downloadStore(store);
    return { ...browserLocation(null), downloaded: true };
  }
  try {
    const handle = await host.showSaveFilePicker({
      suggestedName: "okullar.json",
      types: jsonPickerTypes,
    });
    await writeHandleStore(handle, store);
    await writeHandle(handle);
    return browserLocation(handle);
  } catch (error) {
    if (isAbort(error)) return null;
    throw error;
  }
}

export async function openStoreFile(): Promise<{ location: StoreLocation; store: Store } | null> {
  if (isTauri()) {
    const opened = await invoke<{ path: string; store: unknown } | null>("open_store_file");
    if (!opened) return null;
    const store = parseStore(opened.store);
    const location = await invoke<Omit<StoreLocation, "kind">>("remember_store_path", { path: opened.path });
    return { location: { ...location, kind: "file" }, store };
  }
  const host = pickerWindow();
  if (host.showOpenFilePicker) {
    try {
      const [handle] = await host.showOpenFilePicker({ types: jsonPickerTypes, multiple: false });
      const store = await readHandleStore(handle);
      if (!store) return null;
      await writeHandle(handle);
      return { location: browserLocation(handle), store };
    } catch (error) {
      if (isAbort(error)) return null;
      throw error;
    }
  }
  const file = await pickJsonInput();
  if (!file) return null;
  const store = parseStore(JSON.parse(await file.text()) as unknown);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  return { location: browserLocation(null), store };
}

export async function resetStorePath(store: Store): Promise<StoreLocation> {
  if (isTauri()) {
    const location = await invoke<Omit<StoreLocation, "kind">>("reset_store_path", { store });
    return { ...location, kind: "file" };
  }
  await writeHandle(null);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  return browserLocation(null);
}

export async function loadStore(): Promise<Store> {
  if (isTauri()) {
    const value = await invoke<unknown>("load_store");
    if (value == null) return emptyStore();
    return parseStore(value);
  }
  const handle = await grantedHandle();
  if (handle) return (await readHandleStore(handle)) ?? emptyStore();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  return parseStore(JSON.parse(raw) as unknown);
}

export async function saveStore(store: Store): Promise<void> {
  if (isTauri()) {
    await invoke("save_store", { store });
    return;
  }
  const handle = await grantedHandle();
  if (handle) {
    await writeHandleStore(handle, store);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function saveBytes(filename: string, bytes: Uint8Array): Promise<void> {
  if (isTauri()) {
    await invoke("save_xlsx", { filename, bytes: Array.from(bytes) });
    return;
  }
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function fileSlug(name: string): string {
  const folded = name
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
  const slug = folded.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "okul";
}
