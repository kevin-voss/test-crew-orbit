import { createPathController } from "./src/pathController.js";
import { createLessonProgress } from "./src/lessonProgress.js";
import { createProgressStore, STORAGE_KEY } from "./src/progressStore.js";
import { loadCurriculum } from "./src/curriculum.js";
import { renderConcept } from "./src/views/renderConcept.js";
import { renderLesson } from "./src/views/renderLesson.js";
import { renderPathMap } from "./src/views/renderPathMap.js";
import { renderProgressBar } from "./src/views/renderProgressBar.js";
import {
  renderExercise,
  renderExerciseFeedback,
} from "./src/views/renderExercise.js";
import {
  gradeExercise,
  gradeSqlExerciseAsync,
  getExerciseInputType,
} from "./src/exerciseEngine.js";

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

export const PERSISTENCE_HINT_KEY = "sql-lern-app-hint-dismissed-v1";

export function renderPersistenceHint() {
  return `<aside class="storage-banner" role="note">
  <p>Dein Fortschritt wird nur auf diesem Gerät gespeichert — kein Konto nötig. Wenn du Browserdaten löschst, startest du von vorn.</p>
  <button type="button" class="btn btn-secondary storage-banner__dismiss" id="btn-dismiss-storage-hint">Verstanden</button>
</aside>`;
}

export function renderStorageCorruptNotice() {
  return `<p class="storage-banner storage-banner--warn" role="alert">Dein gespeicherter Fortschritt konnte nicht gelesen werden und wurde zurückgesetzt.</p>`;
}

export function renderStorageQuotaWarning() {
  return `<p class="storage-banner storage-banner--warn" role="alert">Der Fortschritt konnte nicht gespeichert werden. Du kannst weiterlernen, aber nach dem Schließen des Tabs gehen Änderungen verloren.</p>`;
}

/**
 * @param {import("./src/curriculum.js").Curriculum} curriculum
 * @param {Iterable<string>} completedUnitIds
 */
export function isPathComplete(curriculum, completedUnitIds) {
  const completed = new Set(completedUnitIds);
  const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
  return ordered.length > 0 && ordered.every((u) => completed.has(u.id));
}

