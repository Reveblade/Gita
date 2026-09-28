import type { StoreLocation } from "../persistence";
import { chooseStorePath, openStoreFile, resetStorePath, storeLocation } from "../persistence";
import { useEffect, useState } from "react";
import { useGita } from "../store";

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function StoreFilePanel() {
  const { store, error, adoptStore } = useGita();
  const [location, setLocation] = useState<StoreLocation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    storeLocation()
      .then((next) => {
        if (live) setLocation(next);
      })
      .catch((reason: unknown) => {
        if (live) setNotice(message(reason, "Konum okunamadı"));
      });
    return () => {
      live = false;
    };
  }, []);

  async function choose() {
    setBusy(true);
    setNotice(null);
    try {
      const next = await chooseStorePath(store);
      if (!next) return;
      setLocation(next);
      setNotice(next.downloaded ? "okullar.json indirildi." : "Kayıt seçilen dosyaya yazıldı.");
    } catch (reason) {
      setNotice(message(reason, "Konum seçilemedi"));
    } finally {
      setBusy(false);
    }
  }

  async function openFile() {
    setBusy(true);
    setNotice(null);
    try {
      const opened = await openStoreFile();
      if (!opened) return;
      adoptStore(opened.store);
      setLocation(opened.location);
      setNotice("Seçilen dosya yüklendi.");
    } catch (reason) {
      setNotice(message(reason, "Dosya açılamadı"));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setNotice(null);
    try {
      const next = await resetStorePath(store);
      setLocation(next);
      setNotice("Kayıt varsayılan konuma yazıldı.");
    } catch (reason) {
      setNotice(message(reason, "Varsayılan konuma dönülemedi"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="file-strip">
      <h2 className="file-label">Kayıt dosyası</h2>
      <input
        className="path-line"
        readOnly
        aria-label="Kayıt dosyası yolu"
        value={location?.path ?? "Konum okunuyor"}
      />
      <div className="file-actions">
        <button className="btn primary" type="button" disabled={busy || Boolean(error)} onClick={() => void choose()}>
          Konum seç
        </button>
        <button className="btn" type="button" disabled={busy} onClick={() => void openFile()}>
          Dosya aç
        </button>
        {location?.custom ? (
          <button className="btn" type="button" disabled={busy || Boolean(error)} onClick={() => void reset()}>
            Varsayılan konum
          </button>
        ) : null}
      </div>
      {error ? <p className="confirm-note file-note">{error}</p> : null}
      {notice ? <p className="hint file-note">{notice}</p> : null}
    </section>
  );
}
