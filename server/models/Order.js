const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
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

module.exports = mongoose.model('Order', orderSchema);
