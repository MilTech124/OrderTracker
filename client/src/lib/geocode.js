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
 *
 * Zgodność z polityką Nominatim:
 *  - GLOBALNA kolejka: maks. 1 żądanie / ~1,1 s (też pomiędzy adresami w imporcie).
 *  - Ponawianie z odczekaniem przy HTTP 429/503.
 *  - Cache wyników w pamięci — ten sam adres nie jest odpytywany dwa razy.
 */

import { countryName, DEFAULT_COUNTRY } from './countries.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL = 1100; // ms — bezpieczny margines ponad limit 1 req/s

// ── Globalny throttle ───────────────────────────────────────────────────────
// Łańcuch obietnic gwarantuje, że WSZYSTKIE żądania do Nominatim (z formularza
// i z importu) są od siebie oddalone o >= MIN_INTERVAL, niezależnie od tego ile
// miejsc woła geocodeAddress równolegle.
let lastRequestAt = 0;
let queue = Promise.resolve();

function schedule(task) {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return task();
  });
  // utrzymuj łańcuch nawet gdy zadanie rzuci błędem
  queue = run.then(() => {}, () => {});
  return run;
}

// ── Pojedyncze żądanie z ponawianiem ────────────────────────────────────────
async function nominatimFetch(params, { retries = 2 } = {}) {
  const qs = new URLSearchParams({
    format: 'json',
    limit: '1',
    'accept-language': 'pl',
    ...params,
  });

  for (let attempt = 0; ; attempt++) {
    const res = await schedule(() =>
      fetch(`${NOMINATIM}?${qs}`, { headers: { 'Accept-Language': 'pl,en;q=0.9' } })
    );
    if (res.ok) return res.json();

    // Przeciążenie / limit — odczekaj i ponów (backoff: 1,5 s, 3 s, …)
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`Nominatim HTTP ${res.status}`);
  }
}

function parseResult(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

// ── Cache wyników (na czas życia karty) ─────────────────────────────────────
// Wartość: obiekt {lat,lng,displayName} gdy znaleziono, null gdy serwer
// jednoznacznie nic nie zwrócił. Błędów sieci/HTTP NIE cache'ujemy (mogą być
// chwilowe), żeby nie zatruć pamięci wynikiem "nie znaleziono".
const cache = new Map();

export async function geocodeAddress({ address, city, postalCode, country = DEFAULT_COUNTRY }) {
  const street = address?.trim() || '';
  const cityTrim = city?.trim() || '';
  const postal = postalCode?.trim() || '';
  const cc = (country || DEFAULT_COUNTRY).toLowerCase();
  const countryFullName = countryName(cc);

  if (!cityTrim && !street && !postal) {
    throw new Error('Podaj przynajmniej miasto lub adres.');
  }

  const cacheKey = [cc, postal, cityTrim, street].join('|').toLowerCase();
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    throw new Error('Nie znaleziono adresu. Spróbuj poprawić adres lub wskaż lokalizację na mapie.');
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
  let hadError = false;

  for (const params of attempts) {
    try {
      const data = await nominatimFetch(params);
      const result = parseResult(data);
      if (result) {
        cache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      hadError = true;
      lastError = err.message;
    }
    // Odstęp między próbami zapewnia globalny throttle (schedule) — bez ręcznego sleepu.
  }

  // Zapamiętaj "nie znaleziono" tylko gdy serwer realnie odpowiadał (bez błędów sieci).
  if (!hadError) cache.set(cacheKey, null);

  throw new Error(`${lastError} Spróbuj poprawić adres lub wskaż lokalizację na mapie.`);
}
