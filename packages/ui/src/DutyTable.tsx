import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { DotsSixVertical } from "@phosphor-icons/react";
import { useLayoutEffect, useRef, useState } from "react";
import {
  DAY_LABELS,
  reorderPlaces,
  swapDisplayedCells,
  teacherIdAt,
  teacherName,
  type School,
  type Weekday,
} from "@gita/domain";

const collision: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  const prefix = activeId.startsWith("place:") ? "place:" : "cell:";
  const filtered = {
    ...args,
    droppableContainers: args.droppableContainers.filter((container) => String(container.id).startsWith(prefix)),
  };
  return prefix === "place:" ? closestCenter(filtered) : pointerWithin(filtered);
};

type Session =
  | { kind: "place"; id: string }
  | { kind: "cell"; day: Weekday; teacherId: string; weekIndex: number };

function pointerOf(event: { activatorEvent: Event; delta: { x: number; y: number } }): { x: number; y: number } | null {
  const start = event.activatorEvent;
  if (!(start instanceof MouseEvent)) return null;
  return { x: start.clientX + event.delta.x, y: start.clientY + event.delta.y };
}

function targetAt(x: number, y: number, attr: "data-place-id" | "data-cell-id"): string | null {
  for (const node of document.elementsFromPoint(x, y)) {
    if (!(node instanceof Element)) continue;
    const host = node.closest<HTMLElement>(`[${attr}]`);
    const value = host?.getAttribute(attr);
    if (value) return value;
  }
  return null;
}

function relocate(school: School, session: Session, x: number, y: number): School {
  if (session.kind === "place") {
    const overId = targetAt(x, y, "data-place-id");
    if (!overId || overId === session.id) return school;
    const ids = school.places.map((place) => place.id);
    const oldIndex = ids.indexOf(session.id);
    const newIndex = ids.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return school;
    return reorderPlaces(school, arrayMove(ids, oldIndex, newIndex));
  }
  const hit = targetAt(x, y, "data-cell-id");
  const match = hit ? /^(\w+):(\d+)$/.exec(hit) : null;
  if (!match || match[1] !== session.day) return school;
  const toIndex = Number(match[2]);
  const fromIndex = school.places.findIndex(
    (_, index) => teacherIdAt(school, session.weekIndex, session.day, index) === session.teacherId,
  );
  if (fromIndex < 0 || fromIndex === toIndex) return school;
  return swapDisplayedCells(school, session.weekIndex, session.day, fromIndex, toIndex);
}

function relocateById(school: School, session: Session, overId: string): School {
  if (session.kind === "place" && overId.startsWith("place:")) {
    const target = overId.slice("place:".length);
    if (target === session.id) return school;
    const ids = school.places.map((place) => place.id);
    const oldIndex = ids.indexOf(session.id);
    const newIndex = ids.indexOf(target);
    if (oldIndex < 0 || newIndex < 0) return school;
    return reorderPlaces(school, arrayMove(ids, oldIndex, newIndex));
  }
  const match = /^cell:(\w+):(\d+)$/.exec(overId);
  if (!match || session.kind !== "cell" || match[1] !== session.day) return school;
  const toIndex = Number(match[2]);
  const fromIndex = school.places.findIndex(
    (_, index) => teacherIdAt(school, session.weekIndex, session.day, index) === session.teacherId,
  );
  if (fromIndex < 0 || fromIndex === toIndex) return school;
  return swapDisplayedCells(school, session.weekIndex, session.day, fromIndex, toIndex);
}

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

function PlaceHeader({ id, name, moving }: { id: string; name: string; moving: boolean }) {
  const drag = useDraggable({ id: `place:${id}` });
  const drop = useDroppable({ id: `place:${id}` });
  return (
    <th
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      className={moving ? "place-head moving" : "place-head"}
      data-place-id={id}
      {...drag.attributes}
      {...drag.listeners}
    >
      <span className="place-head-label">
        <DotsSixVertical size={14} />
        {name}
      </span>
    </th>
  );
}

function DutyCell({
  school,
  weekIndex,
  day,
  placeIndex,
  placeId,
  held,
  moving,
}: {
  school: School;
  weekIndex: number;
  day: Weekday;
  placeIndex: number;
  placeId: string;
  held: boolean;
  moving: boolean;
}) {
  const teacherId = teacherIdAt(school, weekIndex, day, placeIndex);
  const teacher = school.teachers.find((item) => item.id === teacherId);
  const label = teacher ? teacherName(teacher) : "—";
  const id = `cell:${day}:${placeIndex}`;
  const drag = useDraggable({ id, disabled: !teacherId });
  const drop = useDroppable({ id });
  const className = [
    "duty-cell",
    teacherId ? "" : "empty",
    drop.isOver ? "over" : "",
    held ? "held" : "",
    moving ? "moving" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <td
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      className={className}
      data-place-id={placeId}
      data-cell-id={`${day}:${placeIndex}`}
      {...(teacherId ? { ...drag.attributes, ...drag.listeners } : {})}
    >
      <span className="cell-label">{label}</span>
    </td>
  );
}

