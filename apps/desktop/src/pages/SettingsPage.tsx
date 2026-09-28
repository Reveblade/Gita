import {
  DAY_LABELS,
  WEEKDAYS,
  addSchool,
  createSchool,
  deleteSchool,
  renameSchool,
  setActiveSchool,
  setSchoolDays,
  setTermStart,
  setWeekCount,
  type School,
  type Weekday,
} from "@gita/domain";
import { Dialog } from "@gita/ui";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useGita } from "../store";
import { StoreFilePanel } from "./StoreFilePanel";

function formatTerm(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

function AddSchoolDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    onClose();
  }

  return (
    <Dialog title="Okul ekle" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label className="field">
          Okul adı
          <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
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

function EditSchoolDialog({
  school,
  onClose,
  onSave,
  onDelete,
}: {
  school: School;
  onClose: () => void;
  onSave: (draft: { name: string; termStart: string; weekCount: number; days: Weekday[] }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(school.name);
  const [termStart, setTerm] = useState(school.termStart);
  const [weekCount, setWeeks] = useState(school.weekCount);
  const [days, setDays] = useState<Weekday[]>(school.days);
  const [confirming, setConfirming] = useState(false);

  function toggleDay(day: Weekday, checked: boolean) {
    setDays((current) => {
      const next = checked ? [...current, day] : current.filter((item) => item !== day);
      return WEEKDAYS.filter((item) => next.includes(item));
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || days.length === 0) return;
    onSave({ name: name.trim(), termStart, weekCount, days });
    onClose();
  }

  return (
    <Dialog title="Okulu düzenle" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label className="field">
          Okul adı
          <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
        </label>
        <label className="field">
          Dönem başlangıcı
          <input type="date" value={termStart} onChange={(event) => event.target.value && setTerm(event.target.value)} />
        </label>
        <label className="field">
          Hafta sayısı
          <input
            type="number"
            min={1}
            max={52}
            value={weekCount}
            onChange={(event) => setWeeks(Number(event.target.value))}
          />
        </label>
        <fieldset className="field">
          <legend>Nöbet günleri</legend>
          <div className="day-picks">
            {WEEKDAYS.map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={days.includes(day)}
                  onChange={(event) => toggleDay(day, event.target.checked)}
                />
                {DAY_LABELS[day]}
              </label>
            ))}
          </div>
        </fieldset>
        {days.length === 0 ? <p className="confirm-note">En az bir nöbet günü seçin.</p> : null}
        {confirming ? (
          <div className="dialog-actions">
            <p className="confirm-note">Öğretmenler, nöbet yerleri ve atamalar bu okulla silinecek.</p>
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
              Okulu sil
            </button>
            <div className="dialog-actions-end">
              <button className="btn" type="button" onClick={onClose}>
                Vazgeç
              </button>
              <button className="btn primary" type="submit" disabled={!name.trim() || days.length === 0}>
                Kaydet
              </button>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
}

export function SettingsPage() {
  const { store, school, updateStore, updateSchool } = useGita();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (params.get("ekle") !== "1") return;
    setAdding(true);
    const next = new URLSearchParams(params);
    next.delete("ekle");
    setParams(next, { replace: true });
  }, [params, setParams]);

  return (
    <div className="settings-workspace">
      <StoreFilePanel />
      <div className="settings-split">
        <aside className="school-rail">
          <div className="school-rail-list" role="listbox" aria-label="Okul profilleri">
            {store.schools.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === store.activeSchoolId}
                className={item.id === store.activeSchoolId ? "school-row active" : "school-row"}
                onClick={() => updateStore((current) => setActiveSchool(current, item.id))}
              >
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          <div className="school-rail-foot">
            <button className="btn primary" type="button" onClick={() => setAdding(true)}>
              Okul ekle
            </button>
          </div>
        </aside>
        <section className="school-detail">
          {school ? (
            <>
              <header className="detail-bar">
                <h1 className="workspace-title">{school.name}</h1>
                <button className="btn" type="button" onClick={() => setEditing(true)}>
                  Düzenle
                </button>
              </header>
              <div className="metric-row">
                <div className="metric">
                  <span>Dönem başlangıcı</span>
                  <strong>{formatTerm(school.termStart)}</strong>
                </div>
                <div className="metric">
                  <span>Hafta sayısı</span>
                  <strong>{school.weekCount}</strong>
                </div>
                <div className="metric">
                  <span>Öğretmen</span>
                  <strong>{school.teachers.length}</strong>
                </div>
                <div className="metric">
                  <span>Nöbet yeri</span>
                  <strong>{school.places.length}</strong>
                </div>
              </div>
              <div className="day-strip">
                <span className="day-strip-label">Nöbet günleri</span>
                {school.days.map((day) => (
                  <span className="day-chip" key={day}>
                    {DAY_LABELS[day]}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="workspace-empty">Henüz okul profili yok.</p>
          )}
        </section>
      </div>
      {adding ? (
        <AddSchoolDialog
          onClose={() => setAdding(false)}
          onCreate={(name) => updateStore((current) => addSchool(current, createSchool(name)))}
        />
      ) : null}
      {editing && school ? (
        <EditSchoolDialog
          key={school.id}
          school={school}
          onClose={() => setEditing(false)}
          onSave={(draft) =>
            updateSchool((current) => {
              let next = renameSchool(current, draft.name);
              next = setTermStart(next, draft.termStart);
              next = setWeekCount(next, draft.weekCount);
              next = setSchoolDays(next, draft.days);
              return next;
            })
          }
          onDelete={() => {
            const id = school.id;
            updateStore((current) => deleteSchool(current, id));
            setEditing(false);
          }}
        />
      ) : null}
    </div>
  );
}
