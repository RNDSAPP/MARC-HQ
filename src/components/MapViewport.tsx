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
export default function MapViewport({ children, markers, label }: {
  children: ReactNode;
  markers?: (zoom: number) => ReactNode;
  label: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const pan = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const pinch = useRef<{ distance: number; view: View; mid: { x: number; y: number } } | null>(null);

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

  /** The whole drawing, centred. */
  const home = useCallback(() => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || !pan.current) return { k: 1, x: 0, y: 0 };
    return clamp({ k: 1, x: (box.width - pan.current.offsetWidth) / 2, y: (box.height - pan.current.offsetHeight) / 2 });
  }, [clamp]);

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
        return clamp({ k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio });
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

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, local(event));
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), view, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
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
      setView(clamp({ k, x: mid.x - (mid.x - start.x) * ratio, y: mid.y - (mid.y - start.y) * ratio }));
      return;
    }
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) {
      if (!moved.current && Math.abs(dx) + Math.abs(dy) < 3) return;
      moved.current = true;
      if (!frame.current?.hasPointerCapture(event.pointerId)) frame.current?.setPointerCapture(event.pointerId);
      setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
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
      <div ref={pan} className="map-pan" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
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
