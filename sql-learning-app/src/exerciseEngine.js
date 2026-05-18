/**
 * @param {import("./curriculum.js").CurriculumUnit} exercise
 * @returns {"mc" | "match" | "sql"}
 */
export function getExerciseInputType(exercise) {
  if (exercise.format === "sql") return "sql";
  if (exercise.format === "match") return "match";
  return "mc";
}

/**
 * @param {import("./curriculum.js").CurriculumUnit} exercise
 * @param {{ optionId?: string; sql?: string }} answer
 * @param {{ lessonsComplete: (ids: string[]) => boolean; runSql?: (sql: string) => Promise<{ ok: boolean; rows?: unknown[] }> }} ctx
 */
export function gradeExercise(exercise, answer, ctx) {
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
    return gradeSqlExercise(exercise, answer, ctx);
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
 * @param {{ runSql?: (sql: string) => Promise<{ ok: boolean; rows?: unknown[] }> }} ctx
 */
async function gradeSqlExerciseAsync(exercise, answer, ctx) {
  if (!ctx.runSql || !answer.sql?.trim()) {
    return {
      ok: false,
      feedback: exercise.feedbackWrong,
    };
  }

  const learner = await ctx.runSql(answer.sql.trim());
  if (!learner.ok) {
    return { ok: false, feedback: exercise.feedbackWrong };
  }

  const expected = await ctx.runSql(exercise.expectedSql ?? "");
  if (!expected.ok) {
    return { ok: false, feedback: exercise.feedbackWrong };
  }

  const equal = JSON.stringify(normalizeRows(learner.rows)) === JSON.stringify(normalizeRows(expected.rows));
  if (equal) {
    return {
      ok: true,
      feedback: exercise.feedbackCorrect,
      canContinue: true,
    };
  }

  return { ok: false, feedback: exercise.feedbackWrong };
}

/** @param {unknown[] | undefined} rows */
function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (row && typeof row === "object") {
      return Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]),
      );
    }
    return row;
  });
}

function gradeSqlExercise(exercise, answer, ctx) {
  if (answer.sql?.trim() && exercise.expectedSql) {
    const normalized = answer.sql.trim().replace(/\s+/g, " ").toLowerCase();
    const expected = exercise.expectedSql.trim().replace(/\s+/g, " ").toLowerCase();
    if (normalized === expected) {
      return {
        ok: true,
        feedback: exercise.feedbackCorrect,
        canContinue: true,
      };
    }
  }

  return {
    ok: false,
    feedback: exercise.feedbackWrong,
  };
}

export { gradeSqlExerciseAsync };
