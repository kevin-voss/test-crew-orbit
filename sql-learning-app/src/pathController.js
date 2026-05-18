/**
 * @param {import("./curriculum.js").Curriculum} curriculum
 * @param {ReturnType<typeof import("./lessonProgress.js").createLessonProgress>} lessonProgress
 */
export function createPathController(curriculum, lessonProgress) {
  const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
  /** @type {Set<string>} */
  const succeeded = new Set();

  function isUnlocked(unitId) {
    const index = ordered.findIndex((u) => u.id === unitId);
    if (index < 0) return false;
    if (index === 0) return true;
    const prev = ordered[index - 1];
    return succeeded.has(prev.id);
  }

  return {
    isUnlocked,

    recordSuccess(unitId) {
      succeeded.add(unitId);
      const unit = ordered.find((u) => u.id === unitId);
      if (unit?.type === "lesson") {
        lessonProgress.markComplete(unitId);
      }
    },

    markLessonComplete(lessonId) {
      lessonProgress.markComplete(lessonId);
    },

    canStartExercise(exerciseId) {
      const unit = ordered.find((u) => u.id === exerciseId);
      if (!unit || unit.type !== "exercise") return false;
      const ids = unit.lessonIds ?? [];
      return lessonProgress.lessonsComplete(ids);
    },

    tryNavigate(unitId) {
      if (isUnlocked(unitId)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "Diese Einheit ist noch gesperrt. Schließe zuerst die vorherige Einheit ab.",
      };
    },
  };
}
