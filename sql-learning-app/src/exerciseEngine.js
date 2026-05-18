/**
 * @param {import("./curriculum.js").CurriculumUnit} exercise
 * @returns {"mc" | "match" | "sql"}
 */
export function getExerciseInputType(exercise) {
  const difficulty = exercise.difficulty ?? 1;
  if (difficulty <= 2) {
    return exercise.format === "match" ? "match" : "mc";
  }
  if (exercise.format === "sql") return "sql";
  if (exercise.format === "match") return "match";
  return "mc";
}

/**
 * @param {unknown[] | undefined} rows
 */
export function normalizeResultRows(rows) {
  if (!Array.isArray(rows)) return [];
  const normalized = rows.map((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k.toLowerCase(),
          typeof v === "string" ? v.trim() : v,
        ]),
      );
    }
    return row;
  });
  return normalized.sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  );
}

/**
 * @param {unknown[] | undefined} a
 * @param {unknown[] | undefined} b
 */
export function resultSetsEqual(a, b) {
  return (
    JSON.stringify(normalizeResultRows(a)) ===
    JSON.stringify(normalizeResultRows(b))
  );
}

/**
 * @param {import("./curriculum.js").CurriculumUnit} exercise
 * @param {ReturnType<typeof import("./pathController.js").createPathController>} path
 */
export function isExerciseBlockedByPath(exercise, path) {
  if (!path.isUnlocked(exercise.id)) {
    return {
      blocked: true,
      message:
        "Diese Übung ist noch gesperrt. Schließe zuerst die vorherige Einheit ab.",
    };
  }
  if (!path.canStartExercise(exercise.id)) {
    return {
      blocked: true,
      message: "Schließe zuerst die verknüpften Lektionen ab.",
    };
  }
  return null;
}

/**
 * @param {import("./curriculum.js").CurriculumUnit} exercise
 * @param {{ optionId?: string; sql?: string }} answer
 * @param {{
 *   lessonsComplete: (ids: string[]) => boolean;
 *   path?: ReturnType<typeof import("./pathController.js").createPathController>;
 *   runSql?: (sql: string) => Promise<{ ok: boolean; rows?: unknown[] }>;
 * }} ctx
 */
export function gradeExercise(exercise, answer, ctx) {
  if (ctx.path) {
    const pathBlock = isExerciseBlockedByPath(exercise, ctx.path);
    if (pathBlock) {
      return { ok: false, blocked: true, message: pathBlock.message };
    }
  }

  const lessonIds = exercise.lessonIds ?? [];
  if (!ctx.lessonsComplete(lessonIds)) {
    return {
      ok: false,
      blocked: true,
      message: "Schließe zuerst die verknüpften Lektionen ab.",
    };
  }

  const inputType = getExerciseInputType(exercise);

  if (inputType === "sql") {
    return gradeSqlExerciseSync(exercise, answer);
  }

  const correct = answer.optionId === exercise.correctOptionId;
  if (correct) {
    return {
      ok: true,
      feedback: exercise.feedbackCorrect,
      canContinue: true,
    };
  }

  return {
    ok: false,
    feedback: exercise.feedbackWrong,
  };
}

/**
 * @param {import("./curriculum.js").CurriculumUnit} exercise
 * @param {{ sql?: string }} answer
 */
function gradeSqlExerciseSync(exercise, answer) {
  if (!answer.sql?.trim()) {
    return { ok: false, feedback: exercise.feedbackWrong };
  }

  const normalized = answer.sql.trim().replace(/\s+/g, " ").toLowerCase();
  const expected = (exercise.expectedSql ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (normalized === expected) {
    return {
      ok: true,
      feedback: exercise.feedbackCorrect,
      canContinue: true,
    };
  }

  return { ok: false, feedback: exercise.feedbackWrong };
}

/**
 * @param {import("./curriculum.js").CurriculumUnit} exercise
 * @param {{ sql?: string }} answer
 * @param {{
 *   lessonsComplete: (ids: string[]) => boolean;
 *   runSql?: (sql: string) => Promise<{ ok: boolean; rows?: unknown[] }>;
 * }} ctx
 */
export async function gradeSqlExerciseAsync(exercise, answer, ctx) {
  if (ctx.path) {
    const pathBlock = isExerciseBlockedByPath(exercise, ctx.path);
    if (pathBlock) {
      return { ok: false, blocked: true, message: pathBlock.message };
    }
  }

  const lessonIds = exercise.lessonIds ?? [];
  if (!ctx.lessonsComplete(lessonIds)) {
    return {
      ok: false,
      blocked: true,
      message: "Schließe zuerst die verknüpften Lektionen ab.",
    };
  }

  if (!ctx.runSql || !answer.sql?.trim()) {
    return { ok: false, feedback: exercise.feedbackWrong };
  }

  const learner = await ctx.runSql(answer.sql.trim());
  if (!learner.ok) {
    return { ok: false, feedback: exercise.feedbackWrong };
  }

  const expected = await ctx.runSql(exercise.expectedSql ?? "");
  if (!expected.ok) {
    return { ok: false, feedback: exercise.feedbackWrong };
  }

  if (resultSetsEqual(learner.rows, expected.rows)) {
    return {
      ok: true,
      feedback: exercise.feedbackCorrect,
      canContinue: true,
    };
  }

  return { ok: false, feedback: exercise.feedbackWrong };
}
