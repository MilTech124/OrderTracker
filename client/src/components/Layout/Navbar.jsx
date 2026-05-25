import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Map, Package, Route, Users, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    setOpen(false);
    signOut();
    setTimeout(() => navigate('/login', { replace: true }), 0);
  }

  if (!user) return null;

  const activeCls = 'bg-brand-600 text-white';
  const idleCls   = 'text-slate-700 hover:bg-slate-100';

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? activeCls : idleCls}`;

  const adminLinks = (
    <>
      <NavLink to="/admin" end className={linkClass} onClick={() => setOpen(false)}>
        <Package size={16} /> Zamówienia
      </NavLink>
      <NavLink to="/admin/routes" className={linkClass} onClick={() => setOpen(false)}>
        <Route size={16} /> Trasa
      </NavLink>
      <NavLink to="/admin/users" className={linkClass} onClick={() => setOpen(false)}>
        <Users size={16} /> Użytkownicy
      </NavLink>
    </>
  );

  const userLinks = (
    <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
      <Package size={16} /> Moje zamówienia
    </NavLink>
  );

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* ── Górna belka ───────────────────────────────── */}
        <div className="flex items-center justify-between h-14 gap-3">
          <Link to="/" className="font-bold text-base text-brand-700 flex items-center gap-2 shrink-0">
            <Map size={20} /> Order Tracker
          </Link>

          {/* Desktop: linki nawigacji */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {user.role === 'admin' ? adminLinks : userLinks}
          </div>

          {/* Desktop: email + wyloguj */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-500 max-w-[160px] truncate">
              {user.email}
              <span className="ml-1 badge bg-slate-200 text-slate-600">{user.role}</span>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary text-sm py-1.5">
              <LogOut size={15} /> Wyloguj
            </button>
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* ── Mobile: rozwijane menu ─────────────────────── */}
        {open && (
          <div className="md:hidden pb-3 space-y-1 border-t border-slate-100 pt-2">
            {user.role === 'admin' ? adminLinks : userLinks}

            <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500 truncate max-w-[200px]">
                {user.email}
                <span className="ml-1 badge bg-slate-200 text-slate-600">{user.role}</span>
              </span>
              <button onClick={handleLogout} className="btn btn-secondary text-sm py-1.5">
                <LogOut size={15} /> Wyloguj
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
