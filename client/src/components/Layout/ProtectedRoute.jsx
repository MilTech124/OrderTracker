import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLE_LEVEL = { superadmin: 3, admin: 2, user: 1 };

export default function ProtectedRoute({ children, role, minRole }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Dokładna rola
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  // Minimalna rola (hierarchia)
  if (minRole) {
    const userLevel = ROLE_LEVEL[user.role] || 0;
    const required = ROLE_LEVEL[minRole] || 0;
    if (userLevel < required) return <Navigate to="/" replace />;
  }

  return children;
}
