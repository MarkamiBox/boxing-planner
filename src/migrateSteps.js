/**
 * migrateSteps.js — Idempotent migration from step schema v5 -> v6
 *
 * Old types:           New types:
 *  timer               timer { autoAdvance: true }
 *  manual_timer        timer { autoAdvance: false }
 *  interval            round  (work, rest, rounds)
 *  sets                sets   (unchanged)
 *  text                note
 */

export function migrateStep(step) {
  if (!step || typeof step !== "object") return step;
  if (step.type === "round" || step.type === "note") return step;
  if (step.type === "timer" && Object.prototype.hasOwnProperty.call(step, "autoAdvance")) return step;
  switch (step.type) {
    case "manual_timer": return { ...step, type: "timer", autoAdvance: false };
    case "timer":        return { ...step, type: "timer", autoAdvance: true };
    case "interval":     return { ...step, type: "round" };
    case "text":         return { ...step, type: "note" };
    default:             return step;
  }
}
export function migrateStepsArray(steps) {
  if (!Array.isArray(steps)) return steps;
  return steps.map(migrateStep);
}
export function migrateExercise(ex) {
  if (!ex || typeof ex !== "object") return ex;
  return { ...ex, steps: migrateStepsArray(ex.steps || []) };
}
export function migrateSchedule(schedule) {
  if (!schedule || typeof schedule !== "object") return schedule;
  const result = {};
  for (const [day, exercises] of Object.entries(schedule)) {
    result[day] = Array.isArray(exercises) ? exercises.map(migrateExercise) : exercises;
  }
  return result;
}
export function migrateAllWeeks(weeks) {
  if (!weeks || typeof weeks !== "object") return weeks;
  const result = {};
  for (const [weekId, schedule] of Object.entries(weeks)) {
    result[weekId] = migrateSchedule(schedule);
  }
  return result;
}
export function migrateLogs(logs) {
  if (!Array.isArray(logs)) return logs;
  return logs.map(log => ({ ...log, steps: migrateStepsArray(log.steps || []) }));
}
export function migrateWorkoutTemplates(templates) {
  if (!Array.isArray(templates)) return templates;
  return templates.map(migrateExercise);
}
export function migrateActiveWorkout(activeWorkout) {
  if (!activeWorkout || typeof activeWorkout !== "object") return activeWorkout;
  return migrateExercise(activeWorkout);
}
