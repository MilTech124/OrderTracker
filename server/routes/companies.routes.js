const express = require('express');
const mongoose = require('mongoose');
const Company = require('../models/Company');
const User = require('../models/User');
const { getOrderModel, clearModelCache } = require('../lib/getOrderModel');
const { authRequired, requireMinRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireMinRole('superadmin'));

// GET /api/companies – lista firm z liczbą userów i zamówień
router.get('/', async (req, res, next) => {
  try {
    const companies = await Company.find({}).sort({ name: 1 });
    const ids = companies.map((c) => c._id);

    // Liczba userów per firma (z kolekcji users)
    const userCounts = await User.aggregate([
      { $match: { companyId: { $in: ids } } },
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
    ]);
    const uMap = Object.fromEntries(userCounts.map((r) => [r._id.toString(), r.count]));

    // Liczba zamówień per firma — każda firma ma własną kolekcję
    const orderCounts = await Promise.all(
      companies.map(async (c) => {
        const Model = await getOrderModel(c._id);
        const count = await Model.countDocuments({});
        return { id: c._id.toString(), count };
      })
    );
    const oMap = Object.fromEntries(orderCounts.map((r) => [r.id, r.count]));

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
    // Wyczyść cache — nowa nazwa = nowy slug = nowa kolekcja
    clearModelCache(req.params.id);
    res.json({ id: company._id, name: company.name, createdAt: company.createdAt });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Firma o tej nazwie już istnieje' });
    next(err);
  }
});

// DELETE /api/companies/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Nie znaleziono firmy' });

    // Pobierz model przed usunięciem firmy (potrzebujemy nazwy do kolekcji)
    const OrderModel = await getOrderModel(req.params.id);

    await Company.findByIdAndDelete(req.params.id);
    await User.updateMany({ companyId: req.params.id }, { companyId: null });

    // Usuń kolekcję zamówień tej firmy z MongoDB
    try {
      await OrderModel.collection.drop();
    } catch (e) {
      // Kolekcja może nie istnieć — ignoruj błąd
      if (e.codeName !== 'NamespaceNotFound') console.warn('Nie można usunąć kolekcji:', e.message);
    }

    // Wyczyść cache modelu
    clearModelCache(req.params.id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
