import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, Trash2 } from 'lucide-react';
import './logger.css';

export function LoggerView({ logs, setLogs, activeWorkout, setActiveWorkout }) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(getTodayDate());
  const [type, setType] = useState(activeWorkout ? activeWorkout.type : 'Boxing');
  
  const [timeOfDay, setTimeOfDay] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const [durationStr, setDurationStr] = useState('');
  
  const [energy, setEnergy] = useState(7);
  const [cardio, setCardio] = useState(7);
  const [legs, setLegs] = useState(7);
  const [intensity, setIntensity] = useState(7);
  const [focus, setFocus] = useState(7);
  
  const [notes, setNotes] = useState(activeWorkout ? `Completed Guided Workout: ${activeWorkout.name}` : '');
  
  // Running specific
  const [distance, setDistance] = useState('');
  const [pace, setPace] = useState('');
  const [time, setTime] = useState('');

  // Boxing specific
  const [sparringRounds, setSparringRounds] = useState(0);
  const [lastRoundDrop, setLastRoundDrop] = useState(5); // 1-10

  const [savedMessage, setSavedMessage] = useState(false);

  // Sync if activeWorkout changes
  useEffect(() => {
    if (activeWorkout) {
      setType(activeWorkout.type);
      setNotes(`Completed: ${activeWorkout.name}`);
    }
  }, [activeWorkout]);


  const handleSave = (e) => {
    e.preventDefault();
    if (savedMessage) return; // Prevent duplicate immediate submissions
    
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
      duration: durationStr || (activeWorkout?.timerStats?.actualDuration ? Math.round(activeWorkout.timerStats.actualDuration / 60) + ' min' : ''),
      energy,
      cardio,
      legs,
      intensity,
      focus,
      notes,
      skippedSteps: activeWorkout?.timerStats?.skippedSteps || 0,
      plannedDuration: activeWorkout?.timerStats?.plannedDuration || 0,
      ...specificData
    };

    if (activeWorkout && activeWorkout.logId) {
      setLogs(logs.map(l => l.id === logIdToUse ? newLog : l));
    } else {
      setLogs([newLog, ...logs]);
    }
    
    // Reset specific guided fields if they were active
    if (activeWorkout && setActiveWorkout) setActiveWorkout(null);

    // Show success message
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
    
    // Reset standard form parts if needed, though they remain for quick next log
    setNotes('');
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

        <div className="form-actions">
          <button type="submit" className="btn-primary w-full">
            {savedMessage ? <><CheckCircle /> Saved!</> : <><Save /> Save Session</>}
          </button>
        </div>
      </form>
      
      <div className="recent-logs">
        <h3 className="section-title" style={{ marginTop: '2rem' }}>Recent Logs</h3>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No sessions logged yet.</p>
        ) : (
          logs.slice(0, 3).map(log => (
            <div key={log.id} className="mini-log-card" style={{ position: 'relative' }}>
              <button 
                className="btn-icon danger" 
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '4px' }}
                onClick={() => setLogs(logs.filter(l => l.id !== log.id))}
                title="Delete Log"
              >
                <Trash2 size={16} />
              </button>
              <div className="log-header">
                <strong>{log.type}</strong>
                <span className="log-date">{log.date} {log.timeOfDay}</span>
              </div>
              <div className="log-stats-row">
                <span>Dur: {log.duration || '-'}</span>
                <span>E:{log.energy}</span>
                <span>I:{log.intensity || '-'}</span>
                <span>F:{log.focus || '-'}</span>
              </div>
              {log.skippedSteps > 0 && (
                 <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px' }}>
                   Skipped {log.skippedSteps} guided steps
                 </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
