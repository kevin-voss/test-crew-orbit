import { createPathController } from "./src/pathController.js";
import { createLessonProgress } from "./src/lessonProgress.js";
import { createProgressStore } from "./src/progressStore.js";
import { loadCurriculum } from "./src/curriculum.js";
import { renderConcept } from "./src/views/renderConcept.js";
import { renderLesson } from "./src/views/renderLesson.js";
import { renderPathMap } from "./src/views/renderPathMap.js";
import { renderProgressBar } from "./src/views/renderProgressBar.js";

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
  <p class="start-actions"><button type="button" class="btn" id="btn-start-learning">Lernen starten</button></p>
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

/**
 * @param {import("./src/curriculum.js").Curriculum} curriculum
 */
function getLessons(curriculum) {
  return curriculum.units
    .filter((u) => u.type === "lesson")
    .sort((a, b) => a.order - b.order);
}

/**
 * @param {import("./src/curriculum.js").Curriculum} curriculum
 */
function getOrderedUnits(curriculum) {
  return [...curriculum.units].sort((a, b) => a.order - b.order);
}

/** Browser bootstrap */
if (typeof document !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    bootstrapApp(root);
  }
}

/**
 * @param {HTMLElement} root
 */
async function bootstrapApp(root) {
  /** @type {import("./src/curriculum.js").Curriculum} */
  let curriculum;
  /** @type {ReturnType<typeof createLessonProgress>} */
  let lessonProgress;
  /** @type {ReturnType<typeof createPathController>} */
  let path;
  /** @type {Set<string>} */
  const completedUnits = new Set();
  /** @type {"start" | "concept" | "lesson" | "pathmap"} */
  let screen = "start";
  /** @type {string | null} */
  let activeUnitId = null;

  try {
    const response = await fetch("./data/curriculum.json");
    curriculum = loadCurriculum(await response.text());
  } catch {
    root.innerHTML =
      '<p class="locked-hint">Die Lerninhalte konnten nicht geladen werden. Bitte lade die Seite neu.</p>';
    return;
  }

  lessonProgress = createLessonProgress();
  path = createPathController(curriculum, lessonProgress);
  const lessons = getLessons(curriculum);
  const ordered = getOrderedUnits(curriculum);
  const learnableUnits = ordered.filter(
    (u) => u.type === "concept" || u.type === "lesson",
  );

  function syncLessonProgressFromCompleted() {
    for (const id of completedUnits) {
      const unit = curriculum.units.find((u) => u.id === id);
      if (unit?.type === "lesson") {
        lessonProgress.markComplete(id);
      }
    }
  }

  function markUnitComplete(unitId) {
    completedUnits.add(unitId);
    path.recordSuccess(unitId);
    const unit = curriculum.units.find((u) => u.id === unitId);
    if (unit?.type === "lesson") {
      lessonProgress.markComplete(unitId);
    }
  }

  function isUnitComplete(unitId) {
    return completedUnits.has(unitId);
  }

  function isLessonLocked(lesson) {
    return !lessonProgress.canAccessLesson(lesson, lessons);
  }

  function isPathUnitLocked(unit) {
    if (unit.type === "lesson") {
      return isLessonLocked(unit);
    }
    if (unit.type === "concept") {
      return false;
    }
    return !path.isUnlocked(unit.id);
  }

  function progressMarkup() {
    const total = learnableUnits.length;
    const completed = learnableUnits.filter((u) => isUnitComplete(u.id)).length;
    return renderProgressBar({ completed, total });
  }

  function focusCardHeading() {
    const heading = root.querySelector(".card h2, .start-overview h1");
    if (heading instanceof HTMLElement) {
      heading.focus();
    }
  }

  function renderStart() {
    screen = "start";
    activeUnitId = null;
    root.innerHTML = progressMarkup() + renderStartView();
    root.querySelector("#btn-start-learning")?.addEventListener("click", () => {
      const next = getFirstLearningView(curriculum, {
        completedUnits: [...completedUnits],
      });
      if (next.view === "concept") {
        showConcept(next.unitId);
      } else {
        showLesson(next.unitId);
      }
    });
    focusCardHeading();
  }

  /**
   * @param {string} unitId
   */
  function showConcept(unitId) {
    const unit = curriculum.units.find((u) => u.id === unitId && u.type === "concept");
    if (!unit) return;
    screen = "concept";
    activeUnitId = unit.id;
    const done = isUnitComplete(unit.id);
    const nav = [
      '<button type="button" class="btn btn-secondary" id="btn-back-start">Zurück</button>',
      '<button type="button" class="btn btn-secondary" id="btn-pathmap">Lernpfad</button>',
      done
        ? '<button type="button" class="btn" id="btn-next">Weiter</button>'
        : '<button type="button" class="btn" id="btn-complete-concept">Weiter</button>',
    ];
    root.innerHTML =
      progressMarkup() + renderConcept(unit) + `<div class="unit-nav">${nav.join("")}</div>`;
    bindConceptHandlers(unit);
    focusCardHeading();
  }

  /**
   * @param {import("./src/curriculum.js").CurriculumUnit} unit
   */
  function bindConceptHandlers(unit) {
    root.querySelector("#btn-back-start")?.addEventListener("click", renderStart);
    root.querySelector("#btn-pathmap")?.addEventListener("click", showPathMap);
    const advance = () => {
      if (!isUnitComplete(unit.id)) {
        markUnitComplete(unit.id);
      }
      const firstLesson = lessons[0];
      if (firstLesson) {
        showLesson(firstLesson.id);
      } else {
        showPathMap();
      }
    };
    root.querySelector("#btn-complete-concept")?.addEventListener("click", advance);
    root.querySelector("#btn-next")?.addEventListener("click", advance);
  }

  /**
   * @param {string} unitId
   */
  function showLesson(unitId) {
    const unit = curriculum.units.find((u) => u.id === unitId && u.type === "lesson");
    if (!unit) return;

    const concept = curriculum.units.find((u) => u.type === "concept");
    if (concept && !isUnitComplete(concept.id)) {
      showConcept(concept.id);
      return;
    }

    if (isLessonLocked(unit)) {
      root.innerHTML =
        progressMarkup() +
        `<article class="card"><h2 tabindex="-1">Lektion gesperrt</h2>
<p class="locked-hint">Diese Lektion ist noch gesperrt. Schließe zuerst die vorherige Lektion ab.</p>
<div class="unit-nav">
<button type="button" class="btn btn-secondary" id="btn-pathmap">Zum Lernpfad</button>
</div></article>`;
      root.querySelector("#btn-pathmap")?.addEventListener("click", showPathMap);
      focusCardHeading();
      return;
    }

    screen = "lesson";
    activeUnitId = unit.id;
    const done = isUnitComplete(unit.id);
    const index = lessons.findIndex((l) => l.id === unit.id);
    const prev = index > 0 ? lessons[index - 1] : null;
    const next = index < lessons.length - 1 ? lessons[index + 1] : null;

    const nav = [];
    if (prev) {
      nav.push(
        '<button type="button" class="btn btn-secondary" id="btn-prev">Zurück</button>',
      );
    } else {
      nav.push(
        '<button type="button" class="btn btn-secondary" id="btn-back-concept">Zurück</button>',
      );
    }
    nav.push(
      '<button type="button" class="btn btn-secondary" id="btn-pathmap">Lernpfad</button>',
    );
    if (!done) {
      nav.push(
        '<button type="button" class="btn" id="btn-complete-lesson">Lektion abschließen</button>',
      );
    } else if (next && !isLessonLocked(next)) {
      nav.push('<button type="button" class="btn" id="btn-next">Weiter</button>');
    }

    root.innerHTML =
      progressMarkup() + renderLesson(unit) + `<div class="unit-nav">${nav.join("")}</div>`;

    root.querySelector("#btn-back-concept")?.addEventListener("click", () => {
      if (concept) showConcept(concept.id);
    });
    root.querySelector("#btn-prev")?.addEventListener("click", () => {
      if (prev) showLesson(prev.id);
    });
    root.querySelector("#btn-pathmap")?.addEventListener("click", showPathMap);
    root.querySelector("#btn-complete-lesson")?.addEventListener("click", () => {
      markUnitComplete(unit.id);
      showLesson(unit.id);
    });
    root.querySelector("#btn-next")?.addEventListener("click", () => {
      if (next) showLesson(next.id);
    });
    focusCardHeading();
  }

  function showPathMap() {
    screen = "pathmap";
    const map = renderPathMap(curriculum, {
      currentUnitId: activeUnitId ?? undefined,
      isComplete: isUnitComplete,
      isLocked: isPathUnitLocked,
    });
    root.innerHTML =
      progressMarkup() +
      map +
      `<div class="unit-nav">
<button type="button" class="btn btn-secondary" id="btn-back-learning">Zurück zum Lernen</button>
</div>`;

    root.querySelectorAll(".path-unit").forEach((el, index) => {
      const unit = ordered[index];
      if (!unit || isPathUnitLocked(unit)) return;
      el.classList.add("path-unit--clickable");
      el.addEventListener("click", () => {
        if (unit.type === "concept") showConcept(unit.id);
        else if (unit.type === "lesson") showLesson(unit.id);
      });
    });

    root.querySelector("#btn-back-learning")?.addEventListener("click", () => {
      const next = getFirstLearningView(curriculum, {
        completedUnits: [...completedUnits],
      });
      if (next.view === "concept") showConcept(next.unitId);
      else showLesson(next.unitId);
    });
    focusCardHeading();
  }

  syncLessonProgressFromCompleted();
  renderStart();
}
