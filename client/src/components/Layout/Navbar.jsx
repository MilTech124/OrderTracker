import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Map, Package, Route, Users, Menu, X, ShieldCheck, Settings, ClipboardList } from 'lucide-react';
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

  const activeCls = 'bg-brand-600 text-white shadow-glow';
  const idleCls   = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${isActive ? activeCls : idleCls}`;

  const superadminLinks = (
    <>
      <NavLink to="/superadmin" className={linkClass} onClick={() => setOpen(false)}>
        <ShieldCheck size={16} /> Super Admin
      </NavLink>
      <NavLink to="/admin" end className={linkClass} onClick={() => setOpen(false)}>
        <Package size={16} /> Zamówienia
      </NavLink>
      <NavLink to="/admin/routes" className={linkClass} onClick={() => setOpen(false)}>
        <Route size={16} /> Planowanie tras
      </NavLink>
      <NavLink to="/admin/planned-routes" className={linkClass} onClick={() => setOpen(false)}>
        <ClipboardList size={16} /> Zaplanowane trasy
      </NavLink>
      <NavLink to="/admin/users" className={linkClass} onClick={() => setOpen(false)}>
        <Users size={16} /> Użytkownicy
      </NavLink>
    </>
  );

  const adminLinks = (
    <>
      <NavLink to="/admin" end className={linkClass} onClick={() => setOpen(false)}>
        <Package size={16} /> Zamówienia
      </NavLink>
      <NavLink to="/admin/routes" className={linkClass} onClick={() => setOpen(false)}>
        <Route size={16} /> Planowanie tras
      </NavLink>
      <NavLink to="/admin/planned-routes" className={linkClass} onClick={() => setOpen(false)}>
        <ClipboardList size={16} /> Zaplanowane trasy
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

  const settingsLink = (
    <NavLink to="/settings" className={linkClass} onClick={() => setOpen(false)}>
      <Settings size={16} /> Ustawienia
    </NavLink>
  );

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/70 shadow-soft sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* ── Górna belka ───────────────────────────────── */}
        <div className="flex items-center justify-between h-16 gap-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow transition-transform group-hover:scale-105">
              <Map size={18} />
            </span>
            <span className="font-extrabold text-base bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
              Order Tracker
            </span>
          </Link>

          {/* Desktop: linki nawigacji */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {user.role === 'superadmin' ? superadminLinks : user.role === 'admin' ? adminLinks : userLinks}
            {settingsLink}
          </div>

          {/* Desktop: email + wyloguj */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-500 max-w-[160px] truncate">
              {user.email}
              <span className="ml-1 badge bg-brand-50 text-brand-700 ring-brand-600/20">{user.role}</span>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary text-sm py-1.5">
              <LogOut size={15} /> Wyloguj
            </button>
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors active:scale-95"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* ── Mobile: rozwijane menu ─────────────────────── */}
        {open && (
          <div className="md:hidden pb-3 space-y-1 border-t border-slate-100 pt-2">
            {user.role === 'superadmin' ? superadminLinks : user.role === 'admin' ? adminLinks : userLinks}
            {settingsLink}

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
