import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, Trash2, Edit2, X, ChevronDown, ChevronUp, Award, Brain } from 'lucide-react';
import './logger.css';

export function LoggerView({ logs, setLogs, activeWorkout, setActiveWorkout, schedule, setSchedule, setActiveTab, setPendingCoachContext }) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const recentLogWithWeight = logs?.find(l => l.bodyWeight);
  const recentLogWithSleep = logs?.find(l => l.sleepHours || l.sleepQuality);

  const calculateDuration = (workout) => {
    if (!workout || !workout.steps) return '';
    if (workout.timerStats?.actualDuration) {
      return Math.round(workout.timerStats.actualDuration / 60) + '';
    }
    let totalSec = 0;
    workout.steps.forEach(s => {
      let prep = s.prepTime !== undefined ? Number(s.prepTime) : 10;
      if(s.type === 'timer' || s.type === 'manual_timer') totalSec += Number(s.duration || 0) + prep;
      else if(s.type === 'interval') totalSec += Number(s.rounds || 1) * (Number(s.work || 0) + Number(s.rest || 0)) + prep;
      else if(s.type === 'sets') totalSec += Number(s.sets || 1) * (Number(s.rest || 60) + prep);
      else if(s.type === 'text') totalSec += Number(s.duration || 0) + prep;
    });
    return totalSec > 0 ? String(Math.round(totalSec / 60)) : '';
  };

  const [date, setDate] = useState(getTodayDate());
  const [type, setType] = useState(activeWorkout ? activeWorkout.type : 'Boxing');
  const [timeOfDay, setTimeOfDay] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const [durationStr, setDurationStr] = useState(activeWorkout ? calculateDuration(activeWorkout) : '');

  const [energy, setEnergy] = useState(7);
  const [cardio, setCardio] = useState(7);
  const [legs, setLegs] = useState(7);
  const [intensity, setIntensity] = useState(7);
  const [focus, setFocus] = useState(7);

  const [notes, setNotes] = useState(activeWorkout ? `Completed: ${activeWorkout.name}` : '');

  // Running specific
  const [distance, setDistance] = useState('');
  const [pace, setPace] = useState('');
  const [time, setTime] = useState('');

  // Boxing specific
  const [sparringRounds, setSparringRounds] = useState(0);
  const [lastRoundDrop, setLastRoundDrop] = useState(5);

  // Body & recovery
  const [bodyWeight, setBodyWeight] = useState(recentLogWithWeight?.bodyWeight || '');
  const [sleepHours, setSleepHours] = useState(recentLogWithSleep?.sleepHours || '');
  const [sleepQuality, setSleepQuality] = useState(recentLogWithSleep?.sleepQuality || 7);
  const [musclesSoreness, setMusclesSoreness] = useState(3);

  const [savedMessage, setSavedMessage] = useState(false);

  // Log list state
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [showCoachBridge, setShowCoachBridge] = useState(false);
  const [lastSavedLog, setLastSavedLog] = useState(null);

  // Sync if activeWorkout changes
  useEffect(() => {
    if (activeWorkout) {
      setType(activeWorkout.type);
      setNotes(`Completed: ${activeWorkout.name}`);
      setDurationStr(calculateDuration(activeWorkout));
    }
  }, [activeWorkout]);

  const handleSave = (e) => {
    e.preventDefault();
    if (savedMessage) return;

    let specificData = {};
    if (type === 'Running') {
      specificData = { distance, pace, time };
    } else if (type === 'Boxing') {
      specificData = { sparringRounds, lastRoundDrop };
    }

    const logIdToUse = (activeWorkout && activeWorkout.logId) ? activeWorkout.logId : Date.now().toString();

    // Preserve originId from the existing log if updating (so unticking still removes it)
    const existingLog = (activeWorkout?.logId) ? logs.find(l => l.id === logIdToUse) : null;

    const newLog = {
      id: logIdToUse,
      ...(existingLog?.originId ? { originId: existingLog.originId } : {}),
      date,
      timeOfDay,
      type,
      name: activeWorkout ? activeWorkout.name : '',
      duration: durationStr ? durationStr + ' min' : '',
      energy,
      cardio,
      legs,
      intensity,
      focus,
      notes,
      bodyWeight: bodyWeight ? Number(bodyWeight) : null,
      sleepHours: sleepHours ? Number(sleepHours) : null,
      sleepQuality,
      musclesSoreness,
      skippedSteps: activeWorkout?.timerStats?.skippedSteps || 0,
      plannedDuration: activeWorkout?.timerStats?.plannedDuration || 0,
      ...specificData
    };

    if (activeWorkout && activeWorkout.logId) {
      setLogs(logs.map(l => l.id === logIdToUse ? newLog : l));
    } else {
      setLogs([newLog, ...logs]);
    }

    // Auto-complete the schedule if it originated from one
    if (activeWorkout && activeWorkout.sourceDay && activeWorkout.id && schedule && setSchedule) {
      const daySchedule = schedule[activeWorkout.sourceDay];
      if (daySchedule) {
         const newSchedule = { ...schedule };
         const exIdx = newSchedule[activeWorkout.sourceDay].findIndex(e => e.id === activeWorkout.id);
         if (exIdx > -1) {
            newSchedule[activeWorkout.sourceDay][exIdx].done = true;
            setSchedule(newSchedule);
         }
      }
    }

    if (activeWorkout && setActiveWorkout) setActiveWorkout(null);
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      // Show coach bridge prompt after save animation
      if (setActiveTab && setPendingCoachContext && energy > 0) {
        setShowCoachBridge(true);
        setLastSavedLog(newLog);
      }
    }, 1500);
    setNotes('');
    setDurationStr('');
  };

  const handleDeleteLog = (id) => {
    setLogs(logs.filter(l => l.id !== id));
  };

  const startEdit = (log) => {
    setEditingLogId(log.id);
    setEditDraft({ ...log });
  };

  const saveEdit = () => {
    setLogs(logs.map(l => l.id === editingLogId ? { ...l, ...editDraft } : l));
    setEditingLogId(null);
    setEditDraft(null);
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setEditDraft(null);
  };

  const renderSlider = (label, value, setter) => (
    <div className="slider-group">
      <div className="slider-header">
        <label>{label}</label>
        <span className="slider-value">{value}/10</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={e => setter(Number(e.target.value))}
        className="form-slider"
      />
    </div>
  );

  const renderEditSlider = (label, field, min = 1, max = 10) => (
    <div className="slider-group">
      <div className="slider-header">
        <label>{label}</label>
        <span className="slider-value">{editDraft[field] || min}/{max}</span>
      </div>
      <input
        type="range" min={min} max={max}
        value={editDraft[field] || min}
        onChange={e => setEditDraft(d => ({ ...d, [field]: Number(e.target.value) }))}
        className="form-slider"
      />
    </div>
  );

  const displayedLogs = showAllLogs ? logs : logs.slice(0, 3);
  const isPerfect = (log) => log.skippedSteps === 0 && log.energy > 0;

  return (
    <div className="page-container logger-view">
      <h1 className="page-title">Log Session</h1>

      <form className="card" onSubmit={handleSave} style={{ padding: '1.25rem 1.25rem 1.5rem', borderRadius: '1rem', background: 'var(--bg-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginBottom: '2px' }}>✓ Completato</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{activeWorkout ? activeWorkout.name : 'Log Manuale'}</div>
            <select value={type} onChange={e => setType(e.target.value)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}>
              <option value="Boxing">Boxing</option>
              <option value="Running">Running</option>
              <option value="Strength">Strength</option>
              <option value="Recovery">Recovery</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Data</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ora</div>
            <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} required style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}><span>Duration (mins)</span></div>
          <input type="text" placeholder="e.g. 60" value={durationStr} onChange={e => setDurationStr(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} />
        </div>

        {/* Sliders mimicking QuickLogSheet */}
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Energia</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{energy}/10</span></div>
          <input type="range" min="1" max="10" value={energy} onChange={e => setEnergy(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '-0.5rem' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cardio</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{cardio}/10</span></div>
          <input type="range" min="1" max="10" value={cardio} onChange={e => setCardio(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '-0.5rem' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gambe</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{legs}/10</span></div>
          <input type="range" min="1" max="10" value={legs} onChange={e => setLegs(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '-0.5rem' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Intensità</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{intensity}/10</span></div>
          <input type="range" min="1" max="10" value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '-0.5rem' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Focus Mentale</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{focus}/10</span></div>
          <input type="range" min="1" max="10" value={focus} onChange={e => setFocus(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '-0.5rem' }} />
        </div>

        {type === 'Running' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Dst (km)</div>
              <input type="text" value={distance} onChange={e => setDistance(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Pace</div>
              <input type="text" value={pace} onChange={e => setPace(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} placeholder="5:30" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Time</div>
              <input type="text" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} placeholder="25:00" />
            </div>
          </div>
        )}

        {type === 'Boxing' && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
             <div style={{ flex: 1 }}>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sparring Rnd</div>
               <input type="number" min="0" value={sparringRounds} onChange={e => setSparringRounds(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} />
             </div>
             {sparringRounds > 0 && (
               <div style={{ flex: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Last Rnd Drop (1=Bad)</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{lastRoundDrop}/10</span></div>
                  <input type="range" min="1" max="10" value={lastRoundDrop} onChange={e => setLastRoundDrop(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '0.25rem' }} />
               </div>
             )}
           </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Dolori muscolari</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{musclesSoreness}/10</span></div>
          <input type="range" min="1" max="10" value={musclesSoreness} onChange={e => setMusclesSoreness(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '0.25rem' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Peso (kg)</div>
            <input type="number" step="0.1" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ore Sonno</div>
            <input type="number" step="0.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} />
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Qualità Sonno</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{sleepQuality}/10</span></div>
          <input type="range" min="1" max="10" value={sleepQuality} onChange={e => setSleepQuality(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', marginTop: '0.25rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}><span>Note (opzionale)</span></div>
          <textarea rows="2" placeholder="Come è andata?" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.9rem', resize: 'none', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary w-full" style={{ padding: '0.75rem' }}>
            {savedMessage ? <><CheckCircle size={18} style={{ marginRight: '6px' }} /> Salvato!</> : <><Save size={18} style={{ marginRight: '6px' }} /> Salva Sessione</>}
          </button>
        </div>
      </form>

      <div className="recent-logs">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: '0.75rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Session History ({logs.length})</h3>
          {logs.length > 3 && (
            <button
              className="btn-text"
              style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, padding: 0 }}
              onClick={() => setShowAllLogs(v => !v)}
            >
              {showAllLogs ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Show All</>}
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No sessions logged yet.</p>
        ) : (
          displayedLogs.map(log => (
            <div key={log.id} className="mini-log-card" style={{ marginBottom: '0.75rem' }}>
              {editingLogId === log.id ? (
                /* ---- EDIT MODE ---- */
                <div>
                  <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                    <div className="form-group">
                      <label>Date</label>
                      <input type="date" value={editDraft.date} onChange={e => setEditDraft(d => ({ ...d, date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Time</label>
                      <input type="time" value={editDraft.timeOfDay || ''} onChange={e => setEditDraft(d => ({ ...d, timeOfDay: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Duration</label>
                      <input type="text" value={editDraft.duration || ''} onChange={e => setEditDraft(d => ({ ...d, duration: e.target.value }))} />
                    </div>
                  </div>
                  {renderEditSlider('Energy', 'energy')}
                  {renderEditSlider('Cardio', 'cardio')}
                  {renderEditSlider('Legs', 'legs')}
                  {renderEditSlider('Intensity', 'intensity')}
                  {renderEditSlider('Focus', 'focus')}
                  <div className="form-group" style={{ marginTop: '0.5rem' }}>
                    <label>Notes</label>
                    <textarea rows="2" value={editDraft.notes || ''} onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={saveEdit}><Save size={16} /> Save</button>
                    <button className="btn-secondary" onClick={cancelEdit}><X size={16} /> Cancel</button>
                  </div>
                </div>
              ) : (
                /* ---- VIEW MODE ---- */
                <div>
                  <div className="log-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong>{log.type}</strong>
                      {log.name && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>– {log.name}</span>}
                      {isPerfect(log) && (
                        <span title="Perfect session — no skipped steps!" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid #10b981', borderRadius: '12px', padding: '1px 6px', fontWeight: 700 }}>
                          <Award size={10} /> PERFECT
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button className="btn-icon" style={{ padding: '4px' }} onClick={() => startEdit(log)} title="Edit"><Edit2 size={15} /></button>
                      <button className="btn-icon danger" style={{ padding: '4px' }} onClick={() => handleDeleteLog(log.id)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="log-date" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {log.date}{log.timeOfDay ? ` @ ${log.timeOfDay}` : ''}{log.duration ? ` · ${log.duration}` : ''}
                  </div>
                  <div className="log-stats-row" style={{ marginTop: '6px', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span title="Energy">⚡ {log.energy || '-'}</span>
                    <span title="Cardio">💨 {log.cardio || '-'}</span>
                    <span title="Legs">🦵 {log.legs || '-'}</span>
                    <span title="Intensity">🔥 {log.intensity || '-'}</span>
                    <span title="Focus">🎯 {log.focus || '-'}</span>
                    {log.bodyWeight && <span title="Peso">⚖️ {log.bodyWeight}kg</span>}
                    {log.sleepHours && <span title="Sonno">🛏️ {log.sleepHours}h</span>}
                    {log.type === 'Running' && log.distance && <span>📍 {log.distance}</span>}
                    {log.sparringRounds > 0 && <span>🥊 {log.sparringRounds} rnd</span>}
                  </div>
                  {log.notes && <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{log.notes}</div>}
                  {log.skippedSteps > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px' }}>
                      ⏭ Skipped {log.skippedSteps} guided steps
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Coach Bridge */}
      {showCoachBridge && (
        <div style={{
          position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, var(--surface), #1a1a2e)',
          border: '1px solid var(--primary)', borderRadius: '1rem',
          padding: '1rem 1.25rem', maxWidth: '90vw', width: '360px',
          boxShadow: '0 8px 24px rgba(185, 28, 28, 0.3)', zIndex: 100,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <Brain size={18} style={{ color: 'var(--primary)' }} /> Sessione salvata!
            </span>
            <button className="btn-icon" style={{ padding: '2px' }} onClick={() => setShowCoachBridge(false)}>
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Vuoi dire al coach come è andata?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" style={{ flex: 1, padding: '0.5rem' }}
              onClick={() => {
                setPendingCoachContext(lastSavedLog);
                setActiveTab('coach');
                setShowCoachBridge(false);
              }}
            >
              <Brain size={16} /> Parla con il Coach
            </button>
            <button className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }}
              onClick={() => setShowCoachBridge(false)}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
