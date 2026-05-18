/**
 * @param {{ completed: number; total: number }} params
 * @returns {string}
 */
export function renderProgressBar({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const parts = [
    '<div class="progress" aria-label="Fortschritt">',
    `<p class="progress-label">Fortschritt: ${completed} von ${total} Schritten (${pct}%)</p>`,
    `<div class="progress-track" role="progressbar" aria-valuenow="${completed}" aria-valuemax="${total}">`,
    `<div class="progress-fill" style="width:${pct}%"></div>`,
    "</div></div>",
  ];
  return parts.join("");
}
