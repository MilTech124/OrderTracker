import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Gdy user pojawi się w kontekście (po udanym logowaniu) → nawiguj
  useEffect(() => {
    if (user) {
      const from = location.state?.from || (user.role === 'admin' ? '/admin' : '/');
      navigate(from, { replace: true });
    }
  }, [user]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await signIn(email, password);
      // nawigacja obsługiwana przez useEffect powyżej
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Błąd logowania';
      setError(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Logowanie</h1>
        <p className="text-sm text-slate-500 mb-6">Order Tracker</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Hasło</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Logowanie...' : 'Zaloguj'}
          </button>
        </form>
        <p className="text-sm text-slate-600 mt-4 text-center">
          Nie masz konta?{' '}
          <Link to="/register" className="text-brand-600 hover:underline">
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
}
