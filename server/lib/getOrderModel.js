const { makeCompanyModelGetter } = require('./companyModel');
const orderSchema = require('../models/orderSchema');
const Order = require('../models/Order');

// Modele zamówień per-firma: kolekcje `orders_<slug>`.
// Dla zamówień bez firmy — domyślny model "orders".
const { getModel, getAllModels, clearCache } = makeCompanyModelGetter('orders', orderSchema, Order);

module.exports = {
  getOrderModel: getModel,
  getAllOrderModels: getAllModels,
  clearModelCache: clearCache,
};
