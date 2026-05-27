const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

function buildScopeFilter(req) {
  if (req.user.role === 'superadmin') return {};
  if (req.user.role === 'admin') {
    return req.user.companyId
      ? { companyId: new mongoose.Types.ObjectId(req.user.companyId) }
      : { companyId: null };
  }
  // user: tylko własne zamówienia
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

// GET /api/orders – user widzi swoje, admin wszystkie (opcjonalny filtr userId, status, date)
router.get('/', async (req, res, next) => {
  try {
    const filter = buildScopeFilter(req);
    if (['admin', 'superadmin'].includes(req.user.role) && req.query.userId) {
      filter.userId = new mongoose.Types.ObjectId(req.query.userId);
    }
    if (req.user.role === 'superadmin' && req.query.companyId) {
      filter.companyId = new mongoose.Types.ObjectId(req.query.companyId);
    }
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
    const orders = await Order.find(filter).sort({ deliveryDate: 1, createdAt: -1 });
    res.json(orders.map(serializeOrder));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, ...buildScopeFilter(req) });
    if (!order) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, firstName, lastName, phone, postalCode, city, address, country, deliveryDate, details, lat, lng, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Tytuł jest wymagany' });

    const hasCoords = typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng);
    const doc = {
      userId: req.user.id,
      companyId: req.user.companyId || null,
      title,
      firstName,
      lastName,
      phone,
      postalCode,
      city,
      address,
      country: country || 'pl',
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      details,
      status: status || 'nowe',
      ...(hasCoords ? { location: { type: 'Point', coordinates: [lng, lat] } } : {}),
    };
    const order = await Order.create(doc);
    res.status(201).json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...buildScopeFilter(req) };
    const order = await Order.findOne(filter);
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
      order.location = undefined; // wyczyść lokalizację
    }
    await order.save();
    res.json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['nowe', 'w_trasie', 'dostarczone', 'anulowane'].includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status' });
    }
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, ...buildScopeFilter(req) },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Order.findOneAndDelete({ _id: req.params.id, ...buildScopeFilter(req) });
    if (!result) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
