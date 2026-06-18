/**
 * Import/eksport zamówień w formacie CSV (otwieralne w Excelu).
 * Nagłówki po polsku, mapowane na pola zamówienia.
 */
import Papa from 'papaparse';
import { COUNTRIES, DEFAULT_COUNTRY } from './countries.js';
import { STATUS_LIST } from './statusColors.js';

// Kolejność i nazwy kolumn (PL) ↔ pole zamówienia.
export const CSV_COLUMNS = [
  { header: 'Tytuł', field: 'title' },
  { header: 'Imię', field: 'firstName' },
  { header: 'Nazwisko', field: 'lastName' },
  { header: 'Telefon', field: 'phone' },
  { header: 'Kraj', field: 'country' },
  { header: 'Kod pocztowy', field: 'postalCode' },
  { header: 'Miasto', field: 'city' },
  { header: 'Adres', field: 'address' },
  { header: 'Data dostawy', field: 'deliveryDate' },
  { header: 'Status', field: 'status' },
  { header: 'Szczegóły', field: 'details' },
  { header: 'Kwota', field: 'amount' },
  { header: 'Szerokość (lat)', field: 'lat' },
  { header: 'Długość (lng)', field: 'lng' },
];

const VALID_COUNTRIES = COUNTRIES.map((c) => c.code);

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Zamienia listę zamówień na string CSV. */
export function ordersToCsv(orders) {
  const rows = orders.map((o) => {
    const row = {};
    for (const col of CSV_COLUMNS) {
      if (col.field === 'deliveryDate') row[col.header] = fmtDate(o.deliveryDate);
      else if (col.field === 'lat' || col.field === 'lng') row[col.header] = o[col.field] ?? '';
      else row[col.header] = o[col.field] ?? '';
    }
    return row;
  });
  return Papa.unparse({ fields: CSV_COLUMNS.map((c) => c.header), data: rows });
}

/** Pobiera CSV jako plik (z BOM UTF-8 dla poprawnych polskich znaków w Excelu). */
export function downloadCsv(csv, filename = 'zamowienia.csv') {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Dopasowanie nagłówka z pliku do pola (odporne na wielkość liter / spacje).
function buildHeaderMap(headers) {
  const norm = (s) => (s || '').toString().trim().toLowerCase();
  const map = {};
  for (const col of CSV_COLUMNS) {
    const match = headers.find((h) => norm(h) === norm(col.header));
    if (match) map[match] = col.field;
  }
  return map;
}

function normalizeRow(raw, headerMap, index) {
  const o = {};
  for (const [header, field] of Object.entries(headerMap)) {
    o[field] = (raw[header] ?? '').toString().trim();
  }

  const errors = [];

  if (!o.title) errors.push('brak tytułu');

  // Kraj
  o.country = (o.country || DEFAULT_COUNTRY).toLowerCase();
  if (!VALID_COUNTRIES.includes(o.country)) o.country = DEFAULT_COUNTRY;

  // Status
  if (!STATUS_LIST.includes(o.status)) o.status = 'nowe';

  // Data
  if (o.deliveryDate) {
    const d = new Date(o.deliveryDate);
    o.deliveryDate = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } else {
    o.deliveryDate = null;
  }

  // Kwota (opcjonalna)
  if (o.amount !== undefined && o.amount !== '') {
    const amt = parseFloat(o.amount);
    o.amount = isFinite(amt) ? amt : null;
  } else {
    o.amount = null;
  }

  // Współrzędne (opcjonalne)
  const lat = parseFloat(o.lat);
  const lng = parseFloat(o.lng);
  if (isFinite(lat) && isFinite(lng)) {
    o.lat = lat;
    o.lng = lng;
  } else {
    delete o.lat;
    delete o.lng;
  }

  return { row: o, errors, line: index + 2 }; // +2: nagłówek + indeks od 1
}

/**
 * Parsuje plik CSV → { valid: [...], invalid: [{line, errors, row}] }.
 */
export function parseOrdersCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const headerMap = buildHeaderMap(headers);
        if (!Object.values(headerMap).includes('title')) {
          reject(new Error('Brak kolumny „Tytuł" w pliku. Pobierz wzór przez „Eksportuj".'));
          return;
        }
        const valid = [];
        const invalid = [];
        results.data.forEach((raw, i) => {
          const { row, errors, line } = normalizeRow(raw, headerMap, i);
          if (errors.length) invalid.push({ line, errors, row });
          else valid.push(row);
        });
        resolve({ valid, invalid });
      },
      error: (err) => reject(err),
    });
  });
}
