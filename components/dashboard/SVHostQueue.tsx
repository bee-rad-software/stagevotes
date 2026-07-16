'use client';

import {
  ChevronUp,
  Music2,
  MoreHorizontal,
  SkipForward,
  Trash2,
} from 'lucide-react';

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

import { GripVertical } from 'lucide-react';

export type SVHostQueueItem = {
  id: string;
  singerName: string;
  songTitle: string;
  artist?: string;
  status?: 'current' | 'next' | 'waiting';
  round: number;
};

type Props = {
  items: SVHostQueueItem[];
  onMoveUp?: (id: string) => void;
  onSkip?: (id: string) => void;
  onRemove?: (id: string) => void;
  onSelect?: (id: string) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
};

type SortableRowProps = {
  item: SVHostQueueItem;
  index: number;
  onMoveUp?: (id: string) => void;
  onSkip?: (id: string) => void;
  onRemove?: (id: string) => void;
  onSelect?: (id: string) => void;
};

function SortableQueueRow({
  item,
  index,
  onMoveUp,
  onSkip,
  onRemove,
  onSelect,
}: SortableRowProps) {
  const isCurrent = item.status === 'current';
  const isNext = item.status === 'next';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isCurrent,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[
        'sv-host-queue-row',
        isCurrent ? 'sv-host-queue-current' : '',
        isNext ? 'sv-host-queue-next' : '',
        isDragging ? 'sv-host-queue-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect?.(item.id)}
    >
      <button
        type="button"
        className="sv-host-queue-drag-handle"
        disabled={isCurrent}
        aria-label={`Move ${item.singerName}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={19} />
      </button>

      <div className="sv-host-queue-position">
        {isCurrent ? 'NOW' : isNext ? 'NEXT' : `#${index + 1}`}
      </div>

      <div className="sv-host-queue-avatar">
        {item.singerName
          .trim()
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </div>

      <div className="sv-host-queue-copy">
        <strong>{item.singerName}</strong>

        <div className="sv-host-queue-song">
          <Music2 size={15} />
          <span>{item.songTitle}</span>
        </div>

        {item.artist && <small>by {item.artist}</small>}
      </div>

      <div className="sv-host-queue-actions">
        {!isCurrent && (
          <button
            type="button"
            title="Move up"
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp?.(item.id);
            }}
          >
            <ChevronUp size={18} />
          </button>
        )}

        <button
          type="button"
          title="Skip"
          onClick={(event) => {
            event.stopPropagation();
            onSkip?.(item.id);
          }}
        >
          <SkipForward size={18} />
        </button>

        <button
          type="button"
          title="Remove"
          className="sv-host-queue-remove"
          onClick={(event) => {
            event.stopPropagation();
            onRemove?.(item.id);
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  );
}

export default function SVHostQueue({
  items,
  onMoveUp,
  onSkip,
  onRemove,
  onSelect,
  onReorder,
}: Props) {

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6,
    },
  })
);

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  onReorder?.(String(active.id), String(over.id));
}

  return (
    <section className="sv-host-queue">
      <div className="sv-host-queue-header">
        <div>
          <div className="sv-mobile-kicker">Tonight&apos;s Rotation</div>
          <h2>{items.length} singers in line</h2>
        </div>

        <button
          type="button"
          className="sv-host-queue-menu"
          aria-label="Queue options"
        >
          <MoreHorizontal size={21} />
        </button>
      </div>

     <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={items.map((item) => item.id)}
    strategy={verticalListSortingStrategy}
  >
    <div className="sv-host-queue-list">
      {items.map((item, index) => (
        <SortableQueueRow
          key={item.id}
          item={item}
          index={index}
          onMoveUp={onMoveUp}
          onSkip={onSkip}
          onRemove={onRemove}
          onSelect={onSelect}
        />
      ))}
    </div>
  </SortableContext>
</DndContext>
    </section>
  );
}