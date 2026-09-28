import {
  DAY_LABELS,
  addTeacher,
  createTeacher,
  firstOpenDuty,
  removeTeacher,
  setTeacherDuty,
  teacherDuty,
  teacherName,
  updateTeacher,
  type Teacher,
  type Weekday,
} from "@gita/domain";
import { Dialog } from "@gita/ui";
import { useState, type FormEvent } from "react";
import { useGita } from "../store";
import { EmptySchool } from "./EmptySchool";

function TeacherFields({
  firstName,
  lastName,
  branch,
  onFirstName,
  onLastName,
  onBranch,
}: {
  firstName: string;
  lastName: string;
  branch: string;
  onFirstName: (value: string) => void;
  onLastName: (value: string) => void;
  onBranch: (value: string) => void;
}) {
  return (
    <>
      <label className="field">
        Ad
        <input value={firstName} onChange={(event) => onFirstName(event.target.value)} required autoFocus />
      </label>
      <label className="field">
        Soyad
        <input value={lastName} onChange={(event) => onLastName(event.target.value)} required />
      </label>
      <label className="field">
        Branş
        <input value={branch} onChange={(event) => onBranch(event.target.value)} />
      </label>
    </>
  );
}

function AddTeacherDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (teacher: Teacher) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [branch, setBranch] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onCreate(createTeacher(firstName, lastName, branch));
    onClose();
  }

  return (
    <Dialog title="Öğretmen ekle" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <TeacherFields
          firstName={firstName}
          lastName={lastName}
          branch={branch}
          onFirstName={setFirstName}
          onLastName={setLastName}
          onBranch={setBranch}
        />
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

function EditTeacherDialog({
  teacher,
  onClose,
  onSave,
  onDelete,
}: {
  teacher: Teacher;
  onClose: () => void;
  onSave: (teacher: Teacher) => void;
  onDelete: () => void;
}) {
  const [firstName, setFirstName] = useState(teacher.firstName);
  const [lastName, setLastName] = useState(teacher.lastName);
  const [branch, setBranch] = useState(teacher.branch);
  const [confirming, setConfirming] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onSave({
      id: teacher.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      branch: branch.trim(),
    });
    onClose();
  }

  return (
    <Dialog title="Öğretmeni düzenle" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <TeacherFields
          firstName={firstName}
          lastName={lastName}
          branch={branch}
          onFirstName={setFirstName}
          onLastName={setLastName}
          onBranch={setBranch}
        />
        {confirming ? (
          <div className="dialog-actions">
            <p className="confirm-note">Öğretmen ve nöbet atamaları silinecek.</p>
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

export function TeachersPage() {
  const { school, updateSchool } = useGita();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);

  if (!school) return <EmptySchool />;

  function writeDuty(teacherId: string, day: Weekday, placeId: string) {
    updateSchool((current) => setTeacherDuty(current, teacherId, day, placeId));
  }

  return (
    <div className="workspace">
      <header className="workspace-bar">
        <h1 className="workspace-title">Öğretmenler</h1>
        <button className="btn primary" type="button" onClick={() => setAdding(true)}>
          Ekle
        </button>
      </header>
      <div className="workspace-body">
        {school.teachers.length === 0 ? (
          <p className="workspace-empty">Henüz öğretmen yok.</p>
        ) : (
          <div className="data-sheet sheet-teachers" role="table">
            <div className="sheet-head" role="row">
              <span className="sheet-cell" role="columnheader">
                Öğretmen
              </span>
              <span className="sheet-cell" role="columnheader">
                Branş
              </span>
              <span className="sheet-cell" role="columnheader">
                Yer
              </span>
              <span className="sheet-cell" role="columnheader">
                Gün
              </span>
              <span className="sheet-cell sheet-actions" role="columnheader">
                <span className="sr-only">İşlem</span>
              </span>
            </div>
            {school.teachers.map((teacher) => {
              const duty = teacherDuty(school, teacher.id);
              const name = teacherName(teacher);
              return (
                <div className="sheet-row" role="row" key={teacher.id}>
                  <span className="sheet-cell sheet-name" role="cell">
                    {name}
                  </span>
                  <span className={teacher.branch ? "sheet-cell" : "sheet-cell sheet-muted"} role="cell" data-label="Branş">
                    {teacher.branch || "Branş yok"}
                  </span>
                  <span className="sheet-cell" role="cell" data-label="Yer">
                    <select
                      aria-label={`${name} yeri`}
                      value={duty?.placeId ?? ""}
                      disabled={school.places.length === 0}
                      onChange={(event) => {
                        const placeId = event.target.value;
                        const day = duty?.day ?? school.days[0];
                        if (!day || !placeId) return;
                        writeDuty(teacher.id, day, placeId);
                      }}
                    >
                      {duty ? null : <option value="">Seçilmedi</option>}
                      {school.places.map((place) => (
                        <option key={place.id} value={place.id}>
                          {place.name}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span className="sheet-cell" role="cell" data-label="Gün">
                    <select
                      aria-label={`${name} günü`}
                      value={duty?.day ?? ""}
                      disabled={school.places.length === 0}
                      onChange={(event) => {
                        const day = event.target.value as Weekday;
                        if (!school.days.includes(day)) return;
                        const placeId = duty?.placeId ?? school.places[0]?.id;
                        if (!placeId) return;
                        writeDuty(teacher.id, day, placeId);
                      }}
                    >
                      {duty ? null : <option value="">Seçilmedi</option>}
                      {school.days.map((day) => (
                        <option key={day} value={day}>
                          {DAY_LABELS[day]}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span className="sheet-cell sheet-actions" role="cell">
                    <button className="btn" type="button" onClick={() => setEditing(teacher)}>
                      Düzenle
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {adding ? (
        <AddTeacherDialog
          onClose={() => setAdding(false)}
          onCreate={(teacher) => {
            updateSchool((current) => {
              const next = addTeacher(current, teacher);
              const slot = firstOpenDuty(next);
              if (!slot) return next;
              return setTeacherDuty(next, teacher.id, slot.day, slot.placeId);
            });
          }}
        />
      ) : null}
      {editing ? (
        <EditTeacherDialog
          key={editing.id}
          teacher={editing}
          onClose={() => setEditing(null)}
          onSave={(teacher) => updateSchool((current) => updateTeacher(current, teacher))}
          onDelete={() => {
            const id = editing.id;
            updateSchool((current) => removeTeacher(current, id));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
