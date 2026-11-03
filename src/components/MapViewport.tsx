import { useCallback, useEffect, useRef, useState } from 'react';
import './MapViewport.css';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

type View = { k: number; x: number; y: number };

const MIN = 1;
const MAX = 4;

/**
 * A map you can walk around: drag to move, pinch or ⌘/Ctrl + wheel to zoom, and buttons for
 * zoom in, zoom out and back to the whole view. `children` is drawn at scale 1 and moved as one.
 * `markers` get the zoom level so they can stay the same size on screen.
 */
export default function MapViewport({
  children,
  markers,
  label,
  start = 1,
}: {
  children: ReactNode;
  markers?: (zoom: number) => ReactNode;
  label: string;
  /** Zoom of the opening view (and of the "whole view" button), centred. */
  start?: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const pan = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  // Where the finger (or mouse) went down: a drag starts once it has gone far enough from there
  const origin = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{
    distance: number;
    view: View;
    mid: { x: number; y: number };
  } | null>(null);

  // Keep the content covering the frame: no empty margin. The content can be wider than the frame
  // (on a phone the drawing keeps its height and you pan sideways).
  const clamp = useCallback((next: View): View => {
    const box = frame.current?.getBoundingClientRect();
    const k = Math.min(MAX, Math.max(MIN, next.k));
    if (!box || !pan.current) return { k, x: 0, y: 0 };
    const width = pan.current.offsetWidth * k;
    const height = pan.current.offsetHeight * k;
    const x = width <= box.width ? (box.width - width) / 2 : Math.min(0, Math.max(box.width - width, next.x));
    const y = height <= box.height ? (box.height - height) / 2 : Math.min(0, Math.max(box.height - height, next.y));
    return { k, x, y };
  }, []);

  /** The opening view: the whole drawing (or its middle, when it opens zoomed), centred. */
  const home = useCallback(() => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || !pan.current) return { k: start, x: 0, y: 0 };
    return clamp({
      k: start,
      x: (box.width - pan.current.offsetWidth * start) / 2,
      y: (box.height - pan.current.offsetHeight * start) / 2,
    });
  }, [clamp, start]);

  // Centre on first show and whenever the frame changes size (rotation, window resize).
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    setView(home());
    const observer = new ResizeObserver(() => setView(home()));
    observer.observe(el);
    return () => observer.disconnect();
  }, [home]);

  /** Zoom by `factor` around a point of the frame (in px from its top left). */
  const zoomAt = useCallback(
    (factor: number, px: number, py: number) =>
      setView((v) => {
        const k = Math.min(MAX, Math.max(MIN, v.k * factor));
        const ratio = k / v.k;
        return clamp({
          k,
          x: px - (px - v.x) * ratio,
          y: py - (py - v.y) * ratio,
        });
      }),
    [clamp],
  );

  // ⌘/Ctrl + wheel (and trackpad pinch, which the browser reports the same way) zooms; a plain
  // wheel keeps scrolling the page.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const box = el.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX - box.left, event.clientY - box.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const local = (event: ReactPointerEvent) => {
    const box = frame.current!.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  // While the map moves, the drawing gets its own layer (smooth on phones); it is dropped at the end
  // so the browser redraws it sharp at the new zoom. Off screen, the figures stop moving.
  const setMoving = (on: boolean) => frame.current?.classList.toggle('map--moving', on);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => el.classList.toggle('map--away', !entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    moved.current = false;
    // The zoom buttons are tapped, never dragged
    if ((event.target as Element).closest('.map-controls')) return;
    pointers.current.set(event.pointerId, local(event));
    if (pointers.current.size === 1) origin.current = local(event);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        view,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = local(event);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const { distance, view: start, mid } = pinch.current;
      const k = Math.min(MAX, Math.max(MIN, start.k * (Math.hypot(a.x - b.x, a.y - b.y) / distance)));
      const ratio = k / start.k;
      moved.current = true;
      setMoving(true);
      setView(
        clamp({
          k,
          x: mid.x - (mid.x - start.x) * ratio,
          y: mid.y - (mid.y - start.y) * ratio,
        }),
      );
      return;
    }
    // A finger shakes a little on a tap: the drag starts past a few pixels from where it went down
    // (counted from there, so a slow drag starts too), then follows every move.
    if (!moved.current) {
      const from = origin.current ?? previous;
      const slop = event.pointerType === 'touch' ? 8 : 3;
      if (Math.hypot(point.x - from.x, point.y - from.y) < slop) {
        pointers.current.set(event.pointerId, previous);
        return;
      }
      moved.current = true;
      setMoving(true);
      if (!frame.current?.hasPointerCapture(event.pointerId)) frame.current?.setPointerCapture(event.pointerId);
    }
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    if (dx || dy) setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      origin.current = null;
      setMoving(false);
    }
  };

  const center = (factor: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (box) zoomAt(factor, box.width / 2, box.height / 2);
  };

  return (
    <div
      ref={frame}
      className={`map${view.k > 1 ? ' map--zoomed' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      // Older browsers without overflow: clip may still scroll it on focus: undo that
      onScroll={(event) => {
        event.currentTarget.scrollLeft = 0;
        event.currentTarget.scrollTop = 0;
      }}
      // A drag must not end as a click on a marker
      onClickCapture={(event) => {
        if (moved.current) {
          event.stopPropagation();
          event.preventDefault();
          moved.current = false;
        }
      }}
      aria-label={label}
      role="group"
    >
      <div
        ref={pan}
        className="map-pan"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
        }}
      >
        {children}
        {markers?.(view.k)}
      </div>
      <div className="map-controls">
        <button type="button" onClick={() => center(1.5)} aria-label="Zoomer" disabled={view.k >= MAX}>
          +
        </button>
        <button type="button" onClick={() => center(1 / 1.5)} aria-label="Dézoomer" disabled={view.k <= MIN}>
          −
        </button>
        <button type="button" onClick={() => setView(home())} aria-label="Revoir tout" disabled={view.k === 1}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
