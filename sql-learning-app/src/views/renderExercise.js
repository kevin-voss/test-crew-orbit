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
 * @param {{ title: string; body: string; id: string; options?: Array<{ id: string; label: string }> }} unit
 * @param {"mc" | "match" | "sql"} inputType
 * @returns {string}
 */
export function renderExercise(unit, inputType) {
  const body = `<p class="lesson-body">${escapeHtml(unit.body)}</p>`;

  let inputMarkup = "";
  if (inputType === "sql") {
    inputMarkup = `<p class="locked-hint schema-hint">Tabellen: <code class="inline-code">schueler</code>, <code class="inline-code">kurse</code>, <code class="inline-code">noten</code></p>
<label class="sql-label" for="sql-query">Deine SQL-Abfrage</label>
<textarea id="sql-query" class="sql-input" spellcheck="false" rows="6" aria-label="SQL-Abfrage eingeben"></textarea>
<div class="exercise-actions">
  <button type="button" class="btn btn-secondary" id="btn-run-sql">Ausführen</button>
  <button type="button" class="btn" id="btn-check">Prüfen</button>
</div>`;
  } else {
    const options = (unit.options ?? [])
      .map(
        (opt) => `<li>
  <label>
    <input type="radio" name="exercise-option" value="${escapeHtml(opt.id)}" />
    <span>${escapeHtml(opt.label)}</span>
  </label>
</li>`,
      )
      .join("");
    inputMarkup = `<ul class="options" role="radiogroup" aria-label="Antwort wählen">
${options}
</ul>
<div class="exercise-actions"><button type="button" class="btn" id="btn-check">Prüfen</button></div>`;
  }

  return `<article class="card exercise-view" data-unit-id="${escapeHtml(unit.id)}">
  <h2 tabindex="-1">${escapeHtml(unit.title)}</h2>
  ${body}
  ${inputMarkup}
  <div id="exercise-feedback-region" class="feedback-region" aria-live="polite"></div>
</article>`;
}

/**
 * @param {string} feedback
 * @param {boolean} ok
 * @returns {string}
 */
export function renderExerciseFeedback(feedback, ok) {
  const cls = ok ? "feedback ok" : "feedback err";
  return `<p class="${cls}" role="status">${escapeHtml(feedback)}</p>`;
}
