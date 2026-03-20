import React, { useState } from 'react';
import { X } from 'lucide-react';

export function QuickLogSheet({ exercise, onSave, onSkip, onCancel }) {
  const [energy, setEnergy] = useState(7);
  const [cardio, setCardio] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [sleepHours, setSleepHours] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    onSave({
      energy,
      cardio,
      musclesSoreness: soreness,
      sleepHours: sleepHours ? Number(sleepHours) : null,
      notes: notes.trim() || undefined,
    });
  };

  const sliderStyle = { width: '100%', accentColor: 'var(--primary)' };
  const labelStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' };

  return (
    <>
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 499 }}
        onClick={onCancel}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-color)', borderTop: '1px solid var(--border-color)',
        borderRadius: '1rem 1rem 0 0', padding: '1.25rem 1.25rem 1.5rem',
        zIndex: 500, maxWidth: '600px', margin: '0 auto',
        animation: 'slideUp 0.25s ease-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginBottom: '2px' }}>✓ Completato</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{exercise.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{exercise.type}</div>
          </div>
          <button onClick={onCancel} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Sliders */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={labelStyle}><span>Energia</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{energy}/10</span></div>
          <input type="range" min="1" max="10" value={energy} onChange={e => setEnergy(Number(e.target.value))} style={sliderStyle} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={labelStyle}><span>Cardio</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{cardio}/10</span></div>
          <input type="range" min="1" max="10" value={cardio} onChange={e => setCardio(Number(e.target.value))} style={sliderStyle} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={labelStyle}><span>Dolori muscolari</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{soreness}/10</span></div>
          <input type="range" min="1" max="10" value={soreness} onChange={e => setSoreness(Number(e.target.value))} style={sliderStyle} />
        </div>

        {/* Sleep */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={labelStyle}><span>Ore di sonno (opzionale)</span></div>
          <input
            type="number" min="0" max="24" step="0.5" value={sleepHours}
            placeholder="es. 7.5"
            onChange={e => setSleepHours(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={labelStyle}><span>Note (opzionale)</span></div>
          <textarea
            rows={2} value={notes} placeholder="Come è andata?"
            onChange={e => setNotes(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.9rem', resize: 'none' }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-secondary"
            style={{ flex: 1 }}
            onClick={onSkip}
          >
            Salta
          </button>
          <button
            className="btn-primary"
            style={{ flex: 2 }}
            onClick={handleSave}
          >
            Salva
          </button>
        </div>
      </div>
    </>
  );
}
