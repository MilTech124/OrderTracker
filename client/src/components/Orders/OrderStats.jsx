import { useMemo } from 'react';
import { AlertTriangle, CalendarClock, Flame } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { getUrgencyLevel } from '../../lib/urgency.js';
import { STATUS_LABEL, STATUS_LIST, STATUS_COLOR } from '../../lib/statusColors.js';

// Pasek statystyk liczonych z bieżącej listy zamówień.
export default function OrderStats({ orders = [] }) {
  const { settings } = useSettings();
  const { weeksUrgent } = settings.urgency;

  const stats = useMemo(() => {
    const now = new Date();
    let overdue = 0;
    let thisWeek = 0;
    let urgent = 0;
    const byStatus = Object.fromEntries(STATUS_LIST.map((s) => [s, 0]));

    for (const o of orders) {
      if (o.status && byStatus[o.status] !== undefined) byStatus[o.status] += 1;
      const level = getUrgencyLevel(o.deliveryDate, settings.urgency, now);
      if (level === 'overdue') overdue += 1;
      if (level === 'urgent') urgent += 1;
      // „W tym tygodniu" = dostawa w ciągu najbliższych 7 dni (nie po terminie)
      if (o.deliveryDate) {
        const d = new Date(o.deliveryDate);
        const days = Math.round(
          (new Date(d.getFullYear(), d.getMonth(), d.getDate()) -
            new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000
        );
        if (days >= 0 && days <= 7) thisWeek += 1;
      }
    }
    return { overdue, thisWeek, urgent, byStatus };
  }, [orders, settings.urgency]);

  if (orders.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-3 animate-fade-in">
      <StatCard
        icon={<AlertTriangle size={18} />}
        iconCls="bg-red-50 text-red-600 ring-red-600/15"
        value={stats.overdue}
        label="Po terminie"
      />
      <StatCard
        icon={<CalendarClock size={18} />}
        iconCls="bg-amber-50 text-amber-600 ring-amber-600/15"
        value={stats.thisWeek}
        label="W tym tygodniu"
      />
      <StatCard
        icon={<Flame size={18} />}
        iconCls="bg-orange-50 text-orange-600 ring-orange-600/15"
        value={stats.urgent}
        label={`Pilne (< ${weeksUrgent} tyg)`}
      />
      <div className="card p-3.5 flex flex-col justify-center col-span-2 sm:col-span-1 lg:col-span-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Wg statusu</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {STATUS_LIST.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full ring-2 ring-white shadow-sm" style={{ background: STATUS_COLOR[s] }} />
              {STATUS_LABEL[s]}: <b className="tabular-nums text-slate-900">{stats.byStatus[s]}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconCls, value, label }) {
  return (
    <div className="card p-3.5 flex items-center gap-3 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <span className={`grid place-items-center w-10 h-10 rounded-xl ring-1 ring-inset shrink-0 ${iconCls}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none tabular-nums text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 truncate mt-1">{label}</p>
      </div>
    </div>
  );
}
