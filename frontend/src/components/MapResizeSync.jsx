import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export function MapResizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame;

    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
    };

    refresh();
    const delayedRefresh = window.setTimeout(refresh, 250);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh);
    observer?.observe(container);
    window.addEventListener('resize', refresh);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(delayedRefresh);
      observer?.disconnect();
      window.removeEventListener('resize', refresh);
    };
  }, [map]);

  return null;
}
