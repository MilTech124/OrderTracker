const express = require('express');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { getRouteModel, getAllRouteModels } = require('../lib/getRouteModel');
const { getOrderModel } = require('../lib/getOrderModel');
const { authRequired, requireMinRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireMinRole('admin'));

const ROUTE_STATUSES = ['zaplanowana', 'w_realizacji', 'zakonczona', 'anulowana'];
// Dozwolone przejścia statusów trasy
const ALLOWED_TRANSITIONS = {
  zaplanowana: ['w_realizacji', 'anulowana'],
  w_realizacji: ['zakonczona', 'anulowana'],
  zakonczona: [],
  anulowana: [],
};

function serializeStop(s) {
  return {
    orderId: s.orderId || null,
    title: s.title,
    firstName: s.firstName,
    lastName: s.lastName,
    phone: s.phone,
    address: s.address,
    postalCode: s.postalCode,
    city: s.city,
    country: s.country || 'pl',
    lat: s.lat ?? null,
    lng: s.lng ?? null,
    amount: s.amount ?? null,
    deliveryDate: s.deliveryDate || null,
  };
}

function serializeRoute(r, { vehicleMap = new Map(), driverMap = new Map() } = {}) {
  const obj = r.toObject ? r.toObject() : r;
  const stops = (obj.stops || []).map(serializeStop);
  const vehicle = obj.vehicleId ? vehicleMap.get(obj.vehicleId.toString()) || null : null;
  const driver = obj.driverId ? driverMap.get(obj.driverId.toString()) || null : null;
  return {
    id: obj._id,
    companyId: obj.companyId || null,
    title: obj.title,
    status: obj.status,
    vehicleId: obj.vehicleId || null,
    vehicle: vehicle ? { id: vehicle._id, name: vehicle.name, plate: vehicle.plate } : null,
    driverId: obj.driverId || null,
    driver: driver ? { id: driver._id, fullName: driver.fullName, email: driver.email } : null,
    plannedDate: obj.plannedDate || null,
    stops,
    stopsCount: stops.length,
    totalAmount: stops.reduce((sum, s) => sum + (s.amount || 0), 0),
    createdBy: obj.createdBy || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

// Dociąga pojazdy i kierowców dla listy tras (kolekcje dynamiczne — bez populate)
async function buildLookupMaps(routes) {
  const vehicleIds = [...new Set(routes.map((r) => r.vehicleId?.toString()).filter(Boolean))];
  const driverIds = [...new Set(routes.map((r) => r.driverId?.toString()).filter(Boolean))];
  const [vehicles, drivers] = await Promise.all([
    vehicleIds.length ? Vehicle.find({ _id: { $in: vehicleIds } }).lean() : [],
    driverIds.length ? User.find({ _id: { $in: driverIds } }).lean() : [],
  ]);
  return {
    vehicleMap: new Map(vehicles.map((v) => [v._id.toString(), v])),
    driverMap: new Map(drivers.map((d) => [d._id.toString(), d])),
  };
}

// Snapshot pól zamówienia do przystanku trasy
function orderToStop(order) {
  const [lng, lat] = order.location?.coordinates || [];
  return {
    orderId: order._id,
    title: order.title,
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    address: order.address,
    postalCode: order.postalCode,
    city: order.city,
    country: order.country || 'pl',
    lat: lat ?? null,
    lng: lng ?? null,
    amount: order.amount ?? null,
    deliveryDate: order.deliveryDate || null,
  };
}

// Ładuje zamówienia po id i buduje snapshoty w kolejności z requestu
async function buildStopsSnapshot(companyId, orderIds) {
  const OrderModel = await getOrderModel(companyId);
  const orders = await OrderModel.find({ _id: { $in: orderIds } }).lean();
  const byId = new Map(orders.map((o) => [o._id.toString(), o]));
  return orderIds
    .map((id) => byId.get(id.toString()))
    .filter(Boolean)
    .map(orderToStop);
}

// Znajduje model + trasę po id (superadmin przeszukuje wszystkie kolekcje)
async function findRoute(req) {
  if (req.user.role === 'superadmin') {
    const models = await getAllRouteModels();
    for (const Model of models) {
      const route = await Model.findById(req.params.id);
      if (route) return { Model, route };
    }
    return { Model: null, route: null };
  }
  const Model = await getRouteModel(req.user.companyId);
  const route = await Model.findById(req.params.id);
  return { Model, route };
}

// GET /api/routes
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && ROUTE_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    let routes;
    if (req.user.role === 'superadmin') {
      const models = await getAllRouteModels();
      const results = await Promise.all(
        models.map((M) => M.find(filter).sort({ createdAt: -1 }).lean())
      );
      routes = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      const Model = await getRouteModel(req.user.companyId);
      routes = await Model.find(filter).sort({ createdAt: -1 }).lean();
    }

    const maps = await buildLookupMaps(routes);
    res.json(routes.map((r) => serializeRoute(r, maps)));
  } catch (err) {
    next(err);
  }
});

