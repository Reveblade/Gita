import { Minus, Square, X } from "@phosphor-icons/react";

export type WindowControls = {
  enabled: boolean;
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
};

export function TitleBar({
  schoolName,
  controls,
}: {
  schoolName: string | null;
  controls: WindowControls;
}) {
  return (
    <header className="titlebar">
      <div className="titlebar-drag" data-tauri-drag-region>
        <span className="titlebar-name" data-tauri-drag-region>
          Gita
        </span>
        {schoolName ? (
          <span className="titlebar-school" data-tauri-drag-region>
            {schoolName}
          </span>
        ) : null}
      </div>
      <div className="window-controls">
        <button
          type="button"
          className="window-btn"
          aria-label="Küçült"
          disabled={!controls.enabled}
          onClick={controls.onMinimize}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="window-btn"
          aria-label={controls.maximized ? "Önceki boyuta dön" : "Büyüt"}
          disabled={!controls.enabled}
          onClick={controls.onMaximize}
        >
          <Square size={12} />
        </button>
        <button
          type="button"
          className="window-btn close"
          aria-label="Kapat"
          disabled={!controls.enabled}
          onClick={controls.onClose}
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
}
