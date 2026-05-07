import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.assign(globalThis, {
  jest: {
    advanceTimersByTime: (ms: number) => {
      vi.advanceTimersByTime(ms);
    },
  },
});

globalThis.ResizeObserver = class implements ResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}

  observe(target: Element) {
    const el = target as HTMLElement;
    const width = el.clientWidth || 800;
    const height = el.clientHeight || 400;
    const contentRect = {
      x: 0,
      y: 0,
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      toJSON: () => ({}),
    };
    const entry: ResizeObserverEntry = {
      target,
      contentRect: contentRect as unknown as DOMRectReadOnly,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    };
    this.callback([entry], this);
  }

  unobserve() {}

  disconnect() {}
};
