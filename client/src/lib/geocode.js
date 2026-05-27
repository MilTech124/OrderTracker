/**
 * Geokodowanie przez Nominatim (OpenStreetMap) z wielopoziomowym fallbackiem.
 *
 * Kolejność prób (z parametrem countrycodes=<code>):
 *  1. Strukturalne: street + postalcode + city
 *  2. Strukturalne: street + city (bez kodu)
 *  3. Strukturalne: postalcode + city (bez ulicy)
 *  4. Strukturalne: city
 *  5. Wolne zapytanie: pełny adres + nazwa kraju
 *  6. Wolne zapytanie: samo miasto + nazwa kraju
 */

import { countryName, DEFAULT_COUNTRY } from './countries.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

async function nominatimFetch(params) {
  const qs = new URLSearchParams({
    format: 'json',
    limit: '1',
    'accept-language': 'pl',
    ...params,
  });
  const res = await fetch(`${NOMINATIM}?${qs}`, {
    headers: { 'Accept-Language': 'pl,en;q=0.9' },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  return res.json();
}

function parseResult(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

export async function geocodeAddress({ address, city, postalCode, country = DEFAULT_COUNTRY }) {
  const street = address?.trim() || '';
  const cityTrim = city?.trim() || '';
  const postal = postalCode?.trim() || '';
  const cc = (country || DEFAULT_COUNTRY).toLowerCase();
  const countryFullName = countryName(cc);

  if (!cityTrim && !street && !postal) {
    throw new Error('Podaj przynajmniej miasto lub adres.');
  }

  const attempts = [];

  // 1. Strukturalne: ulica + kod + miasto
  if (street && (postal || cityTrim)) {
    attempts.push({ street, postalcode: postal, city: cityTrim, countrycodes: cc });
  }

  // 2. Strukturalne: ulica + miasto (bez kodu)
  if (street && cityTrim) {
    attempts.push({ street, city: cityTrim, countrycodes: cc });
  }

  // 3. Strukturalne: samo miasto + kod
  if (cityTrim && postal) {
    attempts.push({ postalcode: postal, city: cityTrim, countrycodes: cc });
  }

  // 4. Strukturalne: samo miasto
  if (cityTrim) {
    attempts.push({ city: cityTrim, countrycodes: cc });
  }

  // 5. Wolne zapytanie: pełny adres + kraj
  const freeQuery = [street, postal, cityTrim, countryFullName].filter(Boolean).join(', ');
  if (freeQuery.trim()) {
    attempts.push({ q: freeQuery, countrycodes: cc });
  }

  // 6. Wolne zapytanie: samo miasto + kraj (ostatnia szansa, bez filtra)
  if (cityTrim) {
    attempts.push({ q: `${cityTrim}, ${countryFullName}` });
  }

  let lastError = 'Nie znaleziono adresu.';

  for (const params of attempts) {
    try {
      const data = await nominatimFetch(params);
      const result = parseResult(data);
      if (result) return result;
    } catch (err) {
      lastError = err.message;
    }
    // Przerwa między requestami (polityka Nominatim — max 1 req/sek)
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error(`${lastError} Spróbuj poprawić adres lub wskaż lokalizację na mapie.`);
}
