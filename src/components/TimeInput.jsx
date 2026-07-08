import React, { useState, useEffect } from 'react';

export function TimeInput({ value, onChange, label, style, max }) {
  const [mins, setMins] = useState(Math.floor((value || 0) / 60));
  const [secs, setSecs] = useState((value || 0) % 60);

  // Sync internal state when external value changes
  useEffect(() => {
    setMins(Math.floor((value || 0) / 60));
    setSecs((value || 0) % 60);
  }, [value]);

  const commit = (rawMins, rawSecs) => {
    let m = parseInt(rawMins, 10);
    let s = parseInt(rawSecs, 10);
    if (isNaN(m)) m = 0;
    if (isNaN(s)) s = 0;
    // Carry overflow seconds into minutes
    if (s > 59) { m += Math.floor(s / 60); s = s % 60; }
    if (s < 0) s = 0;
    if (m < 0) m = 0;
    // Apply max constraint
    if (max !== undefined) {
      const totalSecs = m * 60 + s;
      if (totalSecs > max) { m = Math.floor(max / 60); s = max % 60; }
    }
    setMins(m);
    setSecs(s);
    onChange(m * 60 + s);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {label && <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px' }}>
        <input
          type="text"
          inputMode="numeric"
          value={mins.toString().padStart(2, '0')}
          placeholder="00"
          onFocus={e => e.target.select()}
          onChange={e => setMins(e.target.value)}
          onBlur={e => commit(e.target.value, secs)}
          style={{ width: '40px', padding: '4px 0', border: 'none', background: 'transparent', textAlign: 'right', fontSize: '0.85rem' }}
        />
        <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>:</span>
        <input
          type="text"
          inputMode="numeric"
          value={secs.toString().padStart(2, '0')}
          placeholder="00"
          onFocus={e => e.target.select()}
          onChange={e => setSecs(e.target.value)}
          onBlur={e => commit(mins, e.target.value)}
          style={{ width: '40px', padding: '4px 0', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.85rem' }}
        />
      </div>
    </div>
  );
}
