export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleSessionReminder(exerciseName, minutesBefore = 30) {
  // Fire a notification now (for testing) or schedule via setTimeout
  // Since service workers can't be relied on for scheduling without push,
  // use sessionStorage to track "reminder set today" and setTimeout
  const key = 'bxng_reminder_' + new Date().toDateString();
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  if (Notification.permission !== 'granted') return;
  new Notification('Boxing Planner', {
    body: `Upcoming: ${exerciseName} in ${minutesBefore} min. Get ready.`,
    icon: '/favicon.svg',
    tag: 'session-reminder'
  });
}

export function fireLogNudge(exerciseName) {
  if (Notification.permission !== 'granted') return;
  new Notification('Boxing Planner', {
    body: `Did you log "${exerciseName}"? Tap to open the logger.`,
    icon: '/favicon.svg',
    tag: 'log-nudge'
  });
}
