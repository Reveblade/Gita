import { CaretDown, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useState } from "react";
import { useDismiss } from "./useDismiss";

export type WeekOption = {
  label: string;
  range: string;
};

export function WeekPager({
  weekIndex,
  weeks,
  onChange,
  previousLabel = "Önceki hafta",
  nextLabel = "Sonraki hafta",
  listLabel = "Haftalar",
}: {
  weekIndex: number;
  weeks: WeekOption[];
  onChange: (index: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  listLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const current = weeks[weekIndex];
  if (!current) return null;

  return (
    <div className="week-pager" ref={ref}>
      <button
        type="button"
        className="week-step"
        aria-label={previousLabel}
        disabled={weekIndex <= 0}
        onClick={() => onChange(weekIndex - 1)}
      >
        <CaretLeft size={16} />
      </button>
      <button
        type="button"
        className="week-current"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="week-kicker">{current.label}</span>
        <span className="week-range">{current.range}</span>
        <CaretDown size={12} className="week-caret" />
      </button>
      <button
        type="button"
        className="week-step"
        aria-label={nextLabel}
        disabled={weekIndex >= weeks.length - 1}
        onClick={() => onChange(weekIndex + 1)}
      >
        <CaretRight size={16} />
      </button>
      {open ? (
        <div className="week-menu" role="listbox" aria-label={listLabel}>
          {weeks.map((week, index) => (
            <button
              key={`${index}-${week.label}`}
              type="button"
              role="option"
              aria-selected={index === weekIndex}
              className={index === weekIndex ? "week-option active" : "week-option"}
              onClick={() => {
                onChange(index);
                setOpen(false);
              }}
            >
              <span>{week.label}</span>
              <small>{week.range}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
