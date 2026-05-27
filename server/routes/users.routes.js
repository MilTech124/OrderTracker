const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authRequired, requireMinRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// GET /api/users – superadmin: wszyscy; admin: tylko swojej firmy
router.get('/', requireMinRole('admin'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'superadmin'
      ? {}
      : { companyId: req.user.companyId ? new mongoose.Types.ObjectId(req.user.companyId) : null };

    const users = await User.find(filter).sort({ createdAt: -1 }).populate('companyId', 'name');
    res.json(users.map((u) => ({
      ...u.toPublicJSON(),
      companyName: u.companyId?.name || null,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(user.toPublicJSON());
  } catch (err) {
    next(err);
  }
});

// POST /api/users – superadmin tworzy admina/usera; admin tworzy usera dla swojej firmy
router.post('/', requireMinRole('admin'), async (req, res, next) => {
  try {
    const { email, password, fullName, role, companyId } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email i hasło są wymagane' });
    if (password.length < 6) return res.status(400).json({ error: 'Hasło musi mieć min. 6 znaków' });

    // Admin może tworzyć tylko userów w swojej firmie
    let assignedCompanyId = companyId || null;
    let assignedRole = role || 'user';
    if (req.user.role === 'admin') {
      assignedCompanyId = req.user.companyId;
      assignedRole = 'user'; // admin nie może tworzyć adminów
    }
    if (assignedRole === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Tylko superadmin może tworzyć superadminów' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Użytkownik o tym emailu już istnieje' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName: fullName || '',
      role: assignedRole,
      companyId: assignedCompanyId || null,
    });
    res.status(201).json(user.toPublicJSON());
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id – superadmin edytuje wszystko; admin tylko userów w swojej firmie
router.put('/:id', requireMinRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });

    // Admin może edytować tylko userów ze swojej firmy, nie innych adminów
    if (req.user.role === 'admin') {
      const sameCompany = user.companyId?.toString() === req.user.companyId?.toString();
      if (!sameCompany || user.role !== 'user') {
        return res.status(403).json({ error: 'Brak uprawnień' });
      }
    }

    const { fullName, role, companyId, password } = req.body;
    if (fullName !== undefined) user.fullName = fullName;
    if (req.user.role === 'superadmin') {
      if (role !== undefined) user.role = role;
      if (companyId !== undefined) user.companyId = companyId || null;
    }
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Hasło musi mieć min. 6 znaków' });
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json(user.toPublicJSON());
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id – superadmin usuwa każdego; admin tylko userów swojej firmy
router.delete('/:id', requireMinRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
    if (user._id.toString() === req.user.id) return res.status(400).json({ error: 'Nie możesz usunąć własnego konta' });

    if (req.user.role === 'admin') {
      const sameCompany = user.companyId?.toString() === req.user.companyId?.toString();
      if (!sameCompany || user.role !== 'user') return res.status(403).json({ error: 'Brak uprawnień' });
    }

    await user.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
