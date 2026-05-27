const mongoose = require('mongoose');
const orderSchema = require('../models/orderSchema');

// Cache: companyId (string) → Mongoose Model
const modelCache = new Map();

// Zamienia nazwę firmy na bezpieczną nazwę kolekcji MongoDB
// np. "Firma Kowalski Sp. z o.o." → "orders_firma_kowalski_sp_z_o_o"
function companyNameToSlug(name) {
  const diacritics = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n', Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z',
    ü: 'u', ö: 'o', ä: 'a', ß: 'ss',
    á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u',
    č: 'c', š: 's', ž: 'z', ř: 'r',
  };
  return name
    .split('')
    .map((c) => diacritics[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60); // limit długości
}

// Zwraca (lub tworzy) Model Mongoose dla kolekcji orders danej firmy.
// Dla zamówień bez firmy zwraca domyślny model "orders".
async function getOrderModel(companyId) {
  if (!companyId) return require('../models/Order');

  const key = companyId.toString();
  if (modelCache.has(key)) return modelCache.get(key);

  const Company = require('../models/Company');
  const company = await Company.findById(companyId).lean();
  if (!company) return require('../models/Order');

  const slug = companyNameToSlug(company.name);
  const collectionName = `orders_${slug}`;

  let model;
  try {
    model = mongoose.model(collectionName);
  } catch {
    // Model jeszcze nie istnieje — utwórz go
    model = mongoose.model(collectionName, orderSchema, collectionName);
  }

  modelCache.set(key, model);
  return model;
}

// Zwraca modele dla WSZYSTKICH firm (do zapytań superadmina).
// Zawiera też domyślny model "orders" dla danych bez firmy.
async function getAllOrderModels() {
  const Company = require('../models/Company');
  const companies = await Company.find({}).lean();
  const models = await Promise.all(companies.map((c) => getOrderModel(c._id)));
  const defaultModel = require('../models/Order');
  // Deduplicate (jeśli jakaś firma nie ma kolekcji, zwróciła defaultModel)
  return [...new Set([...models, defaultModel])];
}

// Usuwa cache dla danej firmy (po zmianie nazwy firmy)
function clearModelCache(companyId) {
  if (companyId) modelCache.delete(companyId.toString());
  else modelCache.clear();
}

module.exports = { getOrderModel, getAllOrderModels, clearModelCache };
