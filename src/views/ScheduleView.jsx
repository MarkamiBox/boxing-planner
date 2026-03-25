import React, { useState, useRef } from 'react';
import { Check, Edit2, Plus, Trash2, X, Save, Play, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileCode2, AlertCircle, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { useDialog } from '../components/DialogContext';
import { TimeInput } from '../components/TimeInput';
import { getTodayDayName, getWeekId, calculateDuration, addMinutesToTime } from '../utils';
import { QuickLogSheet } from '../components/QuickLogSheet';
import './schedule.css';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function ScheduleView({ profile, schedule, setSchedule, weeks, setWeeks, currentWeekId, setCurrentWeekId, setActiveWorkout, setActiveTab, logs, setLogs }) {
  const { showAlert, showConfirm } = useDialog();
  const todayDay = getTodayDayName();
  const isCurrentWeek = currentWeekId === getWeekId();
  const [activeDay, setActiveDay] = useState(todayDay);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [copyPickerFor, setCopyPickerFor] = useState(null); // exerciseId being copied
  const [quickLogTarget, setQuickLogTarget] = useState(null); // { exercise, logId, day }

  const [editForm, setEditForm] = useState({ name: '', type: 'Boxing', notes: '', plannedTime: '', steps: [], isCourse: false, courseLocationId: '', courseIdx: '' });
  const [cloneMenuOpen, setCloneMenuOpen] = useState(false);

  // JSON Import state
  const [jsonImport, setJsonImport] = useState({ open: false, mode: 'day', text: '', error: '' });

  // Swipe gesture tracking
  const swipeStartX = useRef(null);

  const parseWeek = (wId) => {
    if (!wId) return { y: new Date().getFullYear(), w: 1 };
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
        setQuickLogTarget({ exercise: ex, logId, day });
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
      plannedTime: exercise.plannedTime || '',
      steps: exercise.steps ? exercise.steps.map(s => ({ ...s, id: s.id || Math.random().toString(36).substr(2, 9) })) : [],
      isCourse: exercise.isCourse || false,
      courseLocationId: exercise.courseLocationId || '',
      courseIdx: exercise.courseIdx || ''
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
      plannedTime: '',
      steps: []
    });
    setSchedule(newSchedule);
    startEdit({ id: newId, type: 'Boxing', name: 'New Exercise', notes: '', plannedTime: '', steps: [] });
  };

  const handleCloneLastWeek = () => {
    const { y, w } = parseWeek(currentWeekId);
    let newY = y; let newW = w - 1;
    if (newW < 1) { newW = 52; newY--; }
    const prevWeekId = getWeekString(newY, newW);
    const prevSchedule = weeks[prevWeekId];
    if (prevSchedule) {
      const cloned = JSON.parse(JSON.stringify(prevSchedule));
      Object.keys(cloned).forEach(d => cloned[d].forEach(ex => ex.done = false));
      setSchedule(cloned);
      setWeeks({ ...weeks, [currentWeekId]: cloned });
      showAlert('Successo', `Settimana ${prevWeekId} clonata con successo in ${currentWeekId}.`);
    } else {
      showAlert('Errore', `Nessuna programmazione trovata per la settimana ${prevWeekId}.`);
    }
    setCloneMenuOpen(false);
  };
  
  const handleClearWeek = () => {
    showConfirm('Pulisci Settimana', "Sei sicuro di voler svuotare l'intera settimana?", () => {
      const blank = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
      setSchedule(blank);
      setWeeks({ ...weeks, [currentWeekId]: blank });
    });
    setCloneMenuOpen(false);
  };

  // ── JSON Import ──────────────────────────────────────────────────────────────
  const closeJsonImport = () => setJsonImport({ open: false, mode: 'day', text: '', error: '' });

  const importExercisesFromJSON = () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonImport.text);
    } catch {
      setJsonImport(s => ({ ...s, error: 'JSON non valido. Controlla la sintassi.' }));
      return;
    }

    if (jsonImport.mode === 'week') {
      // Validate week structure
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonImport(s => ({ ...s, error: 'Per l\'import settimanale serve un oggetto con i giorni (monday, tuesday...).' }));
        return;
      }
      const newWeeks = { ...weeks, [currentWeekId]: parsed };
      setWeeks(newWeeks);
      setSchedule(parsed);
      closeJsonImport();
      showAlert('Successo', 'Settimana importata correttamente!');
      return;
    }

    // Accept both a single object or an array
    const exercises = Array.isArray(parsed) ? parsed : [parsed];

    // Light validation: must have at least a name field
    const invalid = exercises.find(e => typeof e !== 'object' || !e.name);
    if (invalid) {
      setJsonImport(s => ({ ...s, error: 'Ogni esercizio deve avere almeno un campo "name".' }));
      return;
    }

    // Normalise: assign new ids, reset done flag
    const now = Date.now();
    const normalised = exercises.map((e, i) => ({
      type: 'Boxing',
      notes: '',
      plannedTime: '',
      steps: [],
      ...e,
      id: (now + i).toString(),
      done: false,
    }));

    // Ensure steps have IDs
    normalised.forEach(ex => {
      if (ex.steps) {
        ex.steps = ex.steps.map(s => ({ ...s, id: s.id || Math.random().toString(36).substr(2, 9) }));
      }
    });

    const newSchedule = { ...schedule };
    newSchedule[activeDay] = [...(newSchedule[activeDay] || []), ...normalised];
    setSchedule(newSchedule);
    closeJsonImport();
    showAlert('Import OK', `${ normalised.length } esercizio / i aggiunto / i a ${ activeDay.charAt(0).toUpperCase() + activeDay.slice(1) }.`);
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Swipe to change day ───────────────────────────────────────────────────────
  const handleTouchStart = (e) => { swipeStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (swipeStartX.current === null) return;
    const diff = swipeStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return; // ignore tiny swipes
    const idx = daysOfWeek.indexOf(activeDay);
    if (diff > 0 && idx < daysOfWeek.length - 1) setActiveDay(daysOfWeek[idx + 1]);
    if (diff < 0 && idx > 0) setActiveDay(daysOfWeek[idx - 1]);
    swipeStartX.current = null;
  };
  // ─────────────────────────────────────────────────────────────────────────────

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

  const moveStep = (idx, dir) => {
    const newSteps = [...editForm.steps];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;
    [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];
    setEditForm({ ...editForm, steps: newSteps });
  };

  const handleInstructionChange = (stepIdx, roundIdx, newValue) => {
    const newSteps = [...editForm.steps];
    const step = newSteps[stepIdx];
    const rounds = step.type === 'interval' ? (step.rounds || 1) : (step.sets || 1);
    let parts = (step.instruction || '').split(' | ');
    while (parts.length < rounds) parts.push('');
    parts[roundIdx] = newValue;
    newSteps[stepIdx] = { ...step, instruction: parts.join(' | ') };
    setEditForm({ ...editForm, steps: newSteps });
  };

  const renderStepEditor = (step, idx) => {
    return (
      <div key={step.id} className="step-edit-card" style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} style={{ color: idx === 0 ? 'var(--text-muted)' : 'var(--primary)', background: 'none', border: 'none', padding: '4px', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUp size={16}/></button>
            <button onClick={() => moveStep(idx, 1)} disabled={idx === editForm.steps.length - 1} style={{ color: idx === editForm.steps.length - 1 ? 'var(--text-muted)' : 'var(--primary)', background: 'none', border: 'none', padding: '4px', cursor: idx === editForm.steps.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowDown size={16}/></button>
          </div>
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
             <TimeInput label="Duration" value={step.duration} onChange={val => updateStep(idx, 'duration', val)} style={{ flex: 1 }} />
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>
               Prep (s):
               <input type="number" min="0" placeholder="default" value={step.prepTime !== undefined ? step.prepTime : ''} onChange={e => updateStep(idx, 'prepTime', e.target.value === '' ? undefined : Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
           </div>
        )}
        {step.type === 'interval' && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
             <TimeInput label="Work" value={step.work} onChange={val => updateStep(idx, 'work', val)} style={{ flex: 1 }} />
             <TimeInput label="Rest" value={step.rest} onChange={val => updateStep(idx, 'rest', val)} style={{ flex: 1 }} />
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>Rnds:
               <input type="number" value={step.rounds} onChange={e => updateStep(idx, 'rounds', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)' }}>
               Prep (s):
               <input type="number" min="0" placeholder="default" value={step.prepTime !== undefined ? step.prepTime : ''} onChange={e => updateStep(idx, 'prepTime', e.target.value === '' ? undefined : Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
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
             <TimeInput label="Rest" value={step.rest} onChange={val => updateStep(idx, 'rest', val)} style={{ flex: 1 }} />
           </div>
        )}

        {((step.type === 'interval' && (step.rounds || 0) > 1) || (step.type === 'sets' && (step.sets || 0) > 1)) ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
             {Array.from({ length: (step.type === 'interval' ? step.rounds : step.sets) }).map((_, rIdx) => {
               const parts = (step.instruction || '').split(' | ');
               return (
                 <div key={rIdx} style={{ display: 'flex', flexDirection: 'column' }}>
                   <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '1px' }}>Round {rIdx+1}</label>
                   <textarea 
                     placeholder={`Step instruction round ${rIdx+1}`}
                     value={parts[rIdx] || ''} 
                     onChange={e => handleInstructionChange(idx, rIdx, e.target.value)}
                     style={{ width: '100%', padding: '6px', fontSize: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '35px', resize: 'vertical', color: 'inherit' }}
                   />
                 </div>
               );
             })}
           </div>
        ) : (
          <input type="text" placeholder="Instructions/Notes" value={step.instruction || ''} onChange={e => updateStep(idx, 'instruction', e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }} />
        )}
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

  const getDayTotalDuration = () => {
    let totalMins = 0;
    activeExercises.forEach(ex => {
      totalMins += calculateDuration(ex);
    });
    if (totalMins === 0) return null;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0) return `~${h}h ${m}min total`;
    return `~${m}min total`;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${ m.toString().padStart(2, '0') }: ${ s.toString().padStart(2, '0') }`;
  };

  const formatStepDescription = (step) => {
    if (step.type === 'timer' || step.type === 'manual_timer') return `${ formatTime(step.duration)
    } \u231A`;
    if (step.type === 'interval') return `${ step.rounds } Rnd x ${ formatTime(step.work) } / ${formatTime(step.rest)}`;
    if (step.type === 'sets') return `${step.sets} Set x ${step.reps} (Rest: ${formatTime(step.rest)})`;
    return '\uD83D\uDCDD';
  };

  return (
    <div className="page-container schedule-view">
      <div className="schedule-header">
        <h1 className="page-title">Schedule</h1>
        {currentWeekId && (
          <div className="week-nav">
            <button className="btn-icon" onClick={() => changeWeek(-1)} style={{ padding: '2px' }}><ChevronLeft size={20} /></button>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span className="week-range-text">
                {getWeekDateRange(currentWeekId)}
              </span>
              <button className="btn-text" style={{ padding: '2px 4px', marginLeft: '4px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setCloneMenuOpen(!cloneMenuOpen)}>
                <ChevronDown size={16} />
              </button>
              {cloneMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.25rem', zIndex: 100, minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px' }}>
                  <button onClick={handleCloneLastWeek} className="btn-text" style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--text-main)', fontSize: '0.85rem' }}><Copy size={14} style={{ marginRight: '6px' }} /> Clone last week</button>
                  <button onClick={() => { setJsonImport({ open: true, mode: 'week', text: '', error: '' }); setCloneMenuOpen(false); }} className="btn-text" style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--text-main)', fontSize: '0.85rem' }}><FileCode2 size={14} style={{ marginRight: '6px' }} /> Import Week JSON</button>
                  <button onClick={handleClearWeek} className="btn-text" style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--primary)', fontSize: '0.85rem' }}><Trash2 size={14} style={{ marginRight: '6px' }} /> Start blank</button>
                </div>
              )}
            </div>
            <button className="btn-icon" onClick={() => changeWeek(1)} style={{ padding: '2px' }}><ChevronRight size={20} /></button>
          </div>
        )}
      </div>

      <div className="days-selector">
        {daysOfWeek.map(day => {
          const comp = getDayCompletion(day);
          return (
            <button
              key={day}
              className={`day-btn ${activeDay === day ? 'active' : ''} ${day === todayDay && isCurrentWeek ? 'today' : ''} ${comp && comp.done === comp.total && comp.total > 0 ? 'day-complete' : ''}`}
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

      <div className="exercises-list"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="list-header">
          <div>
            <h2>{activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}'s Session</h2>
            {getDayTotalDuration() && <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>{getDayTotalDuration()}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-icon import-json-btn" title="Import exercises from JSON" onClick={() => setJsonImport({ open: true, mode: 'day', text: '', error: '' })}>
              <FileCode2 size={18} />
            </button>
            <button className="btn-icon add-btn" onClick={() => addExercise(activeDay)}>
              <Plus size={20} />
            </button>
          </div>
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
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Exercise Name"
                    />
                    <select
                      value={editForm.type}
                      onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    >
                      <option value="Boxing">Boxing</option>
                      <option value="Strength">Strength</option>
                      <option value="Running">Running</option>
                      <option value="Recovery">Recovery</option>
                    </select>
                    {editForm.isCourse && editForm.courseIdx !== '' ? (
                      <div style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(185, 28, 28, 0.1)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', minWidth: '80px' }}>
                        🕒 {editForm.plannedTime}
                      </div>
                    ) : (
                      <input
                        type="time"
                        value={editForm.plannedTime || ''}
                        onChange={e => setEditForm({ ...editForm, plannedTime: e.target.value })}
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--text-main)', minWidth: '80px' }}
                      />
                    )}
                  </div>
                    <textarea
                      value={editForm.notes}
                      onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="General Notes"
                      rows="2"
                    />

                    <div className="editor-row" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label className="toggle-group" style={{ flexShrink: 0 }}>
                        <div className="switch">
                          <input
                            type="checkbox"
                            checked={editForm.isCourse}
                            onChange={e => setEditForm(prev => ({ ...prev, isCourse: e.target.checked }))}
                          />
                          <span className="slider"></span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>È un Corso</span>
                      </label>
                      
                      {editForm.isCourse && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <select
                            value={editForm.courseLocationId}
                            onChange={e => setEditForm(prev => ({ ...prev, courseLocationId: e.target.value, courseIdx: '' }))}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--text-main)', height: '42px' }}
                          >
                            <option value="">Seleziona Luogo...</option>
                            {(profile?.locations || []).map((loc, idx) => (
                              <option key={idx} value={idx}>{loc.name || `Luogo ${idx + 1}`}</option>
                            ))}
                          </select>

                          {editForm.courseLocationId !== '' && (
                            <select
                              value={editForm.courseIdx}
                              onChange={e => {
                                const idx = e.target.value;
                                if (idx === '') return;
                                const loc = profile.locations[editForm.courseLocationId];
                                const courses = Array.isArray(loc.schedule) ? loc.schedule : [];
                                const filtered = courses.filter(c => c.day?.toLowerCase() === activeDay.toLowerCase());
                                const picked = filtered[idx];
                                if (picked) {
                                  setEditForm(prev => ({
                                    ...prev,
                                    courseIdx: idx,
                                    name: picked.course || prev.name,
                                    plannedTime: picked.time || prev.plannedTime,
                                    // If the course has a specific duration field, we could use it here
                                    // For now we'll store the index to help the duration calculator
                                  }));
                                }
                              }}
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--text-main)', height: '42px' }}
                            >
                              <option value="">Scegli Corso...</option>
                              {(() => {
                                const loc = profile.locations[editForm.courseLocationId];
                                const courses = Array.isArray(loc.schedule) ? loc.schedule : [];
                                return courses
                                  .filter(c => c.day?.toLowerCase() === activeDay.toLowerCase())
                                  .map((c, i) => (
                                    <option key={i} value={i}>{c.time} - {c.course}</option>
                                  ));
                              })()}
                            </select>
                          )}
                        </div>
                      )}
                    </div>

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
                    <div className="ex-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`tag ${ex.type.toLowerCase()}`}>{ex.type}</span>
                      <h3 style={{ margin: 0 }}>{ex.name}</h3>
                      {(() => { 
                        const dur = calculateDuration(ex, profile?.locations || [], activeDay);
                        return dur > 0 ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>~{dur} min</span> : null;
                      })()}
                      {ex.plannedTime && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(185, 28, 28, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          🕒 {(() => {
                            if (ex.plannedTime.includes('-')) return ex.plannedTime;
                            const duration = calculateDuration(ex, profile?.locations || [], activeDay);
                            const endTime = addMinutesToTime(ex.plannedTime, duration);
                            return `${ex.plannedTime}${endTime ? '-' + endTime : ''}`;
                          })()}
                        </span>
                      )}
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
                          setActiveWorkout({ ...ex, sourceDay: activeDay, playTime: Date.now() });
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
                        <ChevronUp size={15} />
                      </button>
                    )}
                    {exIdx < activeExercises.length - 1 && (
                      <button className="btn-icon" style={{ padding: '4px', opacity: 0.6, fontSize: '0.7rem' }} title="Move Down" onClick={() => moveExercise(activeDay, exIdx, 1)}>
                        <ChevronDown size={15} />
                      </button>
                    )}

                    {/* Copy to day */}
                    <div style={{ position: 'relative' }}>
                      <button className="btn-icon" style={{ padding: '4px', fontSize: '0.7rem' }} title="Copy to another day" onClick={() => setCopyPickerFor(copyPickerFor === ex.id ? null : ex.id)}>
                        <Plus size={15} />
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

      {/* ── JSON Import Modal ─────────────────────────────────────── */}
      {jsonImport.open && (
        <div className="json-modal-overlay" onClick={closeJsonImport}>
          <div className="json-modal" onClick={e => e.stopPropagation()}>
            <div className="json-modal-header">
              <h3><FileCode2 size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                {jsonImport.mode === 'week' ? `Import Full Week → ${currentWeekId}` : `Import Day → ${activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}`}
              </h3>
              <button className="btn-icon" style={{ width: 32, height: 32 }} onClick={closeJsonImport}><X size={18} /></button>
            </div>

            <p className="json-modal-hint">
              {jsonImport.mode === 'week' ? 'Incolla un oggetto JSON con i giorni (monday, tuesday, wednesday, thursday, friday, saturday, sunday).' : 'Incolla un array di esercizi (o un singolo oggetto). Campi supportati:'}
            </p>

            <pre className="json-schema-example">{`[
  {
    "name": "Shadow Tecnico",
    "type": "Boxing",
    "notes": "4 round",
    "steps": [
      {
        "type": "interval",
        "name": "Shadow Rounds",
        "work": 180, "rest": 60, "rounds": 4,
        "instruction": "R1: jab. R2: combo."
      }
    ]
  }
]`}</pre>

            <textarea
              className="json-modal-textarea"
              placeholder='[ { "name": "...", "type": "Boxing", "steps": [] } ]'
              value={jsonImport.text}
              onChange={e => setJsonImport(s => ({ ...s, text: e.target.value, error: '' }))}
              spellCheck={false}
              autoFocus
            />

            {jsonImport.error && (
              <div className="json-modal-error">
                <AlertCircle size={14} />{jsonImport.error}
              </div>
            )}

            <div className="json-modal-actions">
              <button className="btn-secondary" onClick={closeJsonImport}><X size={16} /> Annulla</button>
              <button
                className="btn-primary"
                onClick={importExercisesFromJSON}
                disabled={!jsonImport.text.trim()}
              >
                <FileCode2 size={16} /> Importa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────── */}

      {/* Quick Log Bottom Sheet */}
      {quickLogTarget && (
        <QuickLogSheet
          exercise={quickLogTarget.exercise}
          logs={logs}
          onSave={(logData) => {
            setLogs(prev => prev.map(l =>
              l.id === quickLogTarget.logId ? { ...l, ...logData } : l
            ));
            setQuickLogTarget(null);
          }}
          onSkip={() => setQuickLogTarget(null)}
          onCancel={() => {
            setLogs(prev => prev.filter(l => l.id !== quickLogTarget.logId));
            const undoSchedule = { ...schedule };
            const undoEx = undoSchedule[quickLogTarget.day]?.find(e => e.id === quickLogTarget.exercise.id);
            if (undoEx) undoEx.done = false;
            setSchedule(undoSchedule);
            setQuickLogTarget(null);
          }}
        />
      )}
    </div>
  );
}
