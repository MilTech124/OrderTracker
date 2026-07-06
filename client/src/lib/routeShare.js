import { formatAddress } from './googleMapsLink.js';

// Buduje tekst do udostępnienia trasy (Web Share / schowek / WhatsApp).
// options.title — tytuł trasy, options.driverName — kierowca.
export function buildShareText(stages, stops, { title, driverName } = {}) {
  const total = stops.length;
  const multiStage = stages.length > 1;
  let text = title ? `🚚 ${title}` : '🚚 Trasa dostawy';
  text += ` — ${total} ${total === 1 ? 'przystanek' : total < 5 ? 'przystanki' : 'przystanków'}`;
  if (multiStage) text += ` (${stages.length} etapy)`;
  if (driverName) text += `\n👤 Kierowca: ${driverName}`;
  text += '\n\n';
  stages.forEach((stage, idx) => {
    if (multiStage) text += `📍 Etap ${idx + 1}/${stages.length} (przystanki ${stage.from}–${stage.to}):\n`;
    stage.stops.forEach((stop, i) => {
      const num = stage.from + i;
      const name = [stop.firstName, stop.lastName].filter(Boolean).join(' ');
      const addr = formatAddress(stop);
      text += `${num}. ${name ? name + ' — ' : ''}${addr || stop.title}\n`;
    });
    text += `\n🗺️ Nawigacja:\n${stage.url}\n`;
    if (idx < stages.length - 1) text += '\n';
  });
  return text.trim();
}
