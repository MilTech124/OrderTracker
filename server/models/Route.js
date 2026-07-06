const mongoose = require('mongoose');
const routeSchema = require('./routeSchema');

// Domyślny model dla tras bez firmy (legacy / fallback)
module.exports = mongoose.model('Route', routeSchema, 'routes');
