"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import type { StopItem } from "@/types/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface StopListProps {
  stops: StopItem[];
  selectedStopId: string | null;
  onSelectStop: (stop: StopItem) => void;
  onToggleVisited?: (stopId: string, visited: boolean) => void;
  onReorder?: (items: Array<{ id: string; sortOrder: number }>) => void;
}

function SortableStopItem({
  stop,
  index,
  selectedStopId,
  onSelectStop,
  onToggleVisited,
}: {
  stop: StopItem;
  index: number;
  selectedStopId: string | null;
  onSelectStop: (stop: StopItem) => void;
  onToggleVisited?: (stopId: string, visited: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`stop-list-item ${isDragging ? "dragging" : ""}`}
    >
      <button
        className={`stop-item ${stop.id === selectedStopId ? "selected" : ""} ${
          stop.visited ? "visited" : ""
        }`}
        onClick={() => onSelectStop(stop)}
      >
        {/* Drag handle — invisible, whole card is draggable via long-press */}
        <span
          className="stop-list-drag-handle"
          {...attributes}
          {...listeners}
          title="Przeciągnij, aby zmienić kolejność"
          aria-hidden="true"
        />

        {/* Thumbnail */}
        {stop.photo ? (
          <Image
            src={stop.photo.src}
            alt={stop.photo.alt}
            width={48}
            height={48}
            className="stop-thumb"
          />
        ) : (
          <span className="stop-thumb-placeholder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </span>
        )}

        <span className="stop-order">{index + 1}</span>
        <div className="stop-item-content">
          <strong className="stop-title">{stop.title}</strong>
          {stop.summary && (
            <span className="stop-summary">
              {stop.summary.length > 26
                ? stop.summary.slice(0, 26).trimEnd() + "\u2026"
                : stop.summary}
            </span>
          )}
          {/* Meta chips */}
          {(stop.duration || stop.cost || stop.warnings.length > 0) && (
            <div className="stop-meta-chips">
              {stop.duration && (
                <span className="stop-meta-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {stop.duration.min}-{stop.duration.max} min
                </span>
              )}
              {stop.cost && (
                <span className="stop-meta-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  {stop.cost.amount} {stop.cost.currency}
                </span>
              )}
              {stop.warnings.length > 0 && (
                <span className="stop-meta-chip warn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  {stop.warnings.length}
                </span>
              )}
            </div>
          )}
        </div>
        <span
          className={`stop-visited-toggle${stop.visited ? " visited" : ""}`}
          title={
            stop.visited ? "Odznacz — nie odwiedzone" : "Zaznacz jako odwiedzone"
          }
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisited?.(stop.id, !stop.visited);
          }}
        >
          {stop.visited ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : null}
          <span aria-hidden="true" style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>{stop.visited ? "✓" : "○"}</span>
        </span>
      </button>
    </li>
  );
}

export function StopList({
  stops,
  selectedStopId,
  onSelectStop,
  onToggleVisited,
  onReorder,
}: StopListProps) {
  const selectedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (selectedStopId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedStopId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(stops, oldIndex, newIndex);
    const items = reordered.map((s, idx) => ({ id: s.id, sortOrder: idx }));
    onReorder?.(items);
  };

  if (stops.length === 0) {
    return <div className="stop-list-empty">Brak przystanków na ten dzień.</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={stops.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="stop-list">
          {stops.map((stop, index) => (
            <SortableStopItem
              key={stop.id}
              stop={stop}
              index={index}
              selectedStopId={selectedStopId}
              onSelectStop={onSelectStop}
              onToggleVisited={onToggleVisited}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}