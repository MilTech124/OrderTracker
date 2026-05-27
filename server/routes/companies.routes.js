const express = require('express');
const Company = require('../models/Company');
const User = require('../models/User');
const Order = require('../models/Order');
const { authRequired, requireMinRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireMinRole('superadmin'));

// GET /api/companies – lista firm z liczbą userów i zamówień
router.get('/', async (req, res, next) => {
  try {
    const companies = await Company.find({}).sort({ name: 1 });
    const ids = companies.map((c) => c._id);

    const [userCounts, orderCounts] = await Promise.all([
      User.aggregate([
        { $match: { companyId: { $in: ids } } },
        { $group: { _id: '$companyId', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { companyId: { $in: ids } } },
        { $group: { _id: '$companyId', count: { $sum: 1 } } },
      ]),
    ]);

    const uMap = Object.fromEntries(userCounts.map((r) => [r._id.toString(), r.count]));
    const oMap = Object.fromEntries(orderCounts.map((r) => [r._id.toString(), r.count]));

    res.json(companies.map((c) => ({
      id: c._id,
      name: c.name,
      createdAt: c.createdAt,
      userCount: uMap[c._id.toString()] || 0,
      orderCount: oMap[c._id.toString()] || 0,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/companies
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nazwa firmy jest wymagana' });
    const company = await Company.create({ name: name.trim() });
    res.status(201).json({ id: company._id, name: company.name, createdAt: company.createdAt, userCount: 0, orderCount: 0 });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Firma o tej nazwie już istnieje' });
    next(err);
  }
});

// PUT /api/companies/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nazwa firmy jest wymagana' });
    const company = await Company.findByIdAndUpdate(req.params.id, { name: name.trim() }, { new: true });
    if (!company) return res.status(404).json({ error: 'Nie znaleziono firmy' });
    res.json({ id: company._id, name: company.name, createdAt: company.createdAt });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Firma o tej nazwie już istnieje' });
    next(err);
  }
});

// DELETE /api/companies/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ error: 'Nie znaleziono firmy' });
    // Usuń powiązania userów i zamówień
    await User.updateMany({ companyId: req.params.id }, { companyId: null });
    await Order.updateMany({ companyId: req.params.id }, { companyId: null });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
