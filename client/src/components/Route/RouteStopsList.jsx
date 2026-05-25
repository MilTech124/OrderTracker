import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { formatAddress } from '../../lib/googleMapsLink.js';

function SortableItem({ id, index, stop, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="card p-3 flex items-center gap-3"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-700">
        <GripVertical size={18} />
      </button>
      <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{stop.title}</p>
        <p className="text-xs text-slate-500 truncate">{formatAddress(stop) || '(brak adresu)'}</p>
      </div>
      <button onClick={() => onRemove(stop.id)} className="text-slate-400 hover:text-red-600">
        <X size={18} />
      </button>
    </li>
  );
}

export default function RouteStopsList({ stops, onReorder, onRemove }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    onReorder(arrayMove(stops, oldIndex, newIndex));
  }

  if (stops.length === 0) {
    return <p className="text-sm text-slate-500">Brak punktów. Zaznacz zamówienia z listy obok.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {stops.map((stop, idx) => (
            <SortableItem key={stop.id} id={stop.id} index={idx} stop={stop} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
