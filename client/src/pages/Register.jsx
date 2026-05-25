import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { user, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [error, setError] = useState('');

  // Gdy user pojawi się w kontekście (po udanej rejestracji) → nawiguj
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
    }
  }, [user]);

  function update(k) {
    return (e) => setForm({ ...form, [k]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await signUp(form.email, form.password, form.fullName);
      // nawigacja obsługiwana przez useEffect powyżej
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Błąd rejestracji';
      setError(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Rejestracja</h1>
        <p className="text-sm text-slate-500 mb-6">Załóż konto użytkownika</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Imię i nazwisko</label>
            <input
              autoComplete="name"
              value={form.fullName}
              onChange={update('fullName')}
              className="input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              className="input"
            />
          </div>
          <div>
            <label className="label">Hasło (min. 6 znaków)</label>
            <input
              type="password"
              minLength={6}
              required
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              className="input"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center"
          >
            {loading ? 'Tworzenie konta...' : 'Zarejestruj'}
          </button>
        </form>
        <p className="text-sm text-slate-600 mt-4 text-center">
          Masz już konto?{' '}
          <Link to="/login" className="text-brand-600 hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
