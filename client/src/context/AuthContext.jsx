import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

function decodeUser(token) {
  try {
    const p = jwtDecode(token);
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return { id: p.id, email: p.email, role: p.role, companyId: p.companyId || null };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? decodeUser(token) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      const u = decodeUser(token);
      if (u) setUser(u);
      else localStorage.removeItem('token');
    }
  }, []);

  async function signIn(email, password) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setUser(decodeUser(data.token));
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email, password, fullName) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { email, password, fullName });
      localStorage.setItem('token', data.token);
      setUser(decodeUser(data.token));
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth poza AuthProvider');
  return ctx;
}