export function DutyTable({
  school,
  weekIndex,
  onChange,
}: {
  school: School;
  weekIndex: number;
  onChange: (school: School) => void;
}) {
  const [draft, setDraft] = useState<School | null>(null);
  const [active, setActive] = useState<Session | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const originRef = useRef(school);
  const draftRef = useRef<School | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const layoutReady = useRef(true);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const view = draft ?? school;

  function flush() {
    const point = pending.current;
    const session = sessionRef.current;
    const origin = originRef.current;
    if (!point || !session) return;
    const base = draftRef.current ?? origin;
    const next = relocate(base, session, point.x, point.y);
    if (next === base) return;
    layoutReady.current = false;
    draftRef.current = next;
    setDraft(next);
  }

  useLayoutEffect(() => {
    layoutReady.current = true;
    if (sessionRef.current && pending.current) flush();
  });

  function begin(session: Session, label: string | null) {
    originRef.current = school;
    draftRef.current = null;
    pending.current = null;
    layoutReady.current = true;
    sessionRef.current = session;
    setDraft(null);
    setActive(session);
    setActiveLabel(label);
  }

  function finish(next: School | null) {
    sessionRef.current = null;
    pending.current = null;
    draftRef.current = null;
    setDraft(null);
    setActive(null);
    setActiveLabel(null);
    if (next && next !== originRef.current) onChange(next);
  }

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith("place:")) {
      const placeId = id.slice("place:".length);
      const place = school.places.find((item) => item.id === placeId);
      begin({ kind: "place", id: placeId }, place?.name ?? null);
      return;
    }
    const match = /^cell:(\w+):(\d+)$/.exec(id);
    if (!match) return;
    const day = match[1] as Weekday;
    const placeIndex = Number(match[2]);
    const teacherId = teacherIdAt(school, weekIndex, day, placeIndex);
    if (!teacherId) return;
    const teacher = school.teachers.find((item) => item.id === teacherId);
    begin({ kind: "cell", day, teacherId, weekIndex }, teacher ? teacherName(teacher) : null);
  }

  function onDragMove(event: DragMoveEvent) {
    const point = pointerOf(event);
    if (!point || !sessionRef.current) return;
    pending.current = point;
    if (!layoutReady.current) return;
    flush();
  }

  function onDragOver(event: DragOverEvent) {
    if (pointerOf(event)) return;
    const session = sessionRef.current;
    const overId = event.over ? String(event.over.id) : null;
    if (!session || !overId) return;
    const base = draftRef.current ?? originRef.current;
    const next = relocateById(base, session, overId);
    if (next === base) return;
    draftRef.current = next;
    setDraft(next);
  }

  function onDragEnd(event: DragEndEvent) {
    const session = sessionRef.current;
    let next = draftRef.current ?? originRef.current;
    if (session) {
      const point = pointerOf(event);
      if (point) next = relocate(next, session, point.x, point.y);
      else if (event.over) next = relocateById(next, session, String(event.over.id));
    }
    finish(next);
  }

  const movingPlace = active?.kind === "place" ? active.id : null;
  const movingTeacher = active?.kind === "cell" ? active.teacherId : null;
  const movingDay = active?.kind === "cell" ? active.day : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragOver}
      onDragCancel={() => finish(null)}
      onDragEnd={onDragEnd}
    >
      <div className="table-frame">
        <table className="duty-table">
          <thead>
            <tr>
              <th className="day-cell">Gün</th>
              {view.places.map((place) => (
                <PlaceHeader key={place.id} id={place.id} name={place.name} moving={place.id === movingPlace} />
              ))}
            </tr>
          </thead>
          <tbody>
            {view.days.map((day) => (
              <tr key={day}>
                <th className="day-cell" scope="row">
                  <span className="day-sticky">{DAY_LABELS[day]}</span>
                </th>
                {view.places.map((place, placeIndex) => (
                  <DutyCell
                    key={`${day}-${place.id}`}
                    school={view}
                    weekIndex={weekIndex}
                    day={day}
                    placeIndex={placeIndex}
                    placeId={place.id}
                    held={movingDay === day && teacherIdAt(view, weekIndex, day, placeIndex) === movingTeacher}
                    moving={place.id === movingPlace}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DragOverlay style={{ pointerEvents: "none" }}>
        {activeLabel ? <div className="drag-chip">{activeLabel}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
