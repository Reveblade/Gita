import {
  buildScheduleGrid,
  formatWeekRange,
  weekBounds,
  type School,
} from "@gita/domain";
import { createPortal } from "react-dom";

function PrintBlock({ school, weekIndex }: { school: School; weekIndex: number }) {
  const bounds = weekBounds(school, weekIndex);
  const grid = buildScheduleGrid(school, weekIndex, formatWeekRange(bounds.start, bounds.end));
  return (
    <section className="print-block">
      <h2 className="print-school">{school.name}</h2>
      <p className="print-meta">
        {grid.title} · {grid.rangeLabel}
      </p>
      <table className="print-table">
        <thead>
          <tr>
            <th>Gün</th>
            {grid.placeNames.map((name) => (
              <th key={name}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.day}>
              <th>{row.dayLabel}</th>
              {row.cells.map((cell, index) => (
                <td key={`${row.day}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function PrintPreview({
  school,
  weeks,
  onClose,
}: {
  school: School;
  weeks: number[];
  onClose: () => void;
}) {
  const portrait = weeks.length > 1;
  return createPortal(
    <div className="print-preview" data-print-mode={portrait ? "portrait" : "landscape"}>
      <div className="print-toolbar">
        <strong>Baskı önizleme</strong>
        <span>{portrait ? "2 hafta, dikey" : "1 hafta, yatay"}</span>
        <button type="button" className="btn primary" onClick={() => window.print()}>
          Yazdır
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Kapat
        </button>
      </div>
      <article className={portrait ? "sheet portrait" : "sheet landscape"} data-weeks={weeks.length}>
        {weeks.map((weekIndex) => (
          <PrintBlock key={weekIndex} school={school} weekIndex={weekIndex} />
        ))}
      </article>
    </div>,
    document.body,
  );
}
