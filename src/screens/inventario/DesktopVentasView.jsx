import { FiShoppingBag } from 'react-icons/fi';
import '../../css/DesktopVentasView.css';

// ─────────────────────────────────────────────────────────────────────────────
// VISTA DESKTOP · MODO VENTAS
// ─────────────────────────────────────────────────────────────────────────────
export default function DesktopVentasView() {
  return (
    <div className="dvv-wrap">
      <FiShoppingBag size={40} color="var(--c-placeholder, #B0ADA8)" />
      <p className="dvv-title">Módulo de ventas</p>
      <p className="dvv-sub">Esta sección estará disponible próximamente.</p>
    </div>
  );
}
