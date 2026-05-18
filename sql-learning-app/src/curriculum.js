import { CATALOG_TOPIC_IDS } from "./catalogTopics.js";

/**
 * @typedef {"concept" | "lesson" | "exercise"} UnitType
 * @typedef {"mc" | "match" | "sql"} ExerciseFormat
 *
 * @typedef {object} CurriculumUnit
 * @property {string} id
 * @property {UnitType} type
 * @property {number} order
 * @property {string} title
 * @property {string} body
 * @property {string} [topicId]
 * @property {number} [difficulty]
 * @property {ExerciseFormat} [format]
 * @property {string[]} [lessonIds]
 * @property {string} [correctOptionId]
 * @property {Array<{ id: string; label: string }>} [options]
 * @property {string} [feedbackWrong]
 * @property {string} [feedbackCorrect]
 * @property {string} [expectedSql]
 *
 * @typedef {{ passThreshold?: number; units: CurriculumUnit[] }} Curriculum
 */

const UNIT_TYPES = new Set(["concept", "lesson", "exercise"]);
const EXERCISE_FORMATS = new Set(["mc", "match", "sql"]);

/**
 * @param {unknown} data
 * @returns {void}
 */
export function validateCurriculum(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.units)) {
    throw new Error("Invalid curriculum: missing units array");
  }

  const { units } = data;
  if (units.length === 0) {
    throw new Error("Invalid curriculum: units array is empty");
  }

  const ids = new Set();
  const lessonIds = new Set();

  for (const unit of units) {
    if (!unit || typeof unit !== "object") {
      throw new Error("Invalid curriculum: unit must be an object");
    }
    if (typeof unit.id !== "string" || !unit.id) {
      throw new Error("Invalid curriculum: each unit needs a non-empty id");
    }
    if (ids.has(unit.id)) {
      throw new Error(`Invalid curriculum: duplicate unit id "${unit.id}"`);
    }
    ids.add(unit.id);

    if (!UNIT_TYPES.has(unit.type)) {
      throw new Error(`Invalid curriculum: unknown unit type for "${unit.id}"`);
    }
    if (typeof unit.order !== "number" || !Number.isFinite(unit.order)) {
      throw new Error(`Invalid curriculum: unit "${unit.id}" needs numeric order`);
    }
    if (typeof unit.title !== "string" || typeof unit.body !== "string") {
      throw new Error(`Invalid curriculum: unit "${unit.id}" needs title and body`);
    }

    if (unit.type === "concept") {
      continue;
    }

    if (typeof unit.topicId !== "string" || !unit.topicId) {
      throw new Error(`Invalid curriculum: unit "${unit.id}" needs topicId`);
    }

    if (unit.type === "lesson") {
      lessonIds.add(unit.id);
      continue;
    }

    if (unit.type === "exercise") {
      if (typeof unit.difficulty !== "number" || unit.difficulty < 1) {
        throw new Error(
          `Invalid curriculum: exercise "${unit.id}" needs difficulty >= 1`,
        );
      }
      if (!EXERCISE_FORMATS.has(unit.format)) {
        throw new Error(
          `Invalid curriculum: exercise "${unit.id}" needs format mc, match, or sql`,
        );
      }
      if (!Array.isArray(unit.lessonIds) || unit.lessonIds.length === 0) {
        throw new Error(
          `Invalid curriculum: exercise "${unit.id}" needs non-empty lessonIds`,
        );
      }
      for (const lessonId of unit.lessonIds) {
        if (typeof lessonId !== "string" || !lessonId) {
          throw new Error(
            `Invalid curriculum: exercise "${unit.id}" has invalid lessonId reference`,
          );
        }
      }
    }
  }

  for (const unit of units) {
    if (unit.type !== "exercise") {
      continue;
    }
    for (const lessonId of unit.lessonIds) {
      if (!lessonIds.has(lessonId)) {
        throw new Error(
          `Invalid curriculum: exercise "${unit.id}" references unknown lesson "${lessonId}"`,
        );
      }
    }
  }

  const topicIdsInCurriculum = new Set(
    units
      .filter((u) => u.type === "lesson" || u.type === "exercise")
      .map((u) => u.topicId),
  );
  for (const topicId of CATALOG_TOPIC_IDS) {
    if (!topicIdsInCurriculum.has(topicId)) {
      throw new Error(`Invalid curriculum: missing catalog topic "${topicId}"`);
    }
  }

  for (const topicId of CATALOG_TOPIC_IDS) {
    const lessons = units.filter((u) => u.type === "lesson" && u.topicId === topicId);
    if (lessons.length < 1) {
      throw new Error(
        `Invalid curriculum: catalog topic "${topicId}" has no lesson`,
      );
    }
  }

  const exercises = units
    .filter((u) => u.type === "exercise")
    .sort((a, b) => a.order - b.order);
  let prevDifficulty = 0;
  for (const ex of exercises) {
    if (ex.difficulty < prevDifficulty) {
      throw new Error(
        `Invalid curriculum: exercise difficulty decreases at order ${ex.order}`,
      );
    }
    prevDifficulty = ex.difficulty;
  }

  const conceptUnits = units.filter((u) => u.type === "concept");
  if (conceptUnits.length === 0) {
    throw new Error("Invalid curriculum: missing concept unit");
  }
}

/**
 * @param {string | Curriculum} json
 * @returns {Readonly<Curriculum>}
 */
export function loadCurriculum(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  validateCurriculum(data);
  return Object.freeze(data);
}
