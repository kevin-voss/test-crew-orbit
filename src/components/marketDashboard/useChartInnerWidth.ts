import { useLayoutEffect, useRef, useState, type Ref } from "react";

/**
 * happy-dom's layout metrics are stubs; Recharts needs numeric width. We measure a shell `div`
 * and keep a stable fallback for the first paint.
 */
export function useChartInnerWidth(fallback: number): {
  ref: Ref<HTMLDivElement>;
  width: number;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = (): void => {
      const w = el.getBoundingClientRect().width;
      setWidth(w > 0 ? w : fallback);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);

  return { ref: ref as Ref<HTMLDivElement>, width };
}
