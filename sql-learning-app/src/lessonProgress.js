/**
 * @returns {{
 *   canAccessLesson: (lesson: { id: string }, allLessons: { id: string }[]) => boolean;
 *   markComplete: (lessonId: string) => void;
 *   isComplete: (lessonId: string) => boolean;
 *   getCompletedIds: () => string[];
 *   lessonsComplete: (ids: string[]) => boolean;
 * }}
 */
export function createLessonProgress() {
  /** @type {Set<string>} */
  const completed = new Set();

  return {
    canAccessLesson(lesson, allLessons) {
      const prior = allLessons.filter((l) => l.order < lesson.order);
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
  };
}
