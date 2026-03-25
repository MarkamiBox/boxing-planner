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
  if (isNaN(seconds) || seconds === null || seconds === undefined) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Calculates the estimated total duration in minutes of an exercise
 */
export function calculateDuration(workout, locations = [], day = '') {
  if (!workout) return 0;
  
  // 0. Manual durationMinutes override or Range detection
  if (workout.durationMinutes) return workout.durationMinutes;

  if (workout.plannedTime && workout.plannedTime.includes('-')) {
    const parts = workout.plannedTime.split('-');
    const [h1, m1] = parts[0].split(':').map(Number);
    const [h2, m2] = parts[1].split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff > 0) return diff;
  }

  // 1. Dynamic Course Duration from Profile
  if (workout.isCourse && workout.courseLocationId !== '' && (workout.courseId || workout.courseIdx !== '') && day) {
    const loc = locations[workout.courseLocationId];
    if (loc && Array.isArray(loc.schedule)) {
      const dayLower = day.toLowerCase();
      const filtered = loc.schedule.filter(c => c.day?.toLowerCase() === dayLower);
      
      // Try to find by courseId first, then fallback to index for legacy support
      let picked = filtered.find(c => c.courseId === workout.courseId);
      if (!picked && !isNaN(workout.courseIdx)) {
        picked = filtered[workout.courseIdx];
      }

      if (picked && picked.duration) return Number(picked.duration);
      if (picked && picked.endTime && picked.time) {
        const h1 = parseInt(picked.time.split(':')[0]);
        const m1 = parseInt(picked.time.split(':')[1]);
        const h2 = parseInt(picked.endTime.split(':')[0]);
        const m2 = parseInt(picked.endTime.split(':')[1]);
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff > 0) return diff;
      }
    }
  }

  let stepsDuration = 0;
  if (workout.steps && workout.steps.length > 0) {
    let totalSec = 0;
    workout.steps.forEach(s => {
      let prep = s.prepTime !== undefined ? Number(s.prepTime) : 10;
      if (s.type === 'timer' || s.type === 'manual_timer') totalSec += Number(s.duration || 0) + prep;
      else if (s.type === 'interval') totalSec += Number(s.rounds || 1) * (Number(s.work || 0) + Number(s.rest || 0)) + prep;
      else if (s.type === 'sets') totalSec += Number(s.sets || 1) * (Number(s.rest || 60) + prep);
      else if (s.type === 'text') totalSec += Number(s.duration || 0) + prep;
    });
    stepsDuration = totalSec > 0 ? Math.round(totalSec / 60) : 0;
  }

  const textToSearch = ((workout.notes || '') + ' ' + (workout.name || '')).toLowerCase();
  
  let textDuration = 0;
  const regex = /\b(\d+)\s*(min|m|minutes|minuti)\b/g;
  let match;
  while ((match = regex.exec(textToSearch)) !== null) {
    const val = parseInt(match[1], 10);
    if (val > textDuration) textDuration = val;
  }

  let finalDuration = Math.max(stepsDuration, textDuration);

  if (finalDuration === 0) {
    if (workout.isCourse) finalDuration = 60;
  }

  return finalDuration;
}

/**
 * Adds minutes to a "HH:MM" string and returns a "HH:MM" string
 */
export function addMinutesToTime(hhmm, mins) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
export function timeToMinutes(hhmm) {
  if (!hhmm) return 0;
  if (!hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
