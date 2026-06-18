import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Layout/Navbar.jsx';
import ProtectedRoute from './components/Layout/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRoutes from './pages/AdminRoutes.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx';
import Settings from './pages/Settings.jsx';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <UserDashboard />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

          {/* Strona główna — przekierowanie wg roli */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRedirect />
              </ProtectedRoute>
            }
          />

          {/* Super Admin */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute minRole="superadmin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin + Super Admin mogą wejść na /admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute minRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/routes"
            element={
              <ProtectedRoute minRole="admin">
                <AdminRoutes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute minRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* Ustawienia — dostępne dla każdego zalogowanego */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
