/**
 * @param {import("./curriculum.js").CurriculumUnit} unit
 * @param {number} defaultThreshold
 */
function passThresholdFor(unit, defaultThreshold) {
  return unit.passThreshold ?? defaultThreshold;
}

/**
 * @param {import("./curriculum.js").Curriculum} curriculum
 * @param {ReturnType<typeof import("./lessonProgress.js").createLessonProgress>} lessonProgress
 */
export function createPathController(curriculum, lessonProgress) {
  const ordered = [...curriculum.units].sort((a, b) => a.order - b.order);
  const defaultThreshold = curriculum.passThreshold ?? 1;
  /** @type {Map<string, number>} */
  const successCounts = new Map();

  /**
   * @param {string} unitId
   */
  function isUnitPassed(unitId) {
    const unit = ordered.find((u) => u.id === unitId);
    if (!unit) return false;
    const threshold = passThresholdFor(unit, defaultThreshold);
    const count = successCounts.get(unitId) ?? 0;
    if (count >= threshold) return true;
    if (unit.type === "lesson" || unit.type === "concept") {
      return lessonProgress.isComplete(unitId);
    }
    return false;
  }

  /**
   * @param {string} unitId
   */
  function isUnlocked(unitId) {
    const index = ordered.findIndex((u) => u.id === unitId);
    if (index < 0) return false;
    if (index === 0) return true;
    return isUnitPassed(ordered[index - 1].id);
  }

  return {
    isUnlocked,
    isUnitPassed,

    /**
     * @param {string} [afterUnitId] — unit just completed; omit to start from the beginning
     */
    getNextUnit(afterUnitId) {
      const startIndex = afterUnitId
        ? ordered.findIndex((u) => u.id === afterUnitId)
        : -1;
      if (afterUnitId && startIndex < 0) return null;
      for (let i = startIndex + 1; i < ordered.length; i++) {
        const candidate = ordered[i];
        if (isUnlocked(candidate.id)) return candidate;
      }
      return null;
    },

    /**
     * @param {string} unitId
     */
    recordSuccess(unitId) {
      const unit = ordered.find((u) => u.id === unitId);
      if (!unit) return;
      successCounts.set(unitId, (successCounts.get(unitId) ?? 0) + 1);
      if (unit.type === "lesson" || unit.type === "concept") {
        lessonProgress.markComplete(unitId);
      }
    },

    /**
     * @param {string} lessonId
     */
    markLessonComplete(lessonId) {
      lessonProgress.markComplete(lessonId);
    },

    /**
     * @param {string} exerciseId
     */
    canStartExercise(exerciseId) {
      const unit = ordered.find((u) => u.id === exerciseId);
      if (!unit || unit.type !== "exercise") return false;
      if (!isUnlocked(exerciseId)) return false;
      const ids = unit.lessonIds ?? [];
      return lessonProgress.lessonsComplete(ids);
    },

    /**
     * @param {string} unitId
     */
    tryNavigate(unitId) {
      if (isUnlocked(unitId)) {
        const unit = ordered.find((u) => u.id === unitId);
        if (unit?.type === "exercise" && !lessonProgress.lessonsComplete(unit.lessonIds ?? [])) {
          return {
            allowed: false,
            reason:
              "Schließe zuerst die verknüpften Lektionen ab, um diese Übung zu starten.",
          };
        }
        return { allowed: true };
      }
      return {
        allowed: false,
        reason:
          "Diese Einheit ist noch gesperrt. Schließe zuerst die vorherige Einheit ab.",
      };
    },
  };
}
