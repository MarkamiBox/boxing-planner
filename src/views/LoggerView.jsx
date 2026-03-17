import React, { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import './logger.css';

export function LoggerView({ logs, setLogs, activeWorkout, setActiveWorkout }) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(getTodayDate());
  const [type, setType] = useState(activeWorkout ? activeWorkout.type : 'Boxing');
  const [energy, setEnergy] = useState(7);
  const [cardio, setCardio] = useState(7);
  const [legs, setLegs] = useState(7);
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
      type,
      name: activeWorkout ? activeWorkout.name : '',
      energy,
      cardio,
      legs,
      notes,
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
            <div key={log.id} className="mini-log-card">
              <div className="log-header">
                <strong>{log.type}</strong>
                <span className="log-date">{log.date}</span>
              </div>
              <div className="log-stats-row">
                <span>E:{log.energy}</span>
                <span>C:{log.cardio}</span>
                <span>L:{log.legs}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
