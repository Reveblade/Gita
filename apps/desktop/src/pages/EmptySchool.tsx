import { Link } from "react-router-dom";

export function EmptySchool() {
  return (
    <div className="empty-state">
      <h1 className="page-title">Okul profili yok</h1>
      <Link className="btn primary" to="/ayarlar?ekle=1">
        Okul ekle
      </Link>
    </div>
  );
}
