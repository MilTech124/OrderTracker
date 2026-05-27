// Obsługiwane kraje — kody ISO 3166-1 alpha-2 (małe litery dla Nominatim)
export const COUNTRIES = [
  { code: 'pl', name: 'Polska' },
  { code: 'cz', name: 'Czechy' },
  { code: 'sk', name: 'Słowacja' },
  { code: 'hu', name: 'Węgry' },
  { code: 'de', name: 'Niemcy' },
];

export const DEFAULT_COUNTRY = 'pl';

export function countryName(code) {
  return COUNTRIES.find((c) => c.code === code)?.name || code?.toUpperCase() || '';
}
