const express = require('express');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const { getRouteModel } = require('../lib/getRouteModel');
const { authRequired, requireMinRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireMinRole('admin'));

function serializeVehicle(v) {
  return {
    id: v._id,
    companyId: v.companyId || null,
    name: v.name,
    plate: v.plate,
    capacity: v.capacity || '',
    notes: v.notes || '',
    createdAt: v.createdAt,
  };
}

// Filtr zakresu — admin widzi tylko pojazdy swojej firmy
function scopeFilter(req) {
  if (req.user.role === 'superadmin') {
    return req.query.companyId
      ? { companyId: new mongoose.Types.ObjectId(req.query.companyId) }
      : {};
  }
  return { companyId: req.user.companyId ? new mongoose.Types.ObjectId(req.user.companyId) : null };
}

// GET /api/vehicles
router.get('/', async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find(scopeFilter(req)).sort({ name: 1 });
    res.json(vehicles.map(serializeVehicle));
  } catch (err) {
    next(err);
  }
});

// POST /api/vehicles
router.post('/', async (req, res, next) => {
  try {
    const { name, plate, capacity, notes } = req.body;
    if (!name?.trim() || !plate?.trim()) {
      return res.status(400).json({ error: 'Nazwa i numer rejestracyjny są wymagane' });
    }
    const vehicle = await Vehicle.create({
      companyId: req.user.companyId || null,
      name: name.trim(),
      plate: plate.trim(),
      capacity: capacity || '',
      notes: notes || '',
    });
    res.status(201).json(serializeVehicle(vehicle));
  } catch (err) {
    next(err);
  }
});

// PUT /api/vehicles/:id
router.put('/:id', async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, ...scopeFilter(req) });
    if (!vehicle) return res.status(404).json({ error: 'Nie znaleziono pojazdu' });

    const { name, plate, capacity, notes } = req.body;
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Nazwa jest wymagana' });
      vehicle.name = name.trim();
    }
    if (plate !== undefined) {
      if (!plate.trim()) return res.status(400).json({ error: 'Numer rejestracyjny jest wymagany' });
      vehicle.plate = plate.trim();
    }
    if (capacity !== undefined) vehicle.capacity = capacity;
    if (notes !== undefined) vehicle.notes = notes;

    await vehicle.save();
    res.json(serializeVehicle(vehicle));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, ...scopeFilter(req) });
    if (!vehicle) return res.status(404).json({ error: 'Nie znaleziono pojazdu' });

    // Blokuj usunięcie, gdy pojazd jest na aktywnej trasie
    const RouteModel = await getRouteModel(vehicle.companyId);
    const activeRoute = await RouteModel.exists({
      vehicleId: vehicle._id,
      status: { $in: ['zaplanowana', 'w_realizacji'] },
    });
    if (activeRoute) {
      return res.status(409).json({ error: 'Pojazd jest przypisany do aktywnej trasy' });
    }

    await vehicle.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
