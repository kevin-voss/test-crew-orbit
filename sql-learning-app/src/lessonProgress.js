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
      const sorted = [...allLessons].sort(
        (a, b) =>
          allLessons.findIndex((l) => l.id === a.id) -
          allLessons.findIndex((l) => l.id === b.id),
      );
      const index = sorted.findIndex((l) => l.id === lesson.id);
      if (index <= 0) return true;
      return completed.has(sorted[index - 1].id);
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
