import { addPlace, movePlace, removePlace, renamePlace, type Place } from "@gita/domain";
import { Dialog } from "@gita/ui";
import { ArrowDown, ArrowUp, PencilSimple } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useGita } from "../store";
import { EmptySchool } from "./EmptySchool";

function AddPlaceDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name);
    onClose();
  }

  return (
    <Dialog title="Nöbet yeri ekle" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label className="field">
          Yer adı
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Bahçe" required autoFocus />
        </label>
        <div className="dialog-actions">
          <div className="dialog-actions-end">
            <button className="btn" type="button" onClick={onClose}>
              Vazgeç
            </button>
            <button className="btn primary" type="submit">
              Ekle
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function EditPlaceDialog({
  place,
  onClose,
  onSave,
  onDelete,
}: {
  place: Place;
  onClose: () => void;
  onSave: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(place.name);
  const [confirming, setConfirming] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(name);
    onClose();
  }

  return (
    <Dialog title="Nöbet yerini düzenle" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label className="field">
          Yer adı
          <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        </label>
        {confirming ? (
          <div className="dialog-actions">
            <p className="confirm-note">Yer ve üzerindeki atamalar silinecek.</p>
            <div className="dialog-actions-end">
              <button className="btn" type="button" onClick={() => setConfirming(false)}>
                Vazgeç
              </button>
              <button className="btn danger" type="button" onClick={onDelete}>
                Sil
              </button>
            </div>
          </div>
        ) : (
          <div className="dialog-actions">
            <button className="btn danger" type="button" onClick={() => setConfirming(true)}>
              Sil
            </button>
            <div className="dialog-actions-end">
              <button className="btn" type="button" onClick={onClose}>
                Vazgeç
              </button>
              <button className="btn primary" type="submit">
                Kaydet
              </button>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
}

export function PlacesPage() {
  const { school, updateSchool } = useGita();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  if (!school) return <EmptySchool />;

  return (
    <div className="workspace">
      <header className="workspace-bar">
        <h1 className="workspace-title">Nöbet yerleri</h1>
        <button className="btn primary" type="button" onClick={() => setAdding(true)}>
          Yer ekle
        </button>
      </header>
      <div className="workspace-body">
        {school.places.length === 0 ? (
          <p className="workspace-empty">Henüz nöbet yeri yok.</p>
        ) : (
          <div className="data-sheet sheet-places" role="table">
            <div className="sheet-head" role="row">
              <span className="sheet-cell sheet-index" role="columnheader">
                Sıra
              </span>
              <span className="sheet-cell" role="columnheader">
                Yer
              </span>
              <span className="sheet-cell sheet-actions" role="columnheader">
                <span className="sr-only">İşlem</span>
              </span>
            </div>
            {school.places.map((place, index) => (
              <div className="sheet-row" role="row" key={place.id}>
                <span className="sheet-cell sheet-index" role="cell">
                  {index + 1}
                </span>
                <span className="sheet-cell sheet-name" role="cell">
                  {place.name}
                </span>
                <span className="sheet-cell sheet-actions" role="cell">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${place.name} yerini yukarı al`}
                    disabled={index === 0}
                    onClick={() => updateSchool((current) => movePlace(current, index, -1))}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${place.name} yerini aşağı al`}
                    disabled={index === school.places.length - 1}
                    onClick={() => updateSchool((current) => movePlace(current, index, 1))}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${place.name} yerini düzenle`}
                    onClick={() => setEditing(place)}
                  >
                    <PencilSimple size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {adding ? (
        <AddPlaceDialog
          onClose={() => setAdding(false)}
          onCreate={(name) => updateSchool((current) => addPlace(current, name))}
        />
      ) : null}
      {editing ? (
        <EditPlaceDialog
          key={editing.id}
          place={editing}
          onClose={() => setEditing(null)}
          onSave={(name) => updateSchool((current) => renamePlace(current, editing.id, name))}
          onDelete={() => {
            const id = editing.id;
            updateSchool((current) => removePlace(current, id));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
