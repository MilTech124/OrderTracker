const express = require('express');
const User = require('../models/User');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

// Admin: lista wszystkich userów
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users.map((u) => u.toPublicJSON()));
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(user.toPublicJSON());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
