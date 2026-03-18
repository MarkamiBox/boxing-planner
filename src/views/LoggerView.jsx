import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, Trash2, Edit2, X, ChevronDown, ChevronUp, Award } from 'lucide-react';
import './logger.css';

export function LoggerView({ logs, setLogs, activeWorkout, setActiveWorkout, schedule, setSchedule }) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(getTodayDate());
  const [type, setType] = useState(activeWorkout ? activeWorkout.type : 'Boxing');

  const [timeOfDay, setTimeOfDay] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const [durationStr, setDurationStr] = useState(
    activeWorkout?.timerStats?.actualDuration
      ? Math.round(activeWorkout.timerStats.actualDuration / 60) + ''
      : ''
  );

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
  const [bodyWeight, setBodyWeight] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState(7);
  const [musclesSoreness, setMusclesSoreness] = useState(3);

  const [savedMessage, setSavedMessage] = useState(false);

  // Log list state
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  // Sync if activeWorkout changes
  useEffect(() => {
    if (activeWorkout) {
      setType(activeWorkout.type);
      setNotes(`Completed: ${activeWorkout.name}`);
      if (activeWorkout.timerStats?.actualDuration) {
        setDurationStr(Math.round(activeWorkout.timerStats.actualDuration / 60) + '');
      }
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

    const newLog = {
      id: logIdToUse,
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
    setTimeout(() => setSavedMessage(false), 3000);
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

      <form className="card" onSubmit={handleSave}>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Time of Day</label>
            <input type="time" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Duration (mins)</label>
            <input type="text" placeholder="e.g. 60" value={durationStr} onChange={e => setDurationStr(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Session Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="Boxing">Boxing / Sparring</option>
              <option value="Running">Running / Cardio</option>
              <option value="Strength">Strength / Weights</option>
              <option value="Recovery">Recovery / Rest</option>
            </select>
          </div>
        </div>

        <h3 className="section-title">General Stats</h3>
        {renderSlider("Energy Level", energy, setEnergy)}
        {renderSlider("Cardio / Breath", cardio, setCardio)}
        {renderSlider("Legs Freshness", legs, setLegs)}
        {renderSlider("Workout Intensity", intensity, setIntensity)}
        {renderSlider("Mental Focus", focus, setFocus)}

        {type === 'Running' && (
          <>
            <h3 className="section-title">Running Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Distance (km/m)</label>
                <input type="text" placeholder="e.g. 5km" value={distance} onChange={e => setDistance(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Pace (min/km)</label>
                <input type="text" placeholder="e.g. 5:30" value={pace} onChange={e => setPace(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Total Time</label>
                <input type="text" placeholder="e.g. 28:00" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {type === 'Boxing' && (
          <>
            <h3 className="section-title">Boxing Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Sparring Rounds (if any)</label>
                <input type="number" min="0" value={sparringRounds} onChange={e => setSparringRounds(Number(e.target.value))} />
              </div>
              {sparringRounds > 0 && (
                <div className="form-group" style={{ flex: 1.5 }}>
                  {renderSlider("Last Round Performance Drop (1=Bad, 10=Strong)", lastRoundDrop, setLastRoundDrop)}
                </div>
              )}
            </div>
          </>
        )}

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label>Free Notes</label>
          <textarea
            rows="3"
            placeholder="How did you feel? Techniques worked on?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          ></textarea>
        </div>

        <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Body & Recovery</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Body Weight (kg)</label>
            <input type="number" step="0.1" placeholder="e.g. 70.5" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Sleep (hours)</label>
            <input type="number" step="0.5" placeholder="e.g. 7.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} />
          </div>
        </div>
        {renderSlider('Sleep Quality', sleepQuality, setSleepQuality)}
        {renderSlider('Muscle Soreness (1=none, 10=very sore)', musclesSoreness, setMusclesSoreness)}

        <div className="form-actions">
          <button type="submit" className="btn-primary w-full">
            {savedMessage ? <><CheckCircle /> Saved!</> : <><Save /> Save Session</>}
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
    </div>
  );
}