// GET /api/routes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { route } = await findRoute(req);
    if (!route) return res.status(404).json({ error: 'Nie znaleziono trasy' });
    const maps = await buildLookupMaps([route]);
    res.json(serializeRoute(route, maps));
  } catch (err) {
    next(err);
  }
});

// POST /api/routes — zapis zaplanowanej trasy
router.post('/', async (req, res, next) => {
  try {
    const { title, vehicleId, driverId, plannedDate, stops } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Tytuł trasy jest wymagany' });
    if (!Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({ error: 'Trasa musi zawierać co najmniej jeden przystanek' });
    }

    const stopsSnapshot = await buildStopsSnapshot(req.user.companyId, stops);
    if (stopsSnapshot.length === 0) {
      return res.status(400).json({ error: 'Nie znaleziono zamówień dla podanych przystanków' });
    }

    const Model = await getRouteModel(req.user.companyId);
    const route = await Model.create({
      companyId: req.user.companyId || null,
      title: title.trim(),
      vehicleId: vehicleId || null,
      driverId: driverId || null,
      plannedDate: plannedDate ? new Date(plannedDate) : null,
      status: 'zaplanowana',
      stops: stopsSnapshot,
      createdBy: req.user.id,
    });

    // Zamówienia z trasy przechodzą w status "w trasie"
    const OrderModel = await getOrderModel(req.user.companyId);
    await OrderModel.updateMany(
      { _id: { $in: stopsSnapshot.map((s) => s.orderId) } },
      { status: 'w_trasie' }
    );

    const maps = await buildLookupMaps([route]);
    res.status(201).json(serializeRoute(route, maps));
  } catch (err) {
    next(err);
  }
});

// PUT /api/routes/:id — edycja tytułu/pojazdu/kierowcy/daty/przystanków
router.put('/:id', async (req, res, next) => {
  try {
    const { route } = await findRoute(req);
    if (!route) return res.status(404).json({ error: 'Nie znaleziono trasy' });

    const { title, vehicleId, driverId, plannedDate, stops } = req.body;
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: 'Tytuł trasy jest wymagany' });
      route.title = title.trim();
    }
    if (vehicleId !== undefined) route.vehicleId = vehicleId || null;
    if (driverId !== undefined) route.driverId = driverId || null;
    if (plannedDate !== undefined) route.plannedDate = plannedDate ? new Date(plannedDate) : null;

    if (stops !== undefined) {
      if (!Array.isArray(stops) || stops.length === 0) {
        return res.status(400).json({ error: 'Trasa musi zawierać co najmniej jeden przystanek' });
      }
      const prevIds = new Set(route.stops.map((s) => s.orderId?.toString()).filter(Boolean));
      const snapshot = await buildStopsSnapshot(route.companyId, stops);
      route.stops = snapshot;

      // Nowo dodane zamówienia → w_trasie (usunięte bez zmian)
      const addedIds = snapshot
        .map((s) => s.orderId)
        .filter((id) => id && !prevIds.has(id.toString()));
      if (addedIds.length) {
        const OrderModel = await getOrderModel(route.companyId);
        await OrderModel.updateMany({ _id: { $in: addedIds } }, { status: 'w_trasie' });
      }
    }

    await route.save();
    const maps = await buildLookupMaps([route]);
    res.json(serializeRoute(route, maps));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/routes/:id/status — cykl życia trasy
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!ROUTE_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status trasy' });
    }

    const { route } = await findRoute(req);
    if (!route) return res.status(404).json({ error: 'Nie znaleziono trasy' });

    if (!ALLOWED_TRANSITIONS[route.status].includes(status)) {
      return res.status(400).json({
        error: `Nie można zmienić statusu z "${route.status}" na "${status}"`,
      });
    }

    route.status = status;
    await route.save();

    // Zakończenie trasy → zamówienia dostarczone (anulowanie nie zmienia statusów)
    if (status === 'zakonczona') {
      const orderIds = route.stops.map((s) => s.orderId).filter(Boolean);
      if (orderIds.length) {
        const OrderModel = await getOrderModel(route.companyId);
        await OrderModel.updateMany({ _id: { $in: orderIds } }, { status: 'dostarczone' });
      }
    }

    const maps = await buildLookupMaps([route]);
    res.json(serializeRoute(route, maps));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/routes/:id — usuwa tylko trasę, statusy zamówień bez zmian
router.delete('/:id', async (req, res, next) => {
  try {
    const { route } = await findRoute(req);
    if (!route) return res.status(404).json({ error: 'Nie znaleziono trasy' });
    await route.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
