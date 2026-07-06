const { makeCompanyModelGetter } = require('./companyModel');
const routeSchema = require('../models/routeSchema');
const Route = require('../models/Route');

// Modele tras per-firma: kolekcje `routes_<slug>`.
const { getModel, getAllModels, clearCache } = makeCompanyModelGetter('routes', routeSchema, Route);

module.exports = {
  getRouteModel: getModel,
  getAllRouteModels: getAllModels,
  clearRouteModelCache: clearCache,
};
