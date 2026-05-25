/**
 * Geokodowanie przez Nominatim (OpenStreetMap) z wielopoziomowym fallbackiem.
 *
 * Kolejność prób:
 *  1. Zapytanie strukturalne (street + postalcode + city + countrycodes=pl)
 *  2. Zapytanie strukturalne bez kodu pocztowego
 *  3. Zapytanie strukturalne bez ulicy (samo miasto + kod)
 *  4. Wolne zapytanie (pełny adres jako tekst)
 *  5. Wolne zapytanie samo miasto
 */

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

export async function geocodeAddress({ address, city, postalCode, country = 'Polska' }) {
  const street = address?.trim() || '';
  const cityTrim = city?.trim() || '';
  const postal = postalCode?.trim() || '';

  if (!cityTrim && !street && !postal) {
    throw new Error('Podaj przynajmniej miasto lub adres.');
  }

  const attempts = [];

  // 1. Strukturalne: ulica + kod + miasto
  if (street && (postal || cityTrim)) {
    attempts.push({ street, postalcode: postal, city: cityTrim, countrycodes: 'pl' });
  }

  // 2. Strukturalne: ulica + miasto (bez kodu)
  if (street && cityTrim) {
    attempts.push({ street, city: cityTrim, countrycodes: 'pl' });
  }

  // 3. Strukturalne: samo miasto + kod
  if (cityTrim && postal) {
    attempts.push({ postalcode: postal, city: cityTrim, countrycodes: 'pl' });
  }

  // 4. Strukturalne: samo miasto
  if (cityTrim) {
    attempts.push({ city: cityTrim, countrycodes: 'pl' });
  }

  // 5. Wolne zapytanie: pełny adres
  const freeQuery = [street, postal, cityTrim, country].filter(Boolean).join(', ');
  if (freeQuery.trim()) {
    attempts.push({ q: freeQuery, countrycodes: 'pl' });
  }

  // 6. Wolne zapytanie: samo miasto + kraj (ostatnia szansa)
  if (cityTrim) {
    attempts.push({ q: `${cityTrim}, ${country}` });
  }

  let lastError = 'Nie znaleziono adresu.';

  for (const params of attempts) {
    try {
      // Nominatim wymaga max 1 req/sek – dodajemy krótki delay między próbami
      const data = await nominatimFetch(params);
      const result = parseResult(data);
      if (result) return result;
    } catch (err) {
      lastError = err.message;
    }

    // Przerwa między requestami (polityka Nominatim)
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error(`${lastError} Spróbuj poprawić adres lub wskaż lokalizację na mapie.`);
}
