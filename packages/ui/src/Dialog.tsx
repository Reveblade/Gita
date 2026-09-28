import { X } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let dismiss = false;
    const openTimer = window.setTimeout(() => {
      if (!node.isConnected || node.open) return;
      node.showModal();
      window.setTimeout(() => {
        dismiss = true;
      }, 0);
    }, 0);
    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (!dismiss) return;
      onCloseRef.current();
    };
    node.addEventListener("cancel", handleCancel);
    return () => {
      window.clearTimeout(openTimer);
      node.removeEventListener("cancel", handleCancel);
      if (node.open) node.close();
    };
  }, []);

  return createPortal(
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-card">
        <header className="dialog-head">
          <h2 id="dialog-title" className="page-title">
            {title}
          </h2>
          <button type="button" className="icon-btn" aria-label="Kapat" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
