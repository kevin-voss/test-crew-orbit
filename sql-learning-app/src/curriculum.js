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
 * @typedef {{ units: CurriculumUnit[] }} Curriculum
 */

/**
 * @param {string} raw
 * @returns {Curriculum}
 */
export function loadCurriculum(raw) {
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.units)) {
    throw new Error("Invalid curriculum: missing units array");
  }
  return /** @type {Curriculum} */ (data);
}
