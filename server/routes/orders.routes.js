const express = require('express');
const mongoose = require('mongoose');
const { getOrderModel, getAllOrderModels } = require('../lib/getOrderModel');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// Filtr zakresu — dla admina/usera ogranicza do ich firmy/konta
function buildScopeFilter(req) {
  if (req.user.role === 'superadmin') return {};
  if (req.user.role === 'admin') return {}; // kolekcja już jest firmowa
  return { userId: new mongoose.Types.ObjectId(req.user.id) };
}

function serializeOrder(o) {
  const obj = o.toObject ? o.toObject() : o;
  const [lng, lat] = obj.location?.coordinates || [];
  return {
    id: obj._id,
    userId: obj.userId,
    companyId: obj.companyId || null,
    title: obj.title,
    firstName: obj.firstName,
    lastName: obj.lastName,
    phone: obj.phone,
    postalCode: obj.postalCode,
    city: obj.city,
    address: obj.address,
    country: obj.country || 'pl',
    deliveryDate: obj.deliveryDate,
    details: obj.details,
    status: obj.status,
    lat: lat ?? null,
    lng: lng ?? null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

// Buduje filtr zapytania na podstawie query params
function buildQueryFilter(req, baseFilter = {}) {
  const filter = { ...baseFilter };
  if (req.query.userId) filter.userId = new mongoose.Types.ObjectId(req.query.userId);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.city) filter.city = { $regex: req.query.city, $options: 'i' };
  if (req.query.name) {
    const rx = { $regex: req.query.name, $options: 'i' };
    filter.$or = [{ firstName: rx }, { lastName: rx }];
  }
  if (req.query.dateFrom || req.query.dateTo) {
    filter.deliveryDate = {};
    if (req.query.dateFrom) filter.deliveryDate.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) {
      const dt = new Date(req.query.dateTo);
      dt.setDate(dt.getDate() + 1);
      filter.deliveryDate.$lt = dt;
    }
  } else if (req.query.date) {
    const d = new Date(req.query.date);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    filter.deliveryDate = { $gte: d, $lt: next };
  }
  return filter;
}

// GET /api/orders
router.get('/', async (req, res, next) => {
  try {
    const scopeFilter = buildScopeFilter(req);
    const filter = buildQueryFilter(req, scopeFilter);

    let orders;

    if (req.user.role === 'superadmin') {
      // Zapytaj wszystkie kolekcje firm
      const models = await getAllOrderModels();
      // Filtr po konkretnej firmie jeśli podano companyId
      let companyModels = models;
      if (req.query.companyId) {
        const Model = await getOrderModel(req.query.companyId);
        companyModels = [Model];
      }
      const results = await Promise.all(
        companyModels.map((M) => M.find(filter).sort({ deliveryDate: 1, createdAt: -1 }).lean())
      );
      orders = results.flat().sort((a, b) => {
        const da = a.deliveryDate ? new Date(a.deliveryDate) : new Date(8640000000000000);
        const db2 = b.deliveryDate ? new Date(b.deliveryDate) : new Date(8640000000000000);
        return da - db2;
      });
    } else {
      const Model = await getOrderModel(req.user.companyId);
      orders = await Model.find(filter).sort({ deliveryDate: 1, createdAt: -1 });
    }

    res.json(orders.map(serializeOrder));
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const Model = req.user.role === 'superadmin'
      ? await findModelForOrderId(req.params.id)
      : await getOrderModel(req.user.companyId);

    const scopeFilter = buildScopeFilter(req);
    const order = await Model.findOne({ _id: req.params.id, ...scopeFilter });
    if (!order) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders
router.post('/', async (req, res, next) => {
  try {
    const { title, firstName, lastName, phone, postalCode, city, address, country, deliveryDate, details, lat, lng, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Tytuł jest wymagany' });

    const hasCoords = typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng);
    const doc = {
      userId: req.user.id,
      companyId: req.user.companyId || null,
      title, firstName, lastName, phone, postalCode, city, address,
      country: country || 'pl',
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      details,
      status: status || 'nowe',
      ...(hasCoords ? { location: { type: 'Point', coordinates: [lng, lat] } } : {}),
    };

    const Model = await getOrderModel(req.user.companyId);
    const order = await Model.create(doc);
    res.status(201).json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res, next) => {
  try {
    const Model = await getOrderModel(req.user.companyId);
    const scopeFilter = buildScopeFilter(req);
    const order = await Model.findOne({ _id: req.params.id, ...scopeFilter });
    if (!order) return res.status(404).json({ error: 'Nie znaleziono' });

    const fields = ['title', 'firstName', 'lastName', 'phone', 'postalCode', 'city', 'address', 'country', 'details', 'status'];
    for (const f of fields) if (req.body[f] !== undefined) order[f] = req.body[f];
    if (req.body.deliveryDate !== undefined) {
      order.deliveryDate = req.body.deliveryDate ? new Date(req.body.deliveryDate) : null;
    }
    const { lat: putLat, lng: putLng } = req.body;
    if (typeof putLat === 'number' && typeof putLng === 'number' && isFinite(putLat) && isFinite(putLng)) {
      order.location = { type: 'Point', coordinates: [putLng, putLat] };
    } else if (putLat === null && putLng === null) {
      order.location = undefined;
    }
    await order.save();
    res.json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['nowe', 'w_trasie', 'dostarczone', 'anulowane'].includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status' });
    }
    const Model = await getOrderModel(req.user.companyId);
    const scopeFilter = buildScopeFilter(req);
    const order = await Model.findOneAndUpdate(
      { _id: req.params.id, ...scopeFilter },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const Model = await getOrderModel(req.user.companyId);
    const scopeFilter = buildScopeFilter(req);
    const result = await Model.findOneAndDelete({ _id: req.params.id, ...scopeFilter });
    if (!result) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
