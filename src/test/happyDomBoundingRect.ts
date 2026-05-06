/**
 * happy-dom returns an empty DOMRect from Element#getBoundingClientRect (see Element.ts "TODO").
 * Layout-sensitive tests read inline widths from chart shells; infer non-zero rects from px styles.
 */
if (typeof Element !== "undefined") {
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function hook(this: Element) {
    const base = original.call(this);
    if (base.width > 0 && base.height > 0) {
      return base;
    }

    const el = this as HTMLElement;
    const style = el.style;

    const px = (v: string | undefined | null): number => {
      if (v == null || v === "") return 0;
      const t = String(v).trim();
      if (t.endsWith("px")) {
        const n = Number.parseFloat(t);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    const w = px(style.width) || px(style.minWidth) || 0;
    const h = px(style.height) || px(style.minHeight) || 0;

    return new DOMRect(base.x, base.y, w || base.width, h || base.height);
  };
}
