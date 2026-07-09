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
 * Returns an array of 7 Date objects (Mon→Sun) for the given weekId (e.g. "2026-W12").
 * Uses ISO week numbering (Monday = first day).
 */
export function getWeekDates(weekId) {
  if (!weekId) return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1 + i);
    return monday;
  });
  const [y, w] = weekId.split('-W');
  const year = parseInt(y, 10);
  const week = parseInt(w, 10);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // 1=Mon, 7=Sun
  // Monday of week 1
  const monday1 = new Date(jan4);
  monday1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  // Monday of target week
  const mondayOfWeek = new Date(monday1);
  mondayOfWeek.setUTCDate(monday1.getUTCDate() + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayOfWeek);
    d.setUTCDate(mondayOfWeek.getUTCDate() + i);
    return d;
  });
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
      else if (s.type === 'interval' || s.type === 'round') totalSec += Number(s.rounds || 1) * (Number(s.work || 0) + Number(s.rest || 0)) + prep;
      else if (s.type === 'sets') totalSec += Number(s.sets || 1) * (Number(s.rest || 60) + prep);
      // note/text non contribuiscono alla durata
    });
    stepsDuration = totalSec > 0 ? Math.round(totalSec / 60) : 0;
  }

  let finalDuration = stepsDuration;

  if (finalDuration === 0) {
    if (workout.isCourse) finalDuration = 60;
  }

  return finalDuration;
}

/**
 * Adds minutes to a "HH:MM" string and returns a "HH:MM" string
 */
export function addMinutesToTime(hhmm, mins) {
  if (!hhmm || typeof hhmm !== 'string') return '';
  const match = hhmm.trim().match(/^(\d{1,2})\s*:\s*(\d{1,2})/);
  if (!match) return hhmm; // Fallback to original string if not parsable

  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m)) return hhmm;

  const total = h * 60 + m + mins;
  const newH = Math.floor(Math.max(0, total) / 60) % 24;
  const newM = Math.max(0, total) % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
export function timeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const match = hhmm.trim().match(/^(\d{1,2})\s*:\s*(\d{1,2})/);
  if (!match) {
    const hoursOnly = parseInt(hhmm, 10);
    return isNaN(hoursOnly) ? 0 : hoursOnly * 60;
  }
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return (isNaN(h) || isNaN(m)) ? 0 : h * 60 + m;
}

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function sanitizeExercise(ex, fallbackId) {
  const cleanId = ex.id || fallbackId || generateId();
  const s = {
    id: cleanId,
    type: ['Boxing', 'Strength', 'Running', 'Recovery'].includes(ex.type) ? ex.type : 'Boxing',
    name: ex.name || 'Imported Exercise',
    done: !!ex.done,
    notes: ex.notes || '',
    plannedTime: ex.plannedTime || '',
    isCourse: !!ex.isCourse,
    courseLocationId: ex.courseLocationId || '',
    courseId: ex.courseId || '',
    courseIdx: ex.courseIdx !== undefined ? ex.courseIdx : '',
    steps: Array.isArray(ex.steps) ? ex.steps : []
  };

  s.steps = s.steps.map((step, idx) => {
    const ss = {
      id: step.id || generateId(),
      type: ['timer', 'manual_timer', 'interval', 'sets', 'text'].includes(step.type) ? step.type : 'timer',
      name: step.name || `Step ${idx + 1}`,
      instruction: step.instruction || ''
    };
    
    // Ensure numeric fields are valid
    if (ss.type === 'timer' || ss.type === 'manual_timer') {
      ss.duration = parseInt(step.duration) || 180;
    } else if (ss.type === 'interval') {
      ss.work = parseInt(step.work) || 180;
      ss.rest = parseInt(step.rest) || 60;
      ss.rounds = parseInt(step.rounds) || 3;
    } else if (ss.type === 'sets') {
      ss.sets = parseInt(step.sets) || 3;
      ss.reps = step.reps || '10';
      ss.rest = parseInt(step.rest) || 60;
    } else if (ss.type === 'text') {
      ss.duration = parseInt(step.duration) || 0;
    }
    
    if (step.prepTime !== undefined) {
      ss.prepTime = parseInt(step.prepTime);
    }
    
    return ss;
  });
  return s;
}

export function sanitizeSchedule(parsed) {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid schedule structure');
  }
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sanitized = {};
  daysOfWeek.forEach(day => {
    const dayExercises = Array.isArray(parsed[day]) ? parsed[day] : [];
    sanitized[day] = dayExercises.map((ex, i) => sanitizeExercise(ex, `import-w-${day}-${i}-${generateId()}`));
  });
  return sanitized;
}

export function getEffortScore(log) {
  if (!log) return 0;
  if (log.rpe !== undefined && log.rpe > 0) return log.rpe;
  if (log.energy !== undefined && log.energy > 0) return 10 - log.energy;
  return 0;
}

export function getLogSoreness(log) {
  if (!log) return 0;
  if (log.musclesSoreness !== undefined && log.musclesSoreness !== null) return log.musclesSoreness;
  if (!log.bodyMap || Object.keys(log.bodyMap).length === 0) return 0;
  return Math.max(0, ...Object.values(log.bodyMap).map(b => b.intensity || 0));
}

