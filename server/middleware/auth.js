const jwt = require('jsonwebtoken');

// Hierarchia ról: superadmin > admin > user
const ROLE_LEVEL = { superadmin: 3, admin: 2, user: 1 };

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Brak tokenu' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      role: payload.role,
      email: payload.email,
      companyId: payload.companyId || null,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Nieprawidłowy token' });
  }
}

// Wymaga dokładnie tej roli lub wyższej
function requireMinRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Brak autoryzacji' });
    const userLevel = ROLE_LEVEL[req.user.role] || 0;
    const required = ROLE_LEVEL[role] || 0;
    if (userLevel < required) return res.status(403).json({ error: 'Brak uprawnień' });
    next();
  };
}

// Wymaga dokładnie jednej z podanych ról
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Brak autoryzacji' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Brak uprawnień' });
    next();
  };
}

module.exports = { authRequired, requireRole, requireMinRole };
