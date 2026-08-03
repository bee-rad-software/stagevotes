'use client';

import { useMemo } from 'react';

import {
  GripVertical,
  List,
  Music2,
  SkipForward,
  Trash2,
  UserRound,
} from 'lucide-react';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

  function formatSingerName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1).toLowerCase()
    )
    .join(' ');
}


export type SVHostQueueItem = {
  id: string;
  singerName: string;
  songTitle: string;
  artist?: string;
  photoUrl?: string | null;
  round: number;
  status?: 'current' | 'next' | 'waiting';
  performance: any;
};

type Props = {
  items: SVHostQueueItem[];

  completedCount?: number;
  singerView?: boolean;

  editingId?: string | null;
  editSingerName?: string;
  editSongTitle?: string;
  editArtist?: string;

  onToggleSingerView?: () => void;

  onEditSingerName?: (value: string) => void;
  onEditSongTitle?: (value: string) => void;
  onEditArtist?: (value: string) => void;

 onStartEdit?: (performance: SVHostQueueItem) => void;
  onSaveEdit?: (id: string) => void;
  onCancelEdit?: () => void;

  onSkip?: (id: string) => void;
  onRemove?: (id: string) => void;
 

  onReorder?: (
    draggedId: string,
    targetId: string
  ) => void;
};

