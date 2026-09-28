import { Gear, MapPin, Table, Users } from "@phosphor-icons/react";
import { AppShell } from "@gita/ui";
import { Route, Routes } from "react-router-dom";
import { PlacesPage } from "./pages/PlacesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TablePage } from "./pages/TablePage";
import { TeachersPage } from "./pages/TeachersPage";
import { useGita } from "./store";
import { useWindowControls } from "./window";

export function App() {
  const controls = useWindowControls();
  const { ready, error, school } = useGita();
  if (!ready) return <div className="boot">Kayıt açılıyor</div>;

  return (
    <AppShell
      schoolName={school?.name ?? null}
      controls={controls}
      banner={error}
      items={[
        { to: "/", label: "Tablo", icon: <Table size={18} /> },
        { to: "/ogretmenler", label: "Öğretmenler", icon: <Users size={18} /> },
        { to: "/yerler", label: "Nöbet yerleri", icon: <MapPin size={18} /> },
        { to: "/ayarlar", label: "Ayarlar", icon: <Gear size={18} /> },
      ]}
    >
      <Routes>
        <Route path="/" element={<TablePage />} />
        <Route path="/ogretmenler" element={<TeachersPage />} />
        <Route path="/yerler" element={<PlacesPage />} />
        <Route path="/ayarlar" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}
