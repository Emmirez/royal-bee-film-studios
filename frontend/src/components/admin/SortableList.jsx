import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cx } from '../../lib/format';

function SortableItem({ id, children, handleLabel }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx('relative', isDragging && 'z-10 opacity-80 shadow-lift')}
    >
      {children({
        handle: (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md text-app-subtle hover:bg-app-muted active:cursor-grabbing"
            aria-label={handleLabel}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ),
        isDragging,
      })}
    </div>
  );
}

/**
 * Drag-to-reorder list or grid (mouse, touch and keyboard: Space to lift, arrows to move).
 * onReorder receives the new array of items.
 */
export default function SortableList({ items, getId = (i) => i._id, onReorder, renderItem, layout = 'list', className }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem key={getId(item)} id={getId(item)} handleLabel={`Drag to reorder item ${index + 1}`}>
              {(props) => renderItem(item, props, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
