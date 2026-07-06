const mongoose = require('mongoose');

// Schema wyeksportowana osobno — używana przez dynamiczne modele per-firma
// (kolekcje routes_<slug>), analogicznie do orderSchema.

const stopSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    title: { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: 'pl' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    amount: { type: Number, default: null },
    deliveryDate: { type: Date, default: null },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true, default: null },
    title: { type: String, required: true, trim: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['zaplanowana', 'w_realizacji', 'zakonczona', 'anulowana'],
      default: 'zaplanowana',
    },
    plannedDate: { type: Date, default: null },
    // Snapshoty przystanków — trasa przeżywa edycje/usunięcia zamówień
    stops: { type: [stopSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = routeSchema;