type SortableRowProps = {
  item: SVHostQueueItem;
  index: number;
  editing: boolean;

  onStartEdit?: (performance: SVHostQueueItem) => void;
  onSkip?: (id: string) => void;
  onRemove?: (id: string) => void;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function SortableQueueRow({
  item,
  index,
  editing,
  onStartEdit,
  onSkip,
  onRemove,
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
    disabled: isCurrent || editing,
  });

const rowStyle: React.CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition:
    transition ||
    'transform 220ms cubic-bezier(0.2, 0, 0, 1)',
  position: 'relative',
  zIndex: isDragging ? 20 : 1,
  opacity: isDragging ? 0.65 : 1,
};

  return (
    <div
      ref={setNodeRef}
      style={rowStyle}
      className={[
        'sv-host-queue-sortable',
        isDragging
          ? 'sv-host-queue-placeholder'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <article
        className={[
          'sv-host-queue-row',
          isCurrent
            ? 'sv-host-queue-current'
            : '',
          isNext ? 'sv-host-queue-next' : '',
          isDragging
            ? 'sv-host-queue-dragging'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => onStartEdit?.(item)}
      >
        <button
          type="button"
          className="sv-host-queue-drag-handle"
          disabled={isCurrent || editing}
          aria-label={
            isCurrent
              ? `${formatSingerName(item.singerName)} is currently performing`
              : `Drag ${formatSingerName(item.singerName)} to reorder`
          }
          title={
            isCurrent
              ? 'Current singer cannot be moved'
              : editing
              ? 'Finish editing before moving'
              : 'Drag to reorder'
          }
          onClick={(event) =>
            event.stopPropagation()
          }
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>

        <div
  className={[
    'sv-host-queue-position',
    isCurrent
      ? 'sv-host-queue-position-current'
      : '',
    isNext
      ? 'sv-host-queue-position-next'
      : '',
  ]
    .filter(Boolean)
    .join(' ')}
>
  {isCurrent
    ? '● LIVE'
    : isNext
    ? '● UP NEXT'
    : `#${index + 1}`}
</div>

      <div className="sv-host-queue-avatar">
  {item.photoUrl ? (
    <img
      src={item.photoUrl}
      alt={`${formatSingerName(item.singerName)} profile`}
      className="sv-host-queue-avatar-image"
    />
  ) : (
    getInitials(item.singerName)
  )}
</div>

        <div className="sv-host-queue-copy">
  <div className="sv-host-queue-name-line">
    <strong className="sv-queue-singer-name">
      {formatSingerName(item.singerName)}
    </strong>
  </div>

  <div className="sv-host-queue-song">
    <Music2 size={15} />

            <span>{item.songTitle}</span>
          </div>

          {item.artist && (
            <small>by {item.artist}</small>
          )}
        </div>

        <div className="sv-host-queue-actions">
          <button
            type="button"
            title="Skip"
            aria-label={`Skip ${formatSingerName(item.singerName)}`}
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
            aria-label={`Remove ${formatSingerName(item.singerName)}`}
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
    </div>
  );
}

export default function SVHostQueue({
  items,
  completedCount = 0,
  singerView = false,

  editingId,
  editSingerName = '',
  editSongTitle = '',
  editArtist = '',

  onToggleSingerView,

  onEditSingerName,
  onEditSongTitle,
  onEditArtist,

  onStartEdit,
  onSaveEdit,
  onCancelEdit,

  onSkip,
  onRemove,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const singerGroups = useMemo(() => {
    const groups = new Map<
      string,
      SVHostQueueItem[]
    >();

    items.forEach((item) => {
      const existing =
        groups.get(item.singerName) || [];

      groups.set(item.singerName, [
        ...existing,
        item,
      ]);
    });

    return Array.from(groups.entries());
  }, [items]);

const uniqueSingerCount = singerGroups.length;

  const currentSinger = items.find(
    (item) => item.status === 'current'
  );

  const nextSinger = items.find(
    (item) => item.status === 'next'
  );

  const sortableIds = items
    .filter(
      (item) => item.status !== 'current'
    )
    .map((item) => item.id);

  function handleDragEnd(
    dragEvent: DragEndEvent
  ) {
    const { active, over } = dragEvent;

    if (!over || active.id === over.id) {
      return;
    }

    onReorder?.(
      String(active.id),
      String(over.id)
    );
  }

  return (
    <section className="sv-host-queue">
      <div className="sv-host-queue-header">
        <div>
          <div className="sv-mobile-kicker">
            Tonight&apos;s Rotation
          </div>

         <div>
  <h2>
    {items.length}{' '}
    {items.length === 1 ? 'Song' : 'Songs'}
    <span className="sv-host-queue-inline-count">
      {' '}• {uniqueSingerCount}{' '}
      {uniqueSingerCount === 1
        ? 'Singer'
        : 'Singers'}
    </span>
  </h2>
</div>
        </div>

        <button
  type="button"
  className="sv-singer-view-toggle"
  onClick={onToggleSingerView}
>
         {singerView ? (
  <List size={18} />
) : (
  <UserRound size={18} />
)}

     <span>
  {singerView
    ? 'Queue View'
    : 'Singer View'}
</span>
        </button>
      </div>

      <div className="sv-host-queue-stats">
        <span className="badge">
          🎤 Active • {items.length}
        </span>

        <span className="badge">
          🎙 Now •{' '}
{currentSinger
  ? formatSingerName(currentSinger.singerName)
  : 'Show not started'}
        </span>

        <span className="badge">
          ⏭ Next •{' '}
{nextSinger
  ? formatSingerName(nextSinger.singerName)
  : 'No one waiting'}
        </span>

        <span className="badge">
          ✅ Completed • {completedCount}
        </span>
      </div>

      {editingId && (
        <div className="sv-host-queue-editor">
          <div>
            <div className="sv-mobile-kicker">
              Edit Queue Entry
            </div>

            <h3>Update singer or song</h3>
          </div>

          <label htmlFor="queue-edit-singer">
            Singer name
          </label>

          <input
            id="queue-edit-singer"
            value={editSingerName}
            onChange={(event) =>
              onEditSingerName?.(
                event.target.value
              )
            }
          />

          <label htmlFor="queue-edit-song">
            Song title
          </label>

          <input
            id="queue-edit-song"
            value={editSongTitle}
            onChange={(event) =>
              onEditSongTitle?.(
                event.target.value
              )
            }
          />

          <label htmlFor="queue-edit-artist">
            Artist
          </label>

          <input
            id="queue-edit-artist"
            value={editArtist}
            onChange={(event) =>
              onEditArtist?.(
                event.target.value
              )
            }
          />

          <div className="sv-host-queue-editor-actions">
            <button
              type="button"
              className="btn-small primary"
              onClick={() =>
                onSaveEdit?.(editingId)
              }
            >
              Save
            </button>

            <button
              type="button"
              className="btn-small"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="sv-host-queue-empty">
          <Music2 size={30} />

          <strong>No singers in line</strong>

          <span>
            Add a walk-up singer or let guests
            join from the signup page.
          </span>
        </div>
      ) : singerView ? (
  <div className="sv-host-singer-groups">
    {singerGroups.map(
      ([singerName, songs]) => {
        const photoUrl =
          songs.find(
            (song) => song.photoUrl
          )?.photoUrl || null;

        return (
          <div
            className="sv-singer-group"
            key={singerName}
          >
            <div className="sv-singer-group-header">
              <div className="sv-singer-group-avatar">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={singerName}
                  />
                ) : (
                  getInitials(singerName)
                )}
              </div>

              <div>
                <strong className="sv-singer-group-name">
                  {formatSingerName(
                    singerName
                  )}
                </strong>

                <span className="sv-singer-group-count">
                  {songs.length}{' '}
                  {songs.length === 1
                    ? 'song'
                    : 'songs'}
                </span>
              </div>
            </div>

            <div className="sv-singer-group-songs">
              {songs.map((song) => (
                <button
                  type="button"
                  key={song.id}
                  className="sv-singer-group-song"
                  onClick={() =>
                    onStartEdit?.(song)
                  }
                >
                  <Music2 size={16} />

                  <span>
                    <strong>
                      {song.songTitle}
                    </strong>

                    {song.artist && (
                      <small>
                        {song.artist}
                      </small>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      }
    )}
  </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={
              verticalListSortingStrategy
            }
          >
            <div className="sv-host-queue-list">
              {items.map((item, index) => (
                <SortableQueueRow
                  key={item.id}
                  item={item}
                  index={index}
                  editing={
                    editingId === item.id
                  }
                  onStartEdit={onStartEdit}
                  onSkip={onSkip}
                  onRemove={onRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}