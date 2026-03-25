let timerId = null;

self.onmessage = (e) => {
  const { type, intervalMs } = e.data;

  if (type === 'START') {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      self.postMessage({ type: 'TICK', now: Date.now() });
    }, intervalMs || 250);
  } else if (type === 'STOP') {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
};
