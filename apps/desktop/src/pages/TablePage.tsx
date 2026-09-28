import { formatWeekRange, resetToBaseline, weekBounds } from "@gita/domain";
import { DutyTable, MenuButton, WeekPager } from "@gita/ui";
import { Export, Printer } from "@phosphor-icons/react";
import { useState } from "react";
import { fileSlug, saveBytes } from "../persistence";
import { PrintPreview } from "../print/PrintPreview";
import { useGita } from "../store";
import { EmptySchool } from "./EmptySchool";

export function TablePage() {
  const { school, tableWeek, setTableWeek, updateSchool } = useGita();
  const [preview, setPreview] = useState<number[] | null>(null);

  if (!school) return <EmptySchool />;

  const safeWeek = tableWeek;
  const canPair = safeWeek < school.weekCount - 1;
  const ready = school.places.length > 0 && school.days.length > 0;
  const weeks = Array.from({ length: school.weekCount }, (_, index) => {
    const bounds = weekBounds(school, index);
    return { label: `${index + 1}. hafta`, range: formatWeekRange(bounds.start, bounds.end) };
  });

  async function exportExcel(span: 1 | 2) {
    const selected = span === 1 ? [safeWeek] : [safeWeek, safeWeek + 1];
    const { buildWorkbook } = await import("../export/workbook");
    const bytes = await buildWorkbook(school!, selected, span === 1 ? "landscape" : "portrait");
    await saveBytes(`gita-${fileSlug(school!.name)}-${span}-hafta.xlsx`, bytes);
  }

  return (
    <div className="table-page">
      <header className="page-head">
        <h1 className="page-title">Nöbet tablosu</h1>
      </header>
      <div className="toolbar">
        <WeekPager weekIndex={safeWeek} weeks={weeks} onChange={setTableWeek} />
        <div className="toolbar-actions">
          <button
            className="btn"
            type="button"
            onClick={() => {
              updateSchool((current) => resetToBaseline(current));
              setTableWeek(0);
            }}
          >
            Sıfırla
          </button>
          <MenuButton
            label="Yazdır"
            icon={<Printer size={16} />}
            disabled={!ready}
            items={[
              {
                label: "1 hafta",
                onSelect: () => setPreview([safeWeek]),
              },
              {
                label: "2 hafta",
                disabled: !canPair,
                onSelect: () => setPreview([safeWeek, safeWeek + 1]),
              },
            ]}
          />
          <MenuButton
            label="Dışa aktar"
            icon={<Export size={16} />}
            disabled={!ready}
            items={[
              {
                label: "1 hafta Excel",
                onSelect: () => void exportExcel(1),
              },
              {
                label: "2 hafta Excel",
                disabled: !canPair,
                onSelect: () => void exportExcel(2),
              },
            ]}
          />
        </div>
      </div>
      {ready ? (
        <DutyTable school={school} weekIndex={safeWeek} onChange={(next) => updateSchool(() => next)} />
      ) : (
        <div className="empty-state">
          <h2 className="page-title">Tablo için yer ve gün gerekli</h2>
        </div>
      )}
      {preview ? <PrintPreview school={school} weeks={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}
