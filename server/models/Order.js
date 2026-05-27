const mongoose = require('mongoose');
const orderSchema = require('./orderSchema');

// Domyślny model dla zamówień bez firmy (legacy / fallback)
module.exports = mongoose.model('Order', orderSchema, 'orders');
