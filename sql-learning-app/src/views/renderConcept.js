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

/**
 * @param {string} body
 */
function bodyToParagraphs(body) {
  return body
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p class="lesson-body">${escapeHtml(part)}</p>`)
    .join("");
}

/**
 * @param {{ id: string; title: string; body: string }} unit
 * @returns {string}
 */
export function renderConcept(unit) {
  return `<article class="card concept-view" data-unit-id="${escapeHtml(unit.id)}">
  <h2 tabindex="-1">${escapeHtml(unit.title)}</h2>
  ${bodyToParagraphs(unit.body)}
</article>`;
}
