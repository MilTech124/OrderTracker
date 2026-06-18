import { Edit, Trash2, ChevronUp, Phone, CalendarDays, Banknote } from 'lucide-react';
import { STATUS_LABEL, STATUS_LIST } from '../../lib/statusColors.js';

export default function OrderCard({ order, isEditing, onEdit, onDelete, onStatusChange }) {
  return (
    <div className={`card p-3.5 md:p-4 flex flex-col gap-2.5 transition-all duration-200 ${isEditing ? 'ring-2 ring-brand-500 shadow-card-hover' : 'hover:shadow-card-hover hover:-translate-y-0.5'}`}>

      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm md:text-base truncate">{order.title}</h3>
          <p className="text-sm text-slate-600">
            {[order.firstName, order.lastName].filter(Boolean).join(' ')}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {[order.address, order.postalCode, order.city].filter(Boolean).join(', ')}
          </p>
        </div>
        <span className={`badge badge-${order.status} shrink-0`}>{STATUS_LABEL[order.status]}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {order.deliveryDate && (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 tabular-nums">
            <CalendarDays size={13} className="text-slate-400" />
            {new Date(order.deliveryDate).toLocaleDateString('pl-PL')}
          </p>
        )}
        {order.amount != null && !isNaN(order.amount) && (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 tabular-nums">
            <Banknote size={13} className="text-slate-400" />
            {Number(order.amount).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
          </p>
        )}
        {order.phone && (
          <a
            href={`tel:${order.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone size={12} /> {order.phone}
          </a>
        )}
      </div>
      {order.details && (
        <p className="text-sm text-slate-700 line-clamp-2">{order.details}</p>
      )}

      {/* Akcje */}
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {/* Zmiana statusu */}
        <select
          value={order.status}
          onChange={(e) => onStatusChange?.(order, e.target.value)}
          className="input py-1.5 text-sm flex-1 min-w-0"
        >
          {STATUS_LIST.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <button
          onClick={() => onEdit?.(order)}
          className={`btn text-sm py-1.5 px-3 shrink-0 ${isEditing ? 'btn-primary' : 'btn-secondary'}`}
        >
          {isEditing ? <><ChevronUp size={14} /> Zwiń</> : <><Edit size={14} /> Edytuj</>}
        </button>

        <button
          onClick={() => onDelete?.(order)}
          className="btn btn-danger text-sm py-1.5 px-3 shrink-0"
          aria-label="Usuń"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
