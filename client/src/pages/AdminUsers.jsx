import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Użytkownicy</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Imię i nazwisko</th>
              <th className="text-left p-3">Rola</th>
              <th className="text-left p-3">Założone</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-slate-500">Ładowanie...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-slate-500">Brak użytkowników.</td></tr>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Aby nadać rolę admina, zmień w MongoDB:{' '}
        <code className="bg-slate-200 px-1 rounded">{`db.users.updateOne({email:'X'}, {$set:{role:'admin'}})`}</code>
      </p>
    </div>
  );
}
