import { Phone } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { CONTACT_ADDRESS, CONTACT_LEAD, CONTACT_PHONE } from "./contact";
import { TitleBar, type WindowControls } from "./TitleBar";

export type ShellNavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

export function AppShell({
  schoolName,
  controls,
  items,
  banner,
  children,
}: {
  schoolName: string | null;
  controls: WindowControls;
  items: ShellNavItem[];
  banner?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <TitleBar schoolName={schoolName} controls={controls} />
      <aside className="sidebar">
        <p className="side-kicker">Nöbet</p>
        <nav className="side-nav" aria-label="Bölümler">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link" end={item.to === "/"}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-contact">
          <button type="button" className="nav-link contact-trigger">
            <Phone size={18} />
            <span>İletişim</span>
          </button>
          <div className="contact-card" role="tooltip">
            <p>{CONTACT_LEAD}</p>
            <p>{CONTACT_ADDRESS}</p>
            <p className="contact-phone">{CONTACT_PHONE}</p>
          </div>
        </div>
      </aside>
      <div className="main-stage">
        {banner ? <p className="banner">{banner}</p> : null}
        <div className="main-fill">{children}</div>
      </div>
    </div>
  );
}
