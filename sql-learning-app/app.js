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

/** Browser bootstrap when served via index.html (step 01: start view only) */
if (typeof document !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    root.innerHTML = renderStartView();
  }
}
