import React, { useState } from 'react';
import { X, StickyNote } from 'lucide-react';
import { BodyDummy } from './BodyDummy';
import { calculateDuration } from '../utils';

export function QuickLogSheet({ exercise, logs, onSave, onSkip, onCancel }) {
  const recentLogWithWeight = logs?.find(l => l.bodyWeight);
  const recentLogWithSleep = logs?.find(l => l.sleepHours || l.sleepQuality);

  const durMinutes = calculateDuration(exercise, [], ''); // Default context
  const [durationStr, setDurationStr] = useState(durMinutes > 0 ? String(durMinutes) : '');

  const [energy, setEnergy] = useState(7);
  const [cardio, setCardio] = useState(7);
  const [legs, setLegs] = useState(7);
  const [intensity, setIntensity] = useState(7);
  const [focus, setFocus] = useState(7);
  
  const [distance, setDistance] = useState('');
  const [pace, setPace] = useState('');
  const [time, setTime] = useState('');

  const [sparringRounds, setSparringRounds] = useState(0);
  const [lastRoundDrop, setLastRoundDrop] = useState(5);

  const [bodyMap, setBodyMap] = useState({});
  const [sleepHours, setSleepHours] = useState(recentLogWithSleep?.sleepHours || '');
  const [sleepQuality, setSleepQuality] = useState(recentLogWithSleep?.sleepQuality || 7);
  const [bodyWeight, setBodyWeight] = useState(recentLogWithWeight?.bodyWeight || '');

  const [notes, setNotes] = useState('');

  const handleSave = () => {
    let specificData = {};
    if (exercise.type === 'Running') {
      specificData = { distance, pace, time };
    } else if (exercise.type === 'Boxing') {
      specificData = { sparringRounds, lastRoundDrop };
    }

    onSave({
      duration: durationStr ? durationStr + ' min' : '',
      energy,
      cardio,
      legs,
      intensity,
      focus,
      bodyMap: Object.keys(bodyMap).length > 0 ? bodyMap : undefined,
      sleepHours: sleepHours ? Number(sleepHours) : null,
      sleepQuality,
      bodyWeight: bodyWeight ? Number(bodyWeight) : null,
      notes: notes.trim() || undefined,
      ...specificData
    });
  };

  const sliderStyle = { width: '100%', accentColor: 'var(--primary)' };
  const labelStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' };

  const renderSlider = (label, value, setter) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={labelStyle}><span>{label}</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{value}/10</span></div>
      <input type="range" min="1" max="10" value={value} onChange={e => setter(Number(e.target.value))} style={sliderStyle} />
    </div>
  );

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
        animation: 'slideUp 0.25s ease-out',
        maxHeight: '90vh', overflowY: 'auto'
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

        <div style={{ marginBottom: '1rem' }}>
          <div style={labelStyle}><span>Duration (mins)</span></div>
          <input
            type="text" value={durationStr} placeholder="e.g. 60"
            onChange={e => setDurationStr(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }}
          />
        </div>

        {/* Sliders */}
        {renderSlider('Energia', energy, setEnergy)}
        {renderSlider('Cardio', cardio, setCardio)}
        {renderSlider('Gambe', legs, setLegs)}
        {renderSlider('Intensità', intensity, setIntensity)}
        {renderSlider('Focus Mentale', focus, setFocus)}

        {exercise.type === 'Running' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <div style={{...labelStyle, fontSize: '0.75rem'}}>Dst (km)</div>
              <input type="text" value={distance} onChange={e => setDistance(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }} />
            </div>
            <div>
              <div style={{...labelStyle, fontSize: '0.75rem'}}>Pace</div>
              <input type="text" value={pace} onChange={e => setPace(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }} placeholder="5:30" />
            </div>
            <div>
              <div style={{...labelStyle, fontSize: '0.75rem'}}>Time</div>
              <input type="text" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }} placeholder="25:00" />
            </div>
          </div>
        )}

        {exercise.type === 'Boxing' && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
             <div style={{ flex: 1 }}>
               <div style={{...labelStyle, fontSize: '0.75rem'}}>Sparring Rnd</div>
               <input type="number" min="0" value={sparringRounds} onChange={e => setSparringRounds(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }} />
             </div>
             {sparringRounds > 0 && (
               <div style={{ flex: 2 }}>
                 {renderSlider('Last Rnd Drop (1=Bad)', lastRoundDrop, setLastRoundDrop)}
               </div>
             )}
           </div>
        )}

        {/* Body Soreness */}
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            Indolenzimento Muscolare
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Tocca le zone dove senti dolore o affaticamento.
          </div>
          <BodyDummy
            bodyMap={bodyMap}
            onChange={setBodyMap}
            currentRound={exercise?.timerStats?.completedRounds || 0}
            maxRounds={exercise?.steps?.length || exercise?.rounds || 12}
          />
        </div>

        {/* Body & Sleep */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{...labelStyle, fontSize: '0.75rem'}}>Peso (kg)</div>
            <input type="number" step="0.1" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{...labelStyle, fontSize: '0.75rem'}}>Ore Sonno</div>
            <input type="number" step="0.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }} />
          </div>
        </div>
        {renderSlider('Qualità Sonno', sleepQuality, setSleepQuality)}

        {/* Notes */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={labelStyle}><span>Note (opzionale)</span></div>
          <textarea
            rows={2} value={notes} placeholder="Come è andata?"
            onChange={e => setNotes(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.9rem', resize: 'none', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }}
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
