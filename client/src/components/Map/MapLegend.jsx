import { STATUS_COLOR, STATUS_LABEL, STATUS_LIST } from '../../lib/statusColors.js';
import { URGENCY_LABEL } from '../../lib/urgency.js';

// Mała legenda kolorów pinezek — nakładka na mapie.
// W trybie 'urgency' pokazuje zakresy z aktualnych progów, w 'status' etykiety statusów.
export default function MapLegend({ mode, urgency }) {
  let items;

  if (mode === 'urgency') {
    const { weeksUrgent, weeksSoon, colors } = urgency;
    items = [
      { color: colors.overdue, label: URGENCY_LABEL.overdue },
      { color: colors.urgent, label: `${URGENCY_LABEL.urgent} (< ${weeksUrgent} tyg)` },
      { color: colors.soon, label: `${URGENCY_LABEL.soon} (${weeksUrgent}–${weeksSoon} tyg)` },
      { color: colors.later, label: `${URGENCY_LABEL.later} (> ${weeksSoon} tyg)` },
      { color: colors.none, label: URGENCY_LABEL.none },
    ];
  } else {
    items = STATUS_LIST.map((s) => ({ color: STATUS_COLOR[s], label: STATUS_LABEL[s] }));
  }

  return (
    <div
      className="absolute bottom-2 left-2 z-[500] bg-white/95 backdrop-blur-sm rounded-md shadow-md border border-slate-200 px-2.5 py-2 text-[11px] leading-tight"
      style={{ pointerEvents: 'none' }}
    >
      <p className="font-semibold text-slate-500 uppercase tracking-wide mb-1 text-[10px]">
        {mode === 'urgency' ? 'Pilność' : 'Status'}
      </p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
              style={{ background: it.color }}
            />
            <span className="text-slate-700 whitespace-nowrap">{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
