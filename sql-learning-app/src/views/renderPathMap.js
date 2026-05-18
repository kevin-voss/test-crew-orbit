/**
 * @param {string} text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TYPE_LABELS = {
  concept: "Konzept",
  lesson: "Lektion",
  exercise: "Übung",
};

/**
 * @param {import("../curriculum.js").Curriculum} curriculum
 * @param {{
 *   currentUnitId?: string;
 *   isComplete: (id: string) => boolean;
 *   isLocked: (unit: import("../curriculum.js").CurriculumUnit) => boolean;
 * }} options
 * @returns {string}
 */
export function renderPathMap(curriculum, { currentUnitId, isComplete, isLocked }) {
  const units = [...curriculum.units].sort((a, b) => a.order - b.order);
  const items = units
    .map((unit) => {
      const done = isComplete(unit.id);
      const locked = isLocked(unit);
      const active = unit.id === currentUnitId;
      const stateClass = done
        ? "path-unit--done"
        : locked
          ? "path-unit--locked"
          : active
            ? "path-unit--active"
            : "path-unit--open";
      const status = done
        ? "Erledigt"
        : locked
          ? "Gesperrt"
          : active
            ? "Aktuell"
            : "Verfügbar";
      const typeLabel = TYPE_LABELS[unit.type] ?? unit.type;
      return `<li class="path-unit ${stateClass}" ${
        locked ? 'aria-disabled="true"' : ""
      }>
  <span class="path-unit-type">${escapeHtml(typeLabel)}</span>
  <span class="path-unit-title">${escapeHtml(unit.title)}</span>
  <span class="path-unit-status">${status}</span>
</li>`;
    })
    .join("");

  return `<nav class="path-map" aria-label="Lernpfad">
  <h2 class="path-map-heading">Dein Lernpfad</h2>
  <ol class="path-map-list">${items}</ol>
</nav>`;
}
