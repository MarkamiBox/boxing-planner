import React, { useState, useEffect } from 'react';

export function TimeInput({ value, onChange, label, style }) {
  const [mins, setMins] = useState(Math.floor(value / 60) || 0);
  const [secs, setSecs] = useState(value % 60 || 0);

  // Sync internal state when external value changes
  useEffect(() => {
    setMins(Math.floor(value / 60) || 0);
    setSecs(value % 60 || 0);
  }, [value]);

  const handleChange = (newMins, newSecs) => {
    // clamp secs
    let safeSecs = newSecs;
    let safeMins = newMins;
    if (safeSecs > 59) {
       safeMins += Math.floor(safeSecs / 60);
       safeSecs = safeSecs % 60;
    }
    if (safeSecs < 0) safeSecs = 0;
    if (safeMins < 0) safeMins = 0;
    
    setMins(safeMins);
    setSecs(safeSecs);
    onChange(safeMins * 60 + safeSecs);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {label && <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px' }}>
        <input 
          type="number" 
          value={mins > 0 ? mins : ''} 
          placeholder="00"
          onChange={e => handleChange(parseInt(e.target.value) || 0, secs)}
          style={{ width: '40px', padding: '4px 0', border: 'none', background: 'transparent', textAlign: 'right', fontSize: '0.85rem' }}
        />
        <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>:</span>
        <input 
          type="number" 
          value={secs.toString().padStart(2, '0')} 
          onChange={e => handleChange(mins, parseInt(e.target.value) || 0)}
          style={{ width: '40px', padding: '4px 0', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.85rem' }}
        />
      </div>
    </div>
  );
}