export function renderCompletionView() {
  return `<section class="completion-view card" aria-label="Lernpfad abgeschlossen">
  <h2 tabindex="-1">Geschafft!</h2>
  <p>Du hast den gesamten SQL-Basics-Lernpfad durchlaufen. Du kennst jetzt Konzept, Grundlagen und Übungen von leicht bis schwer.</p>
  <p>Du kannst jede Einheit im Lernpfad erneut öffnen, um Inhalte zu wiederholen — dein Fortschritt bleibt gespeichert.</p>
</section>`;
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
/**
 * @param {ReturnType<typeof createPathController>} path
 * @param {import("./src/curriculum.js").Curriculum} curriculum
 * @param {string | undefined} lastUnitId
 */
export function resolveResumeUnitId(path, curriculum, lastUnitId) {
  const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
  const targetId = lastUnitId ?? ordered[0]?.id ?? "";
  if (path.isUnlocked(targetId)) {
    return { unitId: targetId, locked: false };
  }
  const fallback = ordered.find((u) => path.isUnlocked(u.id));
  return {
    unitId: fallback?.id ?? ordered[0]?.id ?? "",
    locked: true,
  };
}

export function resumeFromStorage(curriculum, storage) {
  const saved = createProgressStore(storage).load();
  const lessonProgress = createLessonProgress();
  const path = createPathController(curriculum, lessonProgress);

  if (saved?.completedUnits?.length) {
    path.hydratePassed(saved.completedUnits);
  }

  return resolveResumeUnitId(path, curriculum, saved?.lastUnitId);
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
  /** @type {"start" | "concept" | "lesson" | "exercise" | "pathmap"} */
  let screen = "start";
  /** @type {Awaited<ReturnType<typeof import("./src/sqlRunner.js").createSqlRunner>> | null} */
  let sqlRunner = null;
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

  const browserStorage =
    typeof localStorage !== "undefined" ? localStorage : null;
  const progressStore = browserStorage
    ? createProgressStore(browserStorage)
    : null;
  const rawProgress = browserStorage?.getItem(STORAGE_KEY) ?? null;
  const savedProgress = progressStore?.load() ?? null;
  const storageCorrupt = Boolean(rawProgress && !savedProgress);

  lessonProgress = createLessonProgress();
  path = createPathController(curriculum, lessonProgress);
  const lessons = getLessons(curriculum);
  const ordered = getOrderedUnits(curriculum);
  const learnableUnits = ordered.filter(
    (u) => u.type === "concept" || u.type === "lesson",
  );

  /** @type {string} */
  let lastUnitId = savedProgress?.lastUnitId ?? "";
  let storageQuotaWarning = false;
  let persistenceHintHtml = "";

  if (savedProgress?.completedUnits?.length) {
    for (const id of savedProgress.completedUnits) {
      completedUnits.add(id);
    }
    path.hydratePassed(savedProgress.completedUnits);
  }

  if (storageCorrupt) {
    persistenceHintHtml = renderStorageCorruptNotice();
  } else if (
    browserStorage &&
    !savedProgress &&
    browserStorage.getItem(PERSISTENCE_HINT_KEY) !== "1"
  ) {
    persistenceHintHtml = renderPersistenceHint();
  }

  function persistProgress() {
    if (!progressStore) return;
    const result = progressStore.save({
      version: 1,
      completedUnits: [...completedUnits],
      lastUnitId: activeUnitId ?? lastUnitId,
    });
    if (!result.ok) {
      storageQuotaWarning = true;
    } else {
      storageQuotaWarning = false;
    }
    lastUnitId = activeUnitId ?? lastUnitId;
  }

  function storageBannerMarkup() {
    const parts = [];
    if (persistenceHintHtml) parts.push(persistenceHintHtml);
    if (storageQuotaWarning) parts.push(renderStorageQuotaWarning());
    return parts.join("");
  }

  function bindStorageBanner() {
    root
      .querySelector("#btn-dismiss-storage-hint")
      ?.addEventListener("click", () => {
        browserStorage?.setItem(PERSISTENCE_HINT_KEY, "1");
        persistenceHintHtml = "";
        root.querySelectorAll(".storage-banner").forEach((el) => el.remove());
      });
  }

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
    persistProgress();
  }

  function isUnitComplete(unitId) {
    return completedUnits.has(unitId);
  }

  function isLessonLocked(lesson) {
    return !lessonProgress.canAccessLesson(lesson, lessons);
  }

  function isPathUnitLocked(unit) {
    if (!path.isUnlocked(unit.id)) return true;
    if (unit.type === "exercise") {
      return !path.canStartExercise(unit.id);
    }
    if (unit.type === "lesson") {
      return isLessonLocked(unit);
    }
    return false;
  }

  /**
   * @param {string} unitId
   * @returns {boolean}
   */
  function guardNavigation(unitId) {
    const nav = path.tryNavigate(unitId);
    if (nav.allowed) return true;
    root.innerHTML =
      pageMarkup(`<article class="card"><h2 tabindex="-1">Einheit gesperrt</h2>
<p class="locked-hint">${nav.reason ?? "Diese Einheit ist noch nicht verfügbar."}</p>
<div class="unit-nav">
<button type="button" class="btn btn-secondary" id="btn-pathmap">Zum Lernpfad</button>
</div></article>`);
    root.querySelector("#btn-pathmap")?.addEventListener("click", showPathMap);
    bindStorageBanner();
    focusCardHeading();
    return false;
  }

  async function ensureSqlRunner() {
    if (sqlRunner) return sqlRunner;
    const response = await fetch("./data/seed.sql");
    const seedSql = await response.text();
    const { createSqlRunner } = await import("./src/sqlRunner.js");
    sqlRunner = await createSqlRunner({ seedSql });
    return sqlRunner;
  }

  function exerciseGradingContext() {
    return {
      lessonsComplete: (ids) => lessonProgress.lessonsComplete(ids),
      path,
    };
  }

  function progressMarkup() {
    const total = learnableUnits.length;
    const completed = learnableUnits.filter((u) => isUnitComplete(u.id)).length;
    return renderProgressBar({ completed, total });
  }

  function pageMarkup(body) {
    return storageBannerMarkup() + progressMarkup() + body;
  }

  function trackActiveUnit(unitId) {
    activeUnitId = unitId;
    lastUnitId = unitId;
    persistProgress();
  }

  function focusCardHeading() {
    const heading = root.querySelector(
      ".card h2, .start-overview h1, .completion-view h2",
    );
    if (heading instanceof HTMLElement) {
      heading.focus();
    }
  }

  function showCompletion() {
    screen = "complete";
    activeUnitId = null;
    root.innerHTML =
      pageMarkup(
        renderCompletionView() +
          `<div class="unit-nav">
<button type="button" class="btn btn-secondary" id="btn-pathmap">Lernpfad ansehen</button>
<button type="button" class="btn" id="btn-back-start">Zur Startseite</button>
</div>`,
      );
    root.querySelector("#btn-pathmap")?.addEventListener("click", showPathMap);
    root.querySelector("#btn-back-start")?.addEventListener("click", renderStart);
    bindStorageBanner();
    focusCardHeading();
  }

  /**
   * @param {string} unitId
   */
  function advanceAfterUnit(unitId) {
    if (isPathComplete(curriculum, completedUnits)) {
      showCompletion();
      return;
    }
    const index = ordered.findIndex((u) => u.id === unitId);
    const next = ordered[index + 1];
    if (next?.type === "lesson" && !isLessonLocked(next)) {
      showLesson(next.id);
    } else if (next?.type === "exercise" && !isPathUnitLocked(next)) {
      showExercise(next.id);
    } else {
      showPathMap();
    }
  }

  function renderStart() {
    screen = "start";
    activeUnitId = null;
    root.innerHTML = pageMarkup(renderStartView());
    bindStorageBanner();
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
    if (!guardNavigation(unitId)) return;
    screen = "concept";
    trackActiveUnit(unit.id);
    const done = isUnitComplete(unit.id);
    const nav = [
      '<button type="button" class="btn btn-secondary" id="btn-back-start">Zurück</button>',
      '<button type="button" class="btn btn-secondary" id="btn-pathmap">Lernpfad</button>',
      done
        ? '<button type="button" class="btn" id="btn-next">Weiter</button>'
        : '<button type="button" class="btn" id="btn-complete-concept">Weiter</button>',
    ];
    root.innerHTML = pageMarkup(
      renderConcept(unit) + `<div class="unit-nav">${nav.join("")}</div>`,
    );
    bindConceptHandlers(unit);
    bindStorageBanner();
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

    if (!guardNavigation(unitId)) return;

    if (isLessonLocked(unit)) {
      root.innerHTML = pageMarkup(`<article class="card"><h2 tabindex="-1">Lektion gesperrt</h2>
<p class="locked-hint">Diese Lektion ist noch gesperrt. Schließe zuerst die vorherige Lektion ab.</p>
<div class="unit-nav">
<button type="button" class="btn btn-secondary" id="btn-pathmap">Zum Lernpfad</button>
</div></article>`);
      root.querySelector("#btn-pathmap")?.addEventListener("click", showPathMap);
      bindStorageBanner();
      focusCardHeading();
      return;
    }

    screen = "lesson";
    trackActiveUnit(unit.id);
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

    root.innerHTML = pageMarkup(
      renderLesson(unit) + `<div class="unit-nav">${nav.join("")}</div>`,
    );

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
    bindStorageBanner();
    focusCardHeading();
  }

  /**
   * @param {string} unitId
   */
  function showExercise(unitId) {
    const unit = curriculum.units.find((u) => u.id === unitId && u.type === "exercise");
    if (!unit) return;
    if (!guardNavigation(unitId)) return;

    screen = "exercise";
    trackActiveUnit(unit.id);
    const inputType = getExerciseInputType(unit);
    let canContinue = isUnitComplete(unit.id);

    function paintExerciseView(feedbackHtml = "") {
      const nav = [
        '<button type="button" class="btn btn-secondary" id="btn-pathmap">Lernpfad</button>',
      ];
      if (canContinue) {
        nav.push('<button type="button" class="btn" id="btn-next">Weiter</button>');
      }

      root.innerHTML = pageMarkup(
        renderExercise(unit, inputType) + `<div class="unit-nav">${nav.join("")}</div>`,
      );

      const feedbackRegion = root.querySelector("#exercise-feedback-region");
      if (feedbackHtml && feedbackRegion) {
        feedbackRegion.innerHTML = feedbackHtml;
      }

      root.querySelector("#btn-pathmap")?.addEventListener("click", showPathMap);
      root.querySelector("#btn-next")?.addEventListener("click", () => {
        if (!isUnitComplete(unit.id)) {
          markUnitComplete(unit.id);
        }
        advanceAfterUnit(unit.id);
      });

      root.querySelector("#btn-check")?.addEventListener("click", () => {
        void submitExercise();
      });

      root.querySelector("#btn-run-sql")?.addEventListener("click", () => {
        void runSqlPreview();
      });

      bindStorageBanner();
      focusCardHeading();
    }

    async function runSqlPreview() {
      const textarea = root.querySelector("#sql-query");
      if (!(textarea instanceof HTMLTextAreaElement)) return;
      const runner = await ensureSqlRunner();
      const result = await runner.runQuery(textarea.value);
      const region = root.querySelector("#exercise-feedback-region");
      if (!region) return;
      if (!result.ok) {
        region.innerHTML = renderExerciseFeedback(
          result.error ?? "Die Abfrage konnte nicht ausgeführt werden.",
          false,
        );
        return;
      }
      const preview = result.rows
        .slice(0, 5)
        .map((row) => JSON.stringify(row))
        .join("<br>");
      region.innerHTML = `<p class="feedback ok" role="status">Vorschau (${result.rows.length} Zeile(n)):<br>${preview}</p>`;
    }

    async function submitExercise() {
      const ctx = exerciseGradingContext();
      let result;

      if (inputType === "sql") {
        const textarea = root.querySelector("#sql-query");
        const sql = textarea instanceof HTMLTextAreaElement ? textarea.value : "";
        const runner = await ensureSqlRunner();
        result = await gradeSqlExerciseAsync(
          unit,
          { sql },
          {
            ...ctx,
            runSql: (query) => runner.runQuery(query),
          },
        );
      } else {
        const selected = root.querySelector('input[name="exercise-option"]:checked');
        const optionId =
          selected instanceof HTMLInputElement ? selected.value : undefined;
        result = gradeExercise(unit, { optionId }, ctx);
      }

      if (result.blocked) {
        paintExerciseView(
          renderExerciseFeedback(result.message ?? "Übung gesperrt.", false),
        );
        return;
      }

      const feedbackHtml = renderExerciseFeedback(
        result.feedback ?? "",
        Boolean(result.ok),
      );
      if (result.ok) {
        canContinue = true;
      }
      paintExerciseView(feedbackHtml);
    }

    paintExerciseView();
  }

  function showPathMap() {
    screen = "pathmap";
    const map = renderPathMap(curriculum, {
      currentUnitId: activeUnitId ?? undefined,
      isComplete: isUnitComplete,
      isLocked: isPathUnitLocked,
    });
    root.innerHTML = pageMarkup(
      map +
        `<div class="unit-nav">
<button type="button" class="btn btn-secondary" id="btn-back-learning">Zurück zum Lernen</button>
</div>`,
    );

    root.querySelectorAll(".path-unit").forEach((el, index) => {
      const unit = ordered[index];
      if (!unit || isPathUnitLocked(unit)) return;
      el.classList.add("path-unit--clickable");
      el.addEventListener("click", () => {
        if (unit.type === "concept") showConcept(unit.id);
        else if (unit.type === "lesson") showLesson(unit.id);
        else if (unit.type === "exercise") showExercise(unit.id);
      });
    });

    root.querySelector("#btn-back-learning")?.addEventListener("click", () => {
      const next = getFirstLearningView(curriculum, {
        completedUnits: [...completedUnits],
      });
      if (next.view === "concept") showConcept(next.unitId);
      else showLesson(next.unitId);
    });
    bindStorageBanner();
    persistProgress();
    focusCardHeading();
  }

  /**
   * @param {string} unitId
   */
  function openResumeUnit(unitId) {
    const unit = curriculum.units.find((u) => u.id === unitId);
    if (!unit || !path.isUnlocked(unitId)) {
      renderStart();
      return;
    }
    if (unit.type === "concept") showConcept(unitId);
    else if (unit.type === "lesson") showLesson(unitId);
    else if (unit.type === "exercise") showExercise(unitId);
    else showPathMap();
  }

  syncLessonProgressFromCompleted();

  if (isPathComplete(curriculum, completedUnits)) {
    showCompletion();
  } else if (savedProgress?.lastUnitId) {
    const resume = resolveResumeUnitId(path, curriculum, savedProgress.lastUnitId);
    openResumeUnit(resume.unitId);
  } else {
    renderStart();
  }
}
