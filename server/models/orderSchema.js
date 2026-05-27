const mongoose = require('mongoose');

// Schema jest wyeksportowana osobno, żeby mogła być używana
// przez wiele dynamicznych modeli (po jednym na każdą firmę).

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true, default: null },
    title: { type: String, required: true, trim: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    country: { type: String, default: 'pl' },
    deliveryDate: { type: Date },
    details: { type: String, default: '' },
    status: {
      type: String,
      enum: ['nowe', 'w_trasie', 'dostarczone', 'anulowane'],
      default: 'nowe',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (v) => !v || (Array.isArray(v) && v.length === 2),
          message: 'location.coordinates musi być [lng, lat]',
        },
      },
    },
  },
  { timestamps: true }
);

orderSchema.index({ location: '2dsphere' });

module.exports = orderSchema;
