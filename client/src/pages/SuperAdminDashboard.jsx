import { useEffect, useState } from 'react';
import {
  Building2, Users, Plus, Pencil, Trash2, Check, X,
  ChevronDown, ChevronUp, Loader2, ShieldCheck, User, Shield
} from 'lucide-react';
import { api } from '../lib/api.js';

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', user: 'Użytkownik' };
const ROLE_COLOR = {
  superadmin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  user: 'bg-slate-100 text-slate-700',
};
const ROLE_ICON = { superadmin: <ShieldCheck size={12} />, admin: <Shield size={12} />, user: <User size={12} /> };

const TABS = ['companies', 'users'];

// ── Inline editable field ───────────────────────────────────────────────────
function InlineInput({ value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  function save() {
    if (val.trim() && val.trim() !== value) onSave(val.trim());
    setEditing(false);
  }

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:text-brand-600 flex items-center gap-1 group"
        onClick={() => { setVal(value); setEditing(true); }}
      >
        {value}
        <Pencil size={11} className="opacity-0 group-hover:opacity-50" />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <input
        autoFocus
        className="input py-0.5 px-1.5 text-sm h-7 w-44"
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      />
      <button onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check size={15} /></button>
      <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
    </span>
  );
}

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Firmy ─────────────────────────────────────────────────────────────────
  const [newCompany, setNewCompany] = useState('');
  const [addingCompany, setAddingCompany] = useState(false);

  async function loadCompanies() {
    setLoading(true);
    try { setCompanies((await api.get('/companies')).data); }
    catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }

  async function addCompany() {
    if (!newCompany.trim()) return;
    try {
      const { data } = await api.post('/companies', { name: newCompany.trim() });
      setCompanies([...companies, data]);
      setNewCompany('');
      setAddingCompany(false);
    } catch (e) { setError(e.response?.data?.error || e.message); }
  }

  async function renameCompany(id, name) {
    try {
      const { data } = await api.put(`/companies/${id}`, { name });
      setCompanies(companies.map((c) => c.id === id ? { ...c, name: data.name } : c));
    } catch (e) { setError(e.response?.data?.error || e.message); }
  }

  async function deleteCompany(c) {
    if (!confirm(`Usunąć firmę „${c.name}"?\n\nUżytkownicy i zamówienia tej firmy zostaną odłączone (nie usunięte).`)) return;
    try {
      await api.delete(`/companies/${c.id}`);
      setCompanies(companies.filter((x) => x.id !== c.id));
      loadUsers(); // odśwież userów (companyName może się zmienić)
    } catch (e) { setError(e.response?.data?.error || e.message); }
  }

  // ── Użytkownicy ───────────────────────────────────────────────────────────
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'user', companyId: '' });
  const [editUserId, setEditUserId] = useState(null);
  const [editUser, setEditUser] = useState({});
  const [savingUser, setSavingUser] = useState(false);

  async function loadUsers() {
    try { setUsers((await api.get('/users')).data); }
    catch (e) { setError(e.response?.data?.error || e.message); }
  }

  async function addUser() {
    setSavingUser(true);
    try {
      const { data } = await api.post('/users', { ...newUser, companyId: newUser.companyId || null });
      setUsers([data, ...users]);
      setNewUser({ email: '', password: '', fullName: '', role: 'user', companyId: '' });
      setShowAddUser(false);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSavingUser(false); }
  }

  function startEditUser(u) {
    setEditUserId(u.id);
    setEditUser({ fullName: u.fullName, role: u.role, companyId: u.companyId || '' });
  }

  async function saveEditUser(id) {
    setSavingUser(true);
    try {
      const { data } = await api.put(`/users/${id}`, {
        fullName: editUser.fullName,
        role: editUser.role,
        companyId: editUser.companyId || null,
        ...(editUser.password ? { password: editUser.password } : {}),
      });
      setUsers(users.map((u) => u.id === id ? { ...data, companyName: companies.find((c) => c.id === data.companyId)?.name || null } : u));
      setEditUserId(null);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSavingUser(false); }
  }

  async function deleteUser(u) {
    if (!confirm(`Usunąć użytkownika „${u.fullName || u.email}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setUsers(users.filter((x) => x.id !== u.id));
    } catch (e) { setError(e.response?.data?.error || e.message); }
  }

  useEffect(() => {
    loadCompanies();
    loadUsers();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck size={28} className="text-purple-600" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Panel Super Admina</h1>
          <p className="text-sm text-slate-500">Zarządzaj firmami i użytkownikami</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={15} /></button>
        </div>
      )}

      {/* Statystyki */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Firm', value: companies.length, icon: <Building2 size={20} className="text-brand-600" /> },
          { label: 'Użytkowników', value: users.length, icon: <Users size={20} className="text-brand-600" /> },
          { label: 'Zamówień', value: companies.reduce((s, c) => s + (c.orderCount || 0), 0), icon: <ShieldCheck size={20} className="text-brand-600" /> },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-slate-200">
        <button
          onClick={() => setTab('companies')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${tab === 'companies' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
        >
          <Building2 size={15} /> Firmy ({companies.length})
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${tab === 'users' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
        >
          <Users size={15} /> Użytkownicy ({users.length})
        </button>
      </div>

      {/* ── FIRMY ── */}
      {tab === 'companies' && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Firmy</h2>
            <button onClick={() => setAddingCompany((v) => !v)} className="btn btn-primary text-sm py-2">
              <Plus size={15} /> Dodaj firmę
            </button>
          </div>

          {addingCompany && (
            <div className="flex gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                autoFocus
                className="input flex-1"
                placeholder="Nazwa firmy"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCompany(); if (e.key === 'Escape') setAddingCompany(false); }}
              />
              <button onClick={addCompany} className="btn btn-primary">Dodaj</button>
              <button onClick={() => setAddingCompany(false)} className="btn btn-secondary"><X size={15} /></button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500 text-center py-4">Ładowanie…</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Brak firm. Dodaj pierwszą.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <Building2 size={18} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <InlineInput value={c.name} placeholder="Nazwa firmy" onSave={(name) => renameCompany(c.id, name)} />
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.userCount} użytkownik{c.userCount === 1 ? '' : c.userCount < 5 ? 'ów'.slice(0,-1)+'i' : 'ów'} · {c.orderCount} zamówień
                    </p>
                  </div>
                  <button
                    onClick={() => deleteCompany(c)}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── UŻYTKOWNICY ── */}
      {tab === 'users' && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Użytkownicy</h2>
            <button onClick={() => setShowAddUser((v) => !v)} className="btn btn-primary text-sm py-2">
              <Plus size={15} /> Dodaj użytkownika
            </button>
          </div>

          {/* Formularz dodawania */}
          {showAddUser && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <h3 className="text-sm font-semibold">Nowy użytkownik</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Hasło * (min. 6 znaków)</label>
                  <input className="input" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div>
                  <label className="label">Imię i nazwisko</label>
                  <input className="input" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Rola</label>
                  <select className="input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="user">Użytkownik</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Firma</label>
                  <select className="input" value={newUser.companyId} onChange={(e) => setNewUser({ ...newUser, companyId: e.target.value })}>
                    <option value="">— bez firmy —</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addUser} disabled={savingUser} className="btn btn-primary text-sm">
                  {savingUser && <Loader2 size={14} className="animate-spin" />} Dodaj
                </button>
                <button onClick={() => setShowAddUser(false)} className="btn btn-secondary text-sm"><X size={14} /> Anuluj</button>
              </div>
            </div>
          )}

          {/* Lista użytkowników */}
          {users.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Brak użytkowników.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="py-3 space-y-2">
                  {editUserId === u.id ? (
                    /* Tryb edycji */
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="label">Imię i nazwisko</label>
                          <input className="input" value={editUser.fullName} onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Nowe hasło (opcjonalne)</label>
                          <input className="input" type="password" placeholder="Zostaw puste aby nie zmieniać" value={editUser.password || ''} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Rola</label>
                          <select className="input" value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                            <option value="user">Użytkownik</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Firma</label>
                          <select className="input" value={editUser.companyId} onChange={(e) => setEditUser({ ...editUser, companyId: e.target.value })}>
                            <option value="">— bez firmy —</option>
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEditUser(u.id)} disabled={savingUser} className="btn btn-primary text-sm">
                          {savingUser && <Loader2 size={14} className="animate-spin" />} Zapisz
                        </button>
                        <button onClick={() => setEditUserId(null)} className="btn btn-secondary text-sm"><X size={14} /> Anuluj</button>
                      </div>
                    </div>
                  ) : (
                    /* Tryb podglądu */
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-sm shrink-0">
                        {(u.fullName || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{u.fullName || '—'}</p>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[u.role]}`}>
                            {ROLE_ICON[u.role]} {ROLE_LABEL[u.role]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        <p className="text-xs text-slate-400">
                          {u.companyName ? <span className="text-brand-600">🏢 {u.companyName}</span> : <span className="italic">bez firmy</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEditUser(u)} className="text-slate-400 hover:text-brand-600 p-1.5 rounded hover:bg-slate-100">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteUser(u)} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
