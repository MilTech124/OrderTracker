import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY_FORM = { email: '', password: '', fullName: '' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadUsers(); }, []);

  function openAdd() {
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Email i hasło są wymagane');
      return;
    }
    if (form.password.length < 6) {
      setError('Hasło musi mieć min. 6 znaków');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/users', form);
      setUsers((p) => [data, ...p]);
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się dodać użytkownika');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Usunąć użytkownika ${u.email}?`)) return;
    setError('');
    try {
      await api.delete(`/users/${u.id}`);
      setUsers((p) => p.filter((x) => x.id !== u.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Nie udało się usunąć użytkownika');
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {/* Nagłówek */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
            <Users size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Użytkownicy</h1>
            <p className="text-sm text-slate-500">
              {users.length} {users.length === 1 ? 'użytkownik' : users.length < 5 && users.length > 0 ? 'użytkowników' : 'użytkowników'}
            </p>
          </div>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
          <Plus size={16} /> Dodaj użytkownika
        </button>
      </div>

      {error && !showForm && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Formularz dodawania */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Nowy użytkownik</h2>
            <button type="button" onClick={closeForm} className="btn btn-ghost p-1.5 text-slate-400">
              <X size={16} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} autoFocus
                placeholder="jan.kowalski@firma.pl"
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Imię i nazwisko</label>
              <input className="input" value={form.fullName}
                placeholder="Jan Kowalski"
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Hasło *</label>
              <input type="password" className="input" value={form.password}
                placeholder="min. 6 znaków"
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Nowy użytkownik zostanie dodany do Twojej firmy z rolą „user".
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="btn btn-secondary">Anuluj</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Dodaj użytkownika
            </button>
          </div>
        </form>
      )}

      {/* Lista użytkowników */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Imię i nazwisko</th>
              <th className="text-left p-3">Rola</th>
              <th className="text-left p-3">Założone</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-slate-500">Ładowanie...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-slate-500">Brak użytkowników.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-slate-200">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.fullName || '-'}</td>
                  <td className="p-3">
                    <span className={`badge ${u.role === 'admin' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString('pl-PL')}</td>
                  <td className="p-3">
                    {u.role === 'user' && u.id !== me?.id && (
                      <button onClick={() => handleDelete(u)} title="Usuń"
                        className="btn btn-ghost p-1.5 text-slate-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
