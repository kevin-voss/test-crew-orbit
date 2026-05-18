/**
 * @param {string[]} [initialCompleted]
 * @returns {{
 *   canAccessLesson: (lesson: { id: string; order?: number }, allLessons: { id: string; order?: number }[]) => boolean;
 *   markComplete: (lessonId: string) => void;
 *   isComplete: (lessonId: string) => boolean;
 *   getCompletedIds: () => string[];
 *   lessonsComplete: (ids: string[]) => boolean;
 *   hydrate: (ids: string[]) => void;
 * }}
 */
export function createLessonProgress(initialCompleted = []) {
  /** @type {Set<string>} */
  const completed = new Set(initialCompleted);

  return {
    canAccessLesson(lesson, allLessons) {
      const lessonOrder = lesson.order ?? 0;
      const prior = allLessons.filter((l) => (l.order ?? 0) < lessonOrder);
      return prior.every((l) => completed.has(l.id));
    },

    markComplete(lessonId) {
      completed.add(lessonId);
    },

    isComplete(lessonId) {
      return completed.has(lessonId);
    },

    getCompletedIds() {
      return [...completed];
    },

    lessonsComplete(ids) {
      return ids.every((id) => completed.has(id));
    },

    hydrate(ids) {
      for (const id of ids) {
        completed.add(id);
      }
    },
  };
}
