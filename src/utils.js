/**
 * Shared utilities for Boxing Planner
 */

/**
 * Returns the ISO week identifier for a given date, e.g. "2026-W12".
 * Handles year boundaries correctly.
 */
export function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Returns the current day of the week as a lowercase string, e.g. "monday".
 */
export function getTodayDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

/**
 * Formats seconds into MM:SS 
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Calculates the estimated total duration in minutes of an exercise
 */
export function calculateDuration(workout) {
  if (!workout || !workout.steps) return 0;
  if (workout.timerStats?.actualDuration) {
    return Math.round(workout.timerStats.actualDuration / 60);
  }
  let totalSec = 0;
  workout.steps.forEach(s => {
    let prep = s.prepTime !== undefined ? Number(s.prepTime) : 10;
    if(s.type === 'timer' || s.type === 'manual_timer') totalSec += Number(s.duration || 0) + prep;
    else if(s.type === 'interval') totalSec += Number(s.rounds || 1) * (Number(s.work || 0) + Number(s.rest || 0)) + prep;
    else if(s.type === 'sets') totalSec += Number(s.sets || 1) * (Number(s.rest || 60) + prep);
    else if(s.type === 'text') totalSec += Number(s.duration || 0) + prep;
  });
  return totalSec > 0 ? Math.round(totalSec / 60) : 0;
}
