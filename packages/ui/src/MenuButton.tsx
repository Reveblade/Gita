import { CaretDown } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { useDismiss } from "./useDismiss";

export type MenuEntry = {
  label: string;
  detail?: string;
  disabled?: boolean;
  onSelect: () => void;
};

export function MenuButton({
  label,
  icon,
  disabled,
  items,
}: {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  items: MenuEntry[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="btn menu-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
        {label}
        <CaretDown size={12} />
      </button>
      {open ? (
        <div className="menu-pop" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="menu-item"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              <span>{item.label}</span>
              {item.detail ? <small>{item.detail}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
