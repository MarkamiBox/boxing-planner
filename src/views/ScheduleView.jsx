import React, { useState } from 'react';
import { Check, Edit2, Plus, Trash2, X, Save, Play, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import './schedule.css';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function ScheduleView({ schedule, setSchedule, weeks, setWeeks, currentWeekId, setCurrentWeekId, setActiveWorkout, setActiveTab, setLogs, showAlert, showConfirm }) {
  const [activeDay, setActiveDay] = useState('monday');
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [copyPickerFor, setCopyPickerFor] = useState(null); // exerciseId being copied
  
  const [editForm, setEditForm] = useState({ name: '', type: 'Boxing', notes: '', steps: [] });

  const parseWeek = (wId) => {
    if(!wId) return { y: new Date().getFullYear(), w: 1 };
    const [y, w] = wId.split('-W');
    return { y: parseInt(y), w: parseInt(w) };
  };

  const getWeekString = (y, w) => `${y}-W${w.toString().padStart(2, '0')}`;

  const getWeekDateRange = (wId) => {
    if (!wId) return '';
    const [y, w] = wId.split('-W');
    const simple = new Date(y, 0, 1 + (w - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    const end = new Date(ISOweekStart);
    end.setDate(end.getDate() + 6);
    
    const format = (d) => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${format(ISOweekStart)} al ${format(end)}`;
  };

  const changeWeek = (direction) => {
    if (!currentWeekId || !weeks) return;
    const { y, w } = parseWeek(currentWeekId);
    let newY = y;
    let newW = w + direction;
    if (newW > 52) { newW = 1; newY++; }
    if (newW < 1) { newW = 52; newY--; }
    
    const newId = getWeekString(newY, newW);
    
    // Auto-clone if new week is empty
    if (!weeks[newId]) {
      const cloned = JSON.parse(JSON.stringify(schedule));
      Object.keys(cloned).forEach(day => {
        cloned[day].forEach(ex => ex.done = false);
      });
      setWeeks({ ...weeks, [newId]: cloned });
    }
    setCurrentWeekId(newId);
  };

  const toggleDone = (day, exerciseId) => {
    const newSchedule = { ...schedule };
    const ex = newSchedule[day].find(e => e.id === exerciseId);
    if (ex) {
      ex.done = !ex.done;
      setSchedule(newSchedule);
      
      const sessionOriginId = `${currentWeekId}-${day}-${exerciseId}`;

      if (ex.done) {
        const logId = Date.now().toString();
        const placeholderLog = {
          id: logId,
          originId: sessionOriginId,
          date: new Date().toISOString().split('T')[0],
          weekId: currentWeekId,
          type: ex.type,
          name: ex.name,
          energy: 0,
          cardio: 0,
          legs: 0,
          notes: 'Sessione veloce dallo Schedule'
        };
        setLogs(prev => [placeholderLog, ...prev]);
        
        showConfirm(
          "Allenamento completato!", 
          "Vuoi inserire i dettagli (fiato, energia, note)?\n\nPremendo 'Annulla' verrà salvata comunque come sessione veloce.",
          () => {
            setActiveWorkout({ ...ex, logId });
            setActiveTab('logger');
          }
        );
      } else {
        // Se togli la spunta, elimina il log associato
        setLogs(prev => prev.filter(l => l.originId !== sessionOriginId));
      }
    }
  };

  const startEdit = (exercise) => {
    setEditingId(exercise.id);
    setEditForm({ 
      name: exercise.name, 
      type: exercise.type, 
      notes: exercise.notes || '',
      steps: exercise.steps ? JSON.parse(JSON.stringify(exercise.steps)) : [] 
    });
  };

  const saveEdit = (day) => {
    const newSchedule = { ...schedule };
    const idx = newSchedule[day].findIndex(e => e.id === editingId);
    if (idx > -1) {
      newSchedule[day][idx] = { ...newSchedule[day][idx], ...editForm };
      setSchedule(newSchedule);
    }
    setEditingId(null);
  };

  const deleteExercise = (day, exerciseId) => {
    const newSchedule = { ...schedule };
    newSchedule[day] = newSchedule[day].filter(e => e.id !== exerciseId);
    setSchedule(newSchedule);
  };

  const moveExercise = (day, idx, dir) => {
    const newSchedule = { ...schedule };
    const arr = [...newSchedule[day]];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    newSchedule[day] = arr;
    setSchedule(newSchedule);
  };

  const copyExerciseTo = (ex, targetDay) => {
    const newSchedule = { ...schedule };
    const cloned = JSON.parse(JSON.stringify(ex));
    cloned.id = Date.now().toString();
    cloned.done = false;
    newSchedule[targetDay] = [...(newSchedule[targetDay] || []), cloned];
    setSchedule(newSchedule);
    setCopyPickerFor(null);
  };

  const addExercise = (day) => {
    const newSchedule = { ...schedule };
    const newId = Date.now().toString();
    newSchedule[day].push({
      id: newId,
      type: 'Boxing',
      name: 'New Exercise',
      done: false,
      notes: '',
      steps: []
    });
    setSchedule(newSchedule);
    startEdit({ id: newId, type: 'Boxing', name: 'New Exercise', notes: '', steps: [] });
  };

  // --- Step Builder Core ---
  const addStep = () => {
    const newStep = { id: Date.now().toString(), type: 'timer', name: 'New Step', duration: 180, instruction: '' };
    setEditForm({ ...editForm, steps: [...editForm.steps, newStep] });
  };

  const updateStep = (idx, field, value) => {
    const newSteps = [...editForm.steps];
    newSteps[idx][field] = value;
    
    // Auto-populate default fields if type changes
    if (field === 'type') {
       if (value === 'timer' || value === 'manual_timer') {
         newSteps[idx].duration = newSteps[idx].duration || 180;
       } else if (value === 'interval') {
         newSteps[idx].work = newSteps[idx].work || 180;
         newSteps[idx].rest = newSteps[idx].rest || 60;
         newSteps[idx].rounds = newSteps[idx].rounds || 3;
       } else if (value === 'sets') {
         newSteps[idx].sets = newSteps[idx].sets || 3;
         newSteps[idx].reps = newSteps[idx].reps || '10 reps';
         newSteps[idx].rest = newSteps[idx].rest || 60;
       }
    }
    setEditForm({ ...editForm, steps: newSteps });
  };

  const removeStep = (idx) => {
    const newSteps = [...editForm.steps];
    newSteps.splice(idx, 1);
    setEditForm({ ...editForm, steps: newSteps });
  };

  const renderStepEditor = (step, idx) => {
    return (
      <div key={idx} className="step-edit-card" style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <select value={step.type} onChange={e => updateStep(idx, 'type', e.target.value)} style={{ flex: 1, padding: '4px', fontSize: '0.85rem' }}>
            <option value="timer">Timer (Auto)</option>
            <option value="manual_timer">Timer (Manual Wait)</option>
            <option value="interval">Intervals</option>
            <option value="sets">Sets & Reps</option>
            <option value="text">Text Only</option>
          </select>
          <button className="btn-icon danger" onClick={() => removeStep(idx)} style={{ padding: '4px' }}><Trash2 size={16}/></button>
        </div>
        
        <input type="text" placeholder="Step Name" value={step.name} onChange={e => updateStep(idx, 'name', e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '6px', fontSize: '0.85rem' }} />

        {(step.type === 'timer' || step.type === 'manual_timer') && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>Duration (s):
               <input type="number" value={step.duration} onChange={e => updateStep(idx, 'duration', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
           </div>
        )}
        {step.type === 'interval' && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>Work (s):
               <input type="number" value={step.work} onChange={e => updateStep(idx, 'work', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>Rest (s):
               <input type="number" value={step.rest} onChange={e => updateStep(idx, 'rest', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>Rnds:
               <input type="number" value={step.rounds} onChange={e => updateStep(idx, 'rounds', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
           </div>
        )}
        {step.type === 'sets' && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>Sets:
               <input type="number" value={step.sets} onChange={e => updateStep(idx, 'sets', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
             <label style={{ fontSize: '0.75rem', flex: 1.5, color: 'var(--text-muted)' }}>Reps:
               <input type="text" value={step.reps || ''} onChange={e => updateStep(idx, 'reps', e.target.value)} style={{ width: '100%', padding: '4px', marginTop: '2px' }} placeholder="e.g. 10 reps" />
             </label>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>Rest (s):
               <input type="number" value={step.rest} onChange={e => updateStep(idx, 'rest', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
           </div>
        )}

        <input type="text" placeholder="Instructions/Notes" value={step.instruction || ''} onChange={e => updateStep(idx, 'instruction', e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }} />
      </div>
    );
  };
  // -------------------------

  const activeExercises = schedule[activeDay] || [];

  const getDayCompletion = (day) => {
    const exs = schedule[day] || [];
    if (exs.length === 0) return null;
    const done = exs.filter(e => e.done).length;
    return { done, total: exs.length };
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatStepDescription = (step) => {
    if (step.type === 'timer' || step.type === 'manual_timer') return `${formatTime(step.duration)} \u231A`;
    if (step.type === 'interval') return `${step.rounds} Rnd x ${formatTime(step.work)} / ${formatTime(step.rest)}`;
    if (step.type === 'sets') return `${step.sets} Set x ${step.reps} (Rest: ${formatTime(step.rest)})`;
    return '\uD83D\uDCDD';
  };

  return (
    <div className="page-container schedule-view">
      <div className="schedule-header">
        <h1 className="page-title">Schedule</h1>
        {currentWeekId && (
          <div className="week-nav">
            <button className="btn-icon" onClick={() => changeWeek(-1)} style={{ padding: '2px' }}><ChevronLeft size={20}/></button>
            <span className="week-range-text">
              {getWeekDateRange(currentWeekId)}
            </span>
            <button className="btn-icon" onClick={() => changeWeek(1)} style={{ padding: '2px' }}><ChevronRight size={20}/></button>
          </div>
        )}
      </div>

      <div className="days-selector">
        {daysOfWeek.map(day => {
          const comp = getDayCompletion(day);
          return (
            <button
              key={day}
              className={`day-btn ${activeDay === day ? 'active' : ''} ${comp && comp.done === comp.total && comp.total > 0 ? 'day-complete' : ''}`}
              onClick={() => setActiveDay(day)}
            >
              {day.substring(0, 3).toUpperCase()}
              {comp && (
                <span style={{ display: 'block', fontSize: '0.6rem', opacity: 0.8, marginTop: '1px' }}>
                  {comp.done}/{comp.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="exercises-list">
        <div className="list-header">
          <h2>{activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}'s Session</h2>
          <button className="btn-icon add-btn" onClick={() => addExercise(activeDay)}>
            <Plus size={20} />
          </button>
        </div>

        {activeExercises.length === 0 ? (
          <div className="empty-state">Rest day. No exercises planned.</div>
        ) : (
          activeExercises.map((ex, exIdx) => (
            <div key={ex.id} className={`exercise-card ${ex.done ? 'done' : ''}`}>
              {editingId === ex.id ? (
                <div className="exercise-editor">
                  <div className="editor-row">
                    <input 
                      type="text" 
                      value={editForm.name} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      placeholder="Exercise Name"
                    />
                    <select 
                      value={editForm.type} 
                      onChange={e => setEditForm({...editForm, type: e.target.value})}
                    >
                      <option value="Boxing">Boxing</option>
                      <option value="Strength">Strength</option>
                      <option value="Running">Running</option>
                      <option value="Recovery">Recovery</option>
                    </select>
                  </div>
                  <textarea 
                    value={editForm.notes} 
                    onChange={e => setEditForm({...editForm, notes: e.target.value})}
                    placeholder="General Notes"
                    rows="2"
                    style={{ marginBottom: '1rem' }}
                  />

                  {/* Guided Steps Builder */}
                  <div className="steps-builder">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Guided Steps Playlist</label>
                       <button className="btn-text" onClick={addStep} style={{ fontSize: '0.8rem', padding: '0', color: 'var(--primary)' }}>+ Add Step</button>
                    </div>
                    {editForm.steps.map((step, idx) => renderStepEditor(step, idx))}
                    {editForm.steps.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No guided steps. Timer will not be available for this exercise.</p>}
                  </div>

                  <div className="editor-actions" style={{ marginTop: '1rem' }}>
                    <button className="btn-icon danger" onClick={() => deleteExercise(activeDay, ex.id)}>
                      <Trash2 size={18} />
                    </button>
                    <div style={{ flex: 1 }}></div>
                    <button className="btn-secondary" onClick={() => setEditingId(null)}>
                      <X size={18} /> Cancel
                    </button>
                    <button className="btn-primary" onClick={() => saveEdit(activeDay)}>
                      <Save size={18} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="exercise-content">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={ex.done} 
                      onChange={() => toggleDone(activeDay, ex.id)}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <div className="ex-info" style={{ flex: 1 }}>
                    <div className="ex-title">
                      <span className={`tag ${ex.type.toLowerCase()}`}>{ex.type}</span>
                      <h3>{ex.name}</h3>
                    </div>
                    {ex.notes && <p className="ex-notes" style={{ whiteSpace: 'pre-line' }}>{ex.notes}</p>}
                    
                    {ex.steps && ex.steps.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <button 
                          className="btn-text" 
                          style={{ padding: '0', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
                          onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
                        >
                          {expandedId === ex.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          {ex.steps.length} Guided Steps
                        </button>
                        
                        {expandedId === ex.id && (
                          <div className="steps-list" style={{ marginTop: '0.75rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border-color)' }}>
                            {ex.steps.map((step, idx) => (
                              <div key={idx} style={{ marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                  {idx + 1}. {step.name}
                                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800 }}>
                                    {formatStepDescription(step)}
                                  </span>
                                </div>
                                {step.instruction && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{step.instruction}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {ex.steps && ex.steps.length > 0 && (
                      <button 
                        className="btn-icon" 
                        style={{ backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                        onClick={() => {
                          setActiveWorkout(ex);
                          setActiveTab('timer');
                        }}
                      >
                        <Play size={18} fill="white" />
                      </button>
                    )}
                    <button className="btn-icon edit-btn" onClick={() => startEdit(ex)}>
                      <Edit2 size={18} />
                    </button>
                    
                    {/* Move up/down */}
                    {exIdx > 0 && (
                      <button className="btn-icon" style={{ padding: '4px', opacity: 0.6, fontSize: '0.7rem' }} title="Move Up" onClick={() => moveExercise(activeDay, exIdx, -1)}>
                        <ChevronUp size={15}/>
                      </button>
                    )}
                    {exIdx < activeExercises.length - 1 && (
                      <button className="btn-icon" style={{ padding: '4px', opacity: 0.6, fontSize: '0.7rem' }} title="Move Down" onClick={() => moveExercise(activeDay, exIdx, 1)}>
                        <ChevronDown size={15}/>
                      </button>
                    )}

                    {/* Copy to day */}
                    <div style={{ position: 'relative' }}>
                      <button className="btn-icon" style={{ padding: '4px', fontSize: '0.7rem' }} title="Copy to another day" onClick={() => setCopyPickerFor(copyPickerFor === ex.id ? null : ex.id)}>
                        <Plus size={15}/>
                      </button>
                      {copyPickerFor === ex.id && (
                        <div style={{ position: 'absolute', right: '100%', top: 0, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', zIndex: 50, minWidth: '90px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Copy to:</div>
                          {daysOfWeek.filter(d => d !== activeDay).map(d => (
                            <button key={d} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '3px 6px', fontSize: '0.8rem', color: 'var(--text-main)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                              onMouseEnter={e => e.target.style.background = 'var(--surface-hover)'}
                              onMouseLeave={e => e.target.style.background = 'none'}
                              onClick={() => copyExerciseTo(ex, d)}
                            >{d.charAt(0).toUpperCase() + d.slice(1, 3)}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
