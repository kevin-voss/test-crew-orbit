import { createPathController } from "./src/pathController.js";
import { createLessonProgress } from "./src/lessonProgress.js";
import { createProgressStore } from "./src/progressStore.js";

/**
 * @param {import("./src/curriculum.js").Curriculum} curriculum
 * @param {{ completedUnits: string[] }} state
 */
export function getFirstLearningView(curriculum, state) {
  const completed = new Set(state.completedUnits ?? []);
  const concept = curriculum.units.find((u) => u.type === "concept");

  if (!concept || !completed.has(concept.id)) {
    return { view: "concept", unitId: concept?.id ?? "" };
  }

  const firstLesson = [...curriculum.units]
    .filter((u) => u.type === "lesson")
    .sort((a, b) => a.order - b.order)[0];

  return { view: "lesson", unitId: firstLesson?.id ?? "" };
}

export function renderStartView() {
  return `<section class="start-overview" aria-label="Lernpfad">
  <h1>Willkommen zur SQL-Lern-App</h1>
  <p>Lerne SQL von Grund auf – ohne Vorkenntnisse, Schritt für Schritt.</p>
  <ol class="path-phases">
    <li><strong>1. Konzept</strong> – Was ist SQL und wofür nutzt man es?</li>
    <li><strong>2. Grundlagen</strong> – SQL-Basics mit der Schul-Datenbank</li>
    <li><strong>3. Übungen</strong> – Wissen anwenden, von leicht bis schwer</li>
  </ol>
</section>`;
}

/**
 * @param {import("./src/curriculum.js").Curriculum} curriculum
 * @param {{ getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }} storage
 */
export function resumeFromStorage(curriculum, storage) {
  const saved = createProgressStore(storage).load();
  const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
  const lessonProgress = createLessonProgress();
  const path = createPathController(curriculum, lessonProgress);

  if (saved?.completedUnits) {
    for (const id of saved.completedUnits) {
      path.recordSuccess(id);
    }
  }

  const targetId = saved?.lastUnitId ?? ordered[0]?.id ?? "";
  const unlocked = path.isUnlocked(targetId);

  if (unlocked) {
    return { unitId: targetId, locked: false };
  }

  const fallback = ordered.find((u) => path.isUnlocked(u.id));
  return {
    unitId: fallback?.id ?? ordered[0]?.id ?? "",
    locked: true,
  };
}

/** Browser bootstrap when served via index.html */
if (typeof document !== "undefined" && document.getElementById("app")) {
  const { loadCurriculum } = await import("./src/curriculum.js");
  const { createPathController } = await import("./src/pathController.js");
  const { createLessonProgress } = await import("./src/lessonProgress.js");
  const { createProgressStore } = await import("./src/progressStore.js");
  const { gradeExercise } = await import("./src/exerciseEngine.js");
  const { renderProgressBar } = await import("./src/views/renderProgressBar.js");
  const { createSqlRunner } = await import("./src/sqlRunner.js");

  const storage =
    typeof localStorage !== "undefined"
      ? localStorage
      : { getItem: () => null, setItem: () => {} };

  const curriculumRes = await fetch("./data/curriculum.json");
  const curriculum = loadCurriculum(await curriculumRes.text());
  const seedRes = await fetch("./data/seed.sql");
  const sqlRunner = await createSqlRunner({ seedSql: await seedRes.text() });
  const progress = createProgressStore(storage);
  const lessonProgress = createLessonProgress();
  const path = createPathController(curriculum, lessonProgress);

  const saved = progress.load();
  const completed = new Set(saved?.completedUnits ?? []);
  let currentId =
    saved?.lastUnitId ??
    getFirstLearningView(curriculum, { completedUnits: [...completed] }).unitId;

  const root = document.getElementById("app");
  if (!root) throw new Error("App root missing");

  function persist() {
    progress.save({
      version: 1,
      completedUnits: [...completed],
      lastUnitId: currentId,
    });
  }

  function render() {
    const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
    const unit = ordered.find((u) => u.id === currentId) ?? ordered[0];
    const completedCount = completed.size;

    let body = renderProgressBar({
      completed: completedCount,
      total: ordered.length,
    });
    body += renderStartView();

    if (!unit) {
      root.innerHTML = body;
      return;
    }

    body += `<article class="card" data-unit="${unit.id}">
      <h2>${escapeHtml(unit.title)}</h2>
      <p>${escapeHtml(unit.body)}</p>`;

    if (unit.type === "exercise") {
      body += renderExercise(unit);
    }

    body += `<div class="unit-nav">
      <button type="button" class="btn" id="btn-complete">Weiter</button>
    </div></article>`;

    root.innerHTML = body;
    wireExerciseHandlers(unit);
    document.getElementById("btn-complete")?.addEventListener("click", onComplete);
  }

  function renderExercise(unit) {
    if (unit.format === "sql") {
      return `<label for="sql-answer">Deine SQL-Abfrage</label>
        <textarea id="sql-answer" class="sql-input" spellcheck="false"></textarea>
        <button type="button" class="btn" id="btn-check">Prüfen</button>
        <div id="exercise-feedback" class="feedback" hidden></div>`;
    }
    const options = (unit.options ?? [])
      .map(
        (o) =>
          `<li><label><input type="radio" name="mc" value="${escapeHtml(o.id)}" /> ${escapeHtml(o.label)}</label></li>`,
      )
      .join("");
    return `<ul class="options">${options}</ul>
      <button type="button" class="btn" id="btn-check">Prüfen</button>
      <div id="exercise-feedback" class="feedback" hidden></div>`;
  }

  function wireExerciseHandlers(unit) {
    document.getElementById("btn-check")?.addEventListener("click", () => {
      const feedbackEl = document.getElementById("exercise-feedback");
      if (!feedbackEl) return;
      const answer =
        unit.format === "sql"
          ? { sql: document.getElementById("sql-answer")?.value ?? "" }
          : {
              optionId:
                document.querySelector('input[name="mc"]:checked')?.value ?? "",
            };
      const result = gradeExercise(unit, answer, {
        lessonsComplete: (ids) => lessonProgress.lessonsComplete(ids),
      });
      feedbackEl.hidden = false;
      feedbackEl.textContent = result.feedback ?? result.message ?? "";
      feedbackEl.className = `feedback ${result.ok ? "ok" : "err"}`;
      if (result.ok) completed.add(unit.id);
    });
  }

  function onComplete() {
    const unit = curriculum.units.find((u) => u.id === currentId);
    if (!unit) return;
    if (unit.type === "lesson") lessonProgress.markComplete(unit.id);
    if (unit.type !== "exercise") {
      completed.add(unit.id);
      path.recordSuccess(unit.id);
    }
    const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((u) => u.id === currentId);
    const next = ordered[idx + 1];
    if (next && path.tryNavigate(next.id).allowed) {
      currentId = next.id;
      persist();
      render();
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  render();
}
