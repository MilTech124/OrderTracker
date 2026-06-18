/**
 * Logika „pilności" dostawy — kolor pinezki zależny od daty dostawy.
 *
 * Progi (w tygodniach) i kolory są konfigurowalne przez użytkownika i trzymane
 * w localStorage (patrz SettingsContext). Tu znajduje się czysta logika:
 * wyliczanie poziomu pilności oraz odczyt/zapis ustawień.
 */

const STORAGE_KEY = 'orderTrackerSettings';

export const DEFAULT_SETTINGS = {
  colorMode: 'urgency', // 'status' | 'urgency'
  urgency: {
    weeksUrgent: 3, // dni < weeksUrgent*7  → urgent
    weeksSoon: 5, // weeksUrgent..weeksSoon → soon; powyżej → later
    colors: {
      overdue: '#7f1d1d',
      urgent: '#ef4444',
      soon: '#eab308',
      later: '#22c55e',
      none: '#94a3b8',
    },
  },
};

export const URGENCY_LEVELS = ['overdue', 'urgent', 'soon', 'later', 'none'];

export const URGENCY_LABEL = {
  overdue: 'Po terminie',
  urgent: 'Pilne',
  soon: 'Wkrótce',
  later: 'Później',
  none: 'Brak daty',
};

// Liczba pełnych dni od dziś (start dnia) do daty dostawy.
function diffInDays(deliveryDate, now) {
  const d = new Date(deliveryDate);
  if (isNaN(d.getTime())) return null;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDelivery = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startDelivery - startToday) / 86400000);
}

/** Zwraca poziom pilności dla danej daty dostawy. */
export function getUrgencyLevel(deliveryDate, u = DEFAULT_SETTINGS.urgency, now = new Date()) {
  if (!deliveryDate) return 'none';
  const days = diffInDays(deliveryDate, now);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days < u.weeksUrgent * 7) return 'urgent';
  if (days < u.weeksSoon * 7) return 'soon';
  return 'later';
}

/** Zwraca kolor (hex) pinezki dla danej daty dostawy. */
export function getUrgencyColor(deliveryDate, u = DEFAULT_SETTINGS.urgency, now = new Date()) {
  const level = getUrgencyLevel(deliveryDate, u, now);
  return u.colors[level] || DEFAULT_SETTINGS.urgency.colors[level];
}

// ── Persistencja w localStorage ──────────────────────────────────────────────

// Głęboki merge na DEFAULT_SETTINGS — odporne na brakujące/uszkodzone pola.
function mergeWithDefaults(stored) {
  if (!stored || typeof stored !== 'object') return structuredCloneSafe(DEFAULT_SETTINGS);
  return {
    colorMode: stored.colorMode === 'status' ? 'status' : 'urgency',
    urgency: {
      weeksUrgent: Number(stored.urgency?.weeksUrgent) || DEFAULT_SETTINGS.urgency.weeksUrgent,
      weeksSoon: Number(stored.urgency?.weeksSoon) || DEFAULT_SETTINGS.urgency.weeksSoon,
      colors: { ...DEFAULT_SETTINGS.urgency.colors, ...(stored.urgency?.colors || {}) },
    },
  };
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return mergeWithDefaults(raw ? JSON.parse(raw) : null);
  } catch {
    return structuredCloneSafe(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // brak miejsca / tryb prywatny — ignoruj
  }
}
