// Buduje URL do Google Maps Directions (bez API klucza).
// Format: https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=a|b|c
// Limit waypointów: ~9 między origin a destination => max ~10 punktów na link.

const MAX_STOPS_PER_LINK = 10;

import { countryName, DEFAULT_COUNTRY } from './countries.js';

export function formatAddress(stop) {
  const country = countryName(stop.country || DEFAULT_COUNTRY);
  const parts = [stop.address, stop.postalCode, stop.city, country].filter(Boolean);
  return parts.join(', ');
}

function buildSingleUrl(stops) {
  if (stops.length === 0) return null;
  if (stops.length === 1) {
    const dest = encodeURIComponent(formatAddress(stops[0]));
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  }
  const origin = encodeURIComponent(formatAddress(stops[0]));
  const destination = encodeURIComponent(formatAddress(stops[stops.length - 1]));
  const waypoints = stops
    .slice(1, -1)
    .map((s) => encodeURIComponent(formatAddress(s)))
    .join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

// Dzieli trasę na etapy (chunki) — każdy do MAX_STOPS_PER_LINK punktów,
// kolejny etap zaczyna się od ostatniego punktu poprzedniego (łańcuch).
// Zwraca: [{ url, stops: [...], from: <numer-przystanku-globalny>, to: <numer-przystanku-globalny> }]
export function buildRouteStages(stops) {
  const valid = stops.filter((s) => formatAddress(s).trim().length > 0);
  if (valid.length === 0) return [];

  if (valid.length <= MAX_STOPS_PER_LINK) {
    return [{ url: buildSingleUrl(valid), stops: valid, from: 1, to: valid.length }];
  }

  const stages = [];
  let i = 0;
  while (i < valid.length) {
    const end = Math.min(i + MAX_STOPS_PER_LINK, valid.length);
    const chunk = valid.slice(i, end);
    stages.push({
      url: buildSingleUrl(chunk),
      stops: chunk,
      from: i + 1,
      to: end,
    });
    if (end === valid.length) break;
    i = end - 1; // przedłuż łańcuch
  }
  return stages;
}

// Zachowane dla wstecznej kompatybilności.
export function buildRouteUrls(stops) {
  return buildRouteStages(stops).map((s) => s.url);
}
