const mongoose = require('mongoose');

// Zamienia nazwę firmy na bezpieczną nazwę kolekcji MongoDB
// np. "Firma Kowalski Sp. z o.o." → "firma_kowalski_sp_z_o_o"
function companyNameToSlug(name) {
  const diacritics = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n', Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z',
    ü: 'u', ö: 'o', ä: 'a', ß: 'ss',
    á: 'a', é: 'e', í: 'i', ú: 'u',
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

// Generyczna fabryka modeli per-firma (kolekcje `<prefix>_<slug>`).
// fallbackModel — model domyślny dla danych bez firmy (np. legacy "orders").
function makeCompanyModelGetter(prefix, schema, fallbackModel) {
  // Cache: companyId (string) → Mongoose Model
  const modelCache = new Map();

  async function getModel(companyId) {
    if (!companyId) return fallbackModel;

    const key = companyId.toString();
    if (modelCache.has(key)) return modelCache.get(key);

    const Company = require('../models/Company');
    const company = await Company.findById(companyId).lean();
    if (!company) return fallbackModel;

    const slug = companyNameToSlug(company.name);
    const collectionName = `${prefix}_${slug}`;

    let model;
    try {
      model = mongoose.model(collectionName);
    } catch {
      // Model jeszcze nie istnieje — utwórz go
      model = mongoose.model(collectionName, schema, collectionName);
    }

    modelCache.set(key, model);
    return model;
  }

  // Modele dla WSZYSTKICH firm (do zapytań superadmina) + model domyślny.
  async function getAllModels() {
    const Company = require('../models/Company');
    const companies = await Company.find({}).lean();
    const models = await Promise.all(companies.map((c) => getModel(c._id)));
    // Deduplicate (jeśli jakaś firma nie ma kolekcji, zwróciła fallbackModel)
    return [...new Set([...models, fallbackModel])];
  }

  // Usuwa cache dla danej firmy (po zmianie nazwy firmy)
  function clearCache(companyId) {
    if (companyId) modelCache.delete(companyId.toString());
    else modelCache.clear();
  }

  return { getModel, getAllModels, clearCache };
}

module.exports = { companyNameToSlug, makeCompanyModelGetter };
