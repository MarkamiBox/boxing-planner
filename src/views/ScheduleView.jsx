import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Check, Edit2, Plus, Trash2, X, Save, Play, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileCode2, AlertCircle, Copy, ArrowUp, ArrowDown, BookOpen } from 'lucide-react';
import { useDialog } from '../components/DialogContext';
import { TimeInput } from '../components/TimeInput';
import { getTodayDayName, getWeekId, getWeekDates, formatTime, calculateDuration, addMinutesToTime, generateId, sanitizeExercise, sanitizeSchedule } from '../utils';
import { useAppState } from '../hooks/useAppState';
import { QuickLogSheet } from '../components/QuickLogSheet';
import defaultMacros from '../data/defaultMacros';
import './schedule.css';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function ScheduleView({ profile, schedule, setSchedule, weeks, setWeeks, currentWeekId, setCurrentWeekId, setActiveWorkout, setActiveTab, logs, setLogs, onDirtyStateChange, workoutTemplates, setWorkoutTemplates }) {
  const { showAlert, showConfirm } = useDialog();
  const { t, language, hiddenMacros, setHiddenMacros, macroTagsMap, setMacroTagsMap } = useAppState();

  // ── Robust todayDay: updates on visibilitychange so it never stays fossilized
  const [todayDay, setTodayDay] = useState(() => getTodayDayName());
  useEffect(() => {
    const refresh = () => setTodayDay(getTodayDayName());
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // ── viewedWeekId is pure UI navigation; currentWeekId is the active (real) week
  const [viewedWeekId, setViewedWeekId] = useState(currentWeekId || getWeekId());
  // Keep viewedWeekId in sync when active week changes externally (e.g. day rollover)
  const prevActiveWeekRef = useRef(currentWeekId);
  useEffect(() => {
    if (currentWeekId && currentWeekId !== prevActiveWeekRef.current) {
      // Active week rolled over — snap the view back to active week
      setViewedWeekId(currentWeekId);
      prevActiveWeekRef.current = currentWeekId;
    }
  }, [currentWeekId]);

  const isViewingActive = viewedWeekId === currentWeekId;

  const [activeDay, setActiveDay] = useState(todayDay);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [copyPickerFor, setCopyPickerFor] = useState(null); // exerciseId being copied
  const [quickLogTarget, setQuickLogTarget] = useState(null); // { exercise, logId, day }
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const [editForm, setEditForm] = useState({ name: '', type: 'Boxing', notes: '', plannedTime: '', steps: [], isCourse: false, courseLocationId: '', courseId: '', courseIdx: '' });
  const [cloneMenuOpen, setCloneMenuOpen] = useState(false);
  const [deletedItem, setDeletedItem] = useState(null); // { day, exercise, index }
  const [weekUndoItem, setWeekUndoItem] = useState(null); // { weekId, prevSchedule, label }
  const undoTimerRef = useRef(null);
  const weekUndoTimerRef = useRef(null);
  const quickAddInputRef = useRef(null);
  const [selectedMacroIds, setSelectedMacroIds] = useState([]);
  const [isMacroListOpen, setIsMacroListOpen] = useState(false);
  const [macroSearchTerm, setMacroSearchTerm] = useState('');
  
  useEffect(() => {
    onDirtyStateChange?.(editingId !== null);
  }, [editingId, onDirtyStateChange]);

  // JSON Import state
  const [jsonImport, setJsonImport] = useState({ open: false, mode: 'day', text: '', error: '' });

  const lastLogByName = useMemo(() => {
    const map = {};
    (logs || []).forEach(log => {
      if (log.name && log.energy > 0) {
        if (!map[log.name] || log.date > map[log.name].date) {
          map[log.name] = log;
        }
      }
    });
    return map;
  }, [logs]);
  const hideMacro = (macroKey) => {
    const newHidden = [...hiddenMacros, macroKey];
    setHiddenMacros(newHidden);
  };

  const updateMacroTags = (macroKey, newTags) => {
    const newMap = { ...macroTagsMap, [macroKey]: newTags };
    setMacroTagsMap(newMap);
  };

  const historicalSteps = useMemo(() => {
    const stepsMap = new Map();
    const defaults = defaultMacros;
    defaults.forEach(d => stepsMap.set(d.name.toLowerCase(), { ...d, originalKey: d.name.toLowerCase() }));

    if (weeks) {
      Object.values(weeks).forEach(weekData => {
        Object.values(weekData).forEach(dayExs => {
          if (!Array.isArray(dayExs)) return;
          dayExs.forEach(ex => {
            // ONLY EXTRACT MACROS FROM EXERCISES THAT HAVE BEEN COMPLETED (done === true)
            if (ex.done && Array.isArray(ex.steps)) {
              ex.steps.forEach(step => {
                if (step.name && step.name.trim() !== 'New Step') {
                  const key = step.name.trim().toLowerCase();
                  if (!stepsMap.has(key) && !hiddenMacros.includes(key)) {
                    stepsMap.set(key, { ...step, originalKey: key, _isDefault: false, parentType: ex.type, tags: macroTagsMap[key] || [] });
                  }
                }
              });
            }
          });
        });
      });
    }
    return Array.from(stepsMap.values()).sort((a, b) => {
      // Keep defaults at top
      if (a._isDefault !== b._isDefault) return a._isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [weeks, hiddenMacros, macroTagsMap]);

  const getExerciseIcon = (type) => {
    switch (type) {
      case 'Boxing': return '🥊';
      case 'Running': return '🏃';
      case 'Gym':
      case 'Strength': return '🏋️';
      case 'Stretching': return '🧘';
      case 'Recovery': return '🛌';
      default: return '📋';
    }
  };

  const getStepMacroLabel = (s) => {
    let details = '';
    if (s.type === 'timer' || s.type === 'manual_timer') details = `${Math.round((s.duration||0)/60)}m`;
    else if (s.type === 'round' || s.type === 'interval') details = `${s.rounds||1}x${Math.round((s.work||0)/60)}'/${Math.round((s.rest||0)/60)}'`;
    else if (s.type === 'sets') details = `${s.sets||1} set`;
    else if (s.type === 'note' || s.type === 'text') details = `testo`;
    
    const icon = getExerciseIcon(s.parentType || 'Other');
    return `${s._isDefault ? '🤖' : '👤'} ${icon} ${s.name} (${details})`;
  };

  // Swipe gesture tracking
  const swipeStartX = useRef(null);

  const requestDayChange = (newDay) => {
    if (newDay === activeDay) return;
    if (editingId !== null) {
      showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Discard them?',
        () => {
          setEditingId(null);
          setActiveDay(newDay);
        }
      );
    } else {
      setActiveDay(newDay);
    }
  };

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

    const format = (d) => d.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    return language === 'it' ? `${format(ISOweekStart)} al ${format(end)}` : `${format(ISOweekStart)} to ${format(end)}`;
  };

  const changeWeek = (direction) => {
    const baseId = viewedWeekId || currentWeekId;
    if (!baseId || !weeks) return;
    const { y, w } = parseWeek(baseId);
    let newY = y;
    let newW = w + direction;
    if (newW > 52) { newW = 1; newY++; }
    if (newW < 1) { newW = 52; newY--; }

    const newId = getWeekString(newY, newW);
    // Pure navigation — no auto-clone, no IDB write
    setViewedWeekId(newId);
    // If the viewed week has no data yet, we do NOT clone; the empty state shows a prompt
  };

  // ── The viewed schedule (uses viewedWeekId for display)
  const viewedSchedule = useMemo(() => {
    if (weeks && viewedWeekId && weeks[viewedWeekId]) return weeks[viewedWeekId];
    return { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
  }, [weeks, viewedWeekId]);

  // setSchedule writes to the VIEWED week
  const setViewedSchedule = (newSchedule) => {
    setWeeks(prev => ({ ...(prev || {}), [viewedWeekId]: newSchedule }));
  };

  const toggleDone = (day, exerciseId) => {
    // Toggle is on the viewed schedule
    const originalEx = viewedSchedule[day]?.find(e => e.id === exerciseId);
    if (!originalEx) return;

    const newDoneState = !originalEx.done;
    const newSchedule = {
      ...viewedSchedule,
      [day]: viewedSchedule[day].map(e => e.id === exerciseId ? { ...e, done: newDoneState } : e)
    };
    setViewedSchedule(newSchedule);

    // originId always references the ACTIVE week (so logs are pinned to the real week)
    const sessionOriginId = `${currentWeekId}-${day}-${exerciseId}`;

    if (newDoneState) {
      const logId = generateId();
      const exerciseSnapshot = JSON.parse(JSON.stringify(originalEx));
      exerciseSnapshot.done = newDoneState;
      const initialLogData = {
        ...exerciseSnapshot,
        id: logId,
        originId: sessionOriginId,
        date: new Date().toISOString().split('T')[0],
        weekId: currentWeekId,  // always the real active week
        energy: 0,
        cardio: 0,
        legs: 0,
        intensity: 0,
        focus: 0,
        notes: exerciseSnapshot.notes || 'Sessione veloce dallo Schedule'
      };
      setQuickLogTarget({ exercise: { ...originalEx, done: newDoneState }, day, initialLogData });
    } else {
      // Se togli la spunta, elimina il log associato
      setLogs(prev => prev.filter(l => l.originId !== sessionOriginId));
    }
  };

  const startEdit = (exercise) => {
    setEditingId(exercise.id);
    setEditForm({
      name: exercise.name,
      type: exercise.type,
      notes: exercise.notes || '',
      plannedTime: exercise.plannedTime || '',
      steps: exercise.steps ? exercise.steps.map(s => ({ ...s, id: s.id || generateId() })) : [],
      isCourse: exercise.isCourse || false,
      courseLocationId: exercise.courseLocationId || '',
      courseId: exercise.courseId || '',
      courseIdx: exercise.courseIdx || ''
    });
  };

  const saveEdit = (day) => {
    const newSchedule = {
      ...viewedSchedule,
      [day]: viewedSchedule[day].map(e => e.id === editingId ? { ...e, ...editForm } : e)
    };
    setViewedSchedule(newSchedule);
    setEditingId(null);
  };

  const deleteExercise = (day, exerciseId) => {
    const exerciseToDelete = viewedSchedule[day]?.find(e => e.id === exerciseId);
    const exerciseIdx = viewedSchedule[day]?.findIndex(e => e.id === exerciseId);
    if (!exerciseToDelete) return;

    setDeletedItem({ day, exercise: exerciseToDelete, index: exerciseIdx });

    const newSchedule = {
      ...viewedSchedule,
      [day]: viewedSchedule[day].filter(e => e.id !== exerciseId)
    };
    setViewedSchedule(newSchedule);
    setEditingId(null);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setDeletedItem(null);
    }, 5000);
  };

  const undoDelete = () => {
    if (!deletedItem) return;
    const { day, exercise, index } = deletedItem;
    const arr = [...(viewedSchedule[day] || [])];
    arr.splice(index, 0, exercise);
    const newSchedule = {
      ...viewedSchedule,
      [day]: arr
    };
    setViewedSchedule(newSchedule);
    setDeletedItem(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const moveExercise = (day, idx, dir) => {
    const arr = [...(viewedSchedule[day] || [])];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    const newSchedule = {
      ...viewedSchedule,
      [day]: arr
    };
    setViewedSchedule(newSchedule);
  };

  const copyExerciseTo = (ex, targetDay) => {
    const cloned = JSON.parse(JSON.stringify(ex));
    cloned.id = generateId();
    cloned.steps = (cloned.steps || []).map(s => ({ ...s, id: generateId() }));
    cloned.done = false;
    const newSchedule = {
      ...viewedSchedule,
      [targetDay]: [...(viewedSchedule[targetDay] || []), cloned]
    };
    setViewedSchedule(newSchedule);
    setCopyPickerFor(null);
  };

  const addExercise = (day) => {
    const newId = generateId();
    const newExercise = {
      id: newId,
      type: 'Boxing',
      name: 'New Exercise',
      done: false,
      notes: '',
      plannedTime: '',
      steps: []
    };
    const newSchedule = {
      ...viewedSchedule,
      [day]: [...(viewedSchedule[day] || []), newExercise]
    };
    setViewedSchedule(newSchedule);
    startEdit(newExercise);
  };

  const quickAdd = (day, name, type) => {
    if (!name.trim()) return;
    const newExercise = {
      id: generateId(),
      type: type || 'Boxing',
      name: name.trim(),
      done: false,
      notes: '',
      plannedTime: '',
      steps: []
    };
    const newSchedule = {
      ...viewedSchedule,
      [day]: [...(viewedSchedule[day] || []), newExercise]
    };
    setViewedSchedule(newSchedule);
  };

  // ── Week undo helper
  const triggerWeekUndo = (label, prevSchedule) => {
    setWeekUndoItem({ weekId: viewedWeekId, prevSchedule, label });
    if (weekUndoTimerRef.current) clearTimeout(weekUndoTimerRef.current);
    weekUndoTimerRef.current = setTimeout(() => setWeekUndoItem(null), 8000);
  };

  const undoWeekChange = () => {
    if (!weekUndoItem) return;
    setWeeks(prev => ({ ...(prev || {}), [weekUndoItem.weekId]: weekUndoItem.prevSchedule }));
    setWeekUndoItem(null);
    if (weekUndoTimerRef.current) clearTimeout(weekUndoTimerRef.current);
  };

  const handleCloneLastWeek = () => {
    const { y, w } = parseWeek(viewedWeekId);
    let newY = y; let newW = w - 1;
    if (newW < 1) { newW = 52; newY--; }
    const prevWeekId = getWeekString(newY, newW);
    const prevScheduleData = weeks[prevWeekId];
    if (prevScheduleData) {
      const cloned = JSON.parse(JSON.stringify(prevScheduleData));
      Object.keys(cloned).forEach(d => cloned[d].forEach(ex => ex.done = false));
      triggerWeekUndo('Clona settimana precedente', viewedSchedule);
      setViewedSchedule(cloned);
    } else {
      showAlert('Errore', `Nessuna programmazione trovata per la settimana ${prevWeekId}.`);
    }
    setCloneMenuOpen(false);
  };

  // Called from empty state button: clone previous week into the currently viewed empty week
  const handleCloneFromPrevious = () => {
    const { y, w } = parseWeek(viewedWeekId);
    let newY = y; let newW = w - 1;
    if (newW < 1) { newW = 52; newY--; }
    const prevWeekId = getWeekString(newY, newW);
    const prevScheduleData = weeks[prevWeekId];
    if (prevScheduleData) {
      const cloned = JSON.parse(JSON.stringify(prevScheduleData));
      Object.keys(cloned).forEach(d => cloned[d].forEach(ex => ex.done = false));
      setViewedSchedule(cloned);
    } else {
      showAlert('Errore', 'Nessuna settimana precedente trovata.');
    }
  };
  
  const handleClearWeek = () => {
    showConfirm('Pulisci Settimana', "Sei sicuro di voler svuotare l'intera settimana?", () => {
      const blank = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
      triggerWeekUndo('Svuota settimana', viewedSchedule);
      setViewedSchedule(blank);
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
      try {
        const sanitizedWeek = sanitizeSchedule(parsed);
        triggerWeekUndo('Import settimana JSON', viewedSchedule);
        setViewedSchedule(sanitizedWeek);
        closeJsonImport();
        showAlert('Successo', 'Settimana importata e sanitizzata correttamente!');
      } catch (err) {
        setJsonImport(s => ({ ...s, error: err.message || 'Errore durante la sanitizzazione della settimana.' }));
      }
      return;
    }

    // Day mode: Accept both a single object or an array
    const rawExercises = Array.isArray(parsed) ? parsed : [parsed];
    const normalised = rawExercises.map((e, i) => sanitizeExercise(e, `import-d-${generateId()}-${i}`));

    const newSchedule = {
      ...viewedSchedule,
      [activeDay]: [...(viewedSchedule[activeDay] || []), ...normalised]
    };
    setViewedSchedule(newSchedule);
    closeJsonImport();
    showAlert('Import OK', `${normalised.length} esercizio/i aggiunto/i a ${activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}.`);
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Swipe to change day ───────────────────────────────────────────────────────
  const handleTouchStart = (e) => { swipeStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (swipeStartX.current === null) return;
    const diff = swipeStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return; // ignore tiny swipes
    const idx = daysOfWeek.indexOf(activeDay);
    if (diff > 0 && idx < daysOfWeek.length - 1) requestDayChange(daysOfWeek[idx + 1]);
    if (diff < 0 && idx > 0) requestDayChange(daysOfWeek[idx - 1]);
    swipeStartX.current = null;
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // --- Step Builder Core ---
  const addStep = () => {
    const newStep = { id: generateId(), type: 'timer', autoAdvance: true, name: 'New Step', duration: 180, instruction: '' };
    setEditForm({ ...editForm, steps: [...editForm.steps, newStep] });
  };

  const updateStep = (idx, field, value) => {
    const newSteps = [...editForm.steps];
    let step = { ...newSteps[idx] };

    if (field === 'type') {
      const { id, name, instruction } = step;
      // Start fresh with common fields only
      step = { id, name, type: value, instruction };

      if (value === 'timer') {
        step.duration = 180;
        step.autoAdvance = true;
      } else if (value === 'round') {
        step.work = 180;
        step.rest = 60;
        step.rounds = 3;
      } else if (value === 'sets') {
        step.sets = 3;
        step.reps = '10 reps';
        step.rest = 60;
      }
      // note type doesn't need extra fields at init
    } else {
      step[field] = value;
    }

    newSteps[idx] = step;
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
    const rounds = (step.type === 'round' || step.type === 'interval') ? (step.rounds || 1) : (step.sets || 1);
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
            <option value="timer">Timer (Durata)</option>
            <option value="round">Round (Work/Rest)</option>
            <option value="sets">Set (Reps/Rest)</option>
            <option value="note">Nota (Solo testo)</option>
            {/* Legacy fallbacks */}
            {step.type === 'manual_timer' && <option value="manual_timer">Legacy Timer</option>}
            {step.type === 'interval' && <option value="interval">Legacy Interval</option>}
            {step.type === 'text' && <option value="text">Legacy Text</option>}
          </select>
          <button className="btn-icon danger" onClick={() => removeStep(idx)} style={{ padding: '4px' }}><Trash2 size={16}/></button>
        </div>
        
        <input type="text" placeholder="Step Name" value={step.name} onChange={e => updateStep(idx, 'name', e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '6px', fontSize: '0.85rem' }} />

        {(step.type === 'timer' || step.type === 'manual_timer') && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
             <TimeInput label="Duration" value={step.duration} onChange={val => updateStep(idx, 'duration', val)} style={{ flex: 1, minWidth: '120px' }} />
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)', minWidth: '80px' }}>
               Prep (s):
               <input type="number" min="0" placeholder="default" value={step.prepTime !== undefined ? step.prepTime : ''} onChange={e => updateStep(idx, 'prepTime', e.target.value === '' ? undefined : Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
             {step.type === 'timer' && (
               <label style={{ fontSize: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '14px', whiteSpace: 'nowrap' }}>
                 <input type="checkbox" checked={step.autoAdvance !== false} onChange={e => updateStep(idx, 'autoAdvance', e.target.checked)} />
                 Auto-advance
               </label>
             )}
           </div>
        )}
        {(step.type === 'round' || step.type === 'interval') && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
             <TimeInput label="Work" value={step.work} onChange={val => updateStep(idx, 'work', val)} style={{ flex: 1, minWidth: '80px' }} />
             <TimeInput label="Rest" value={step.rest} onChange={val => updateStep(idx, 'rest', val)} style={{ flex: 1, minWidth: '80px' }} />
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)', minWidth: '60px' }}>Rnds:
               <input type="number" value={step.rounds} onChange={e => updateStep(idx, 'rounds', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)', minWidth: '80px' }}>
               Prep (s):
               <input type="number" min="0" placeholder="default" value={step.prepTime !== undefined ? step.prepTime : ''} onChange={e => updateStep(idx, 'prepTime', e.target.value === '' ? undefined : Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
           </div>
        )}
        {step.type === 'sets' && (
           <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
             <label style={{ fontSize: '0.75rem', flex: 1, color: 'var(--text-muted)', minWidth: '60px' }}>Sets:
               <input type="number" value={step.sets} onChange={e => updateStep(idx, 'sets', Number(e.target.value))} style={{ width: '100%', padding: '4px', marginTop: '2px' }} />
             </label>
             <label style={{ fontSize: '0.75rem', flex: 1.5, color: 'var(--text-muted)', minWidth: '100px' }}>Reps:
               <input type="text" value={step.reps || ''} onChange={e => updateStep(idx, 'reps', e.target.value)} style={{ width: '100%', padding: '4px', marginTop: '2px' }} placeholder="e.g. 10 reps" />
             </label>
             <div style={{ flex: 1, minWidth: '80px' }}>
               <TimeInput label="Rest" value={step.rest} onChange={val => updateStep(idx, 'rest', val)} style={{ width: '100%' }} />
             </div>
           </div>
        )}

        {(((step.type === 'round' || step.type === 'interval') && (step.rounds || 0) > 1) || (step.type === 'sets' && (step.sets || 0) > 1)) ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
             {Array.from({ length: ((step.type === 'round' || step.type === 'interval') ? step.rounds : step.sets) }).map((_, rIdx) => {
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

  const activeExercises = viewedSchedule[activeDay] || [];

  // Pre-compute week dates for day number chips
  const weekDates = useMemo(() => getWeekDates(viewedWeekId), [viewedWeekId]);

  const getDayCompletion = (day) => {
    const exs = viewedSchedule[day] || [];
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

  const formatStepDescription = (step) => {
    if (step.type === 'timer' || step.type === 'manual_timer') return `${formatTime(step.duration)} ⏺`;
    if (step.type === 'interval') return `${step.rounds} Rnd x ${formatTime(step.work)} / ${formatTime(step.rest)}`;
    if (step.type === 'sets') return `${step.sets} Set x ${step.reps} (Rest: ${formatTime(step.rest)})`;
    return '📝';
  };

  return (
    <div className="page-container schedule-view">
      <div className="schedule-header">
        <h1 className="page-title">{t('schedule')}</h1>
        {(viewedWeekId || currentWeekId) && (
          <div className="week-nav">
            <button className="btn-icon" onClick={() => changeWeek(-1)} style={{ padding: '2px' }}><ChevronLeft size={20} /></button>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isViewingActive ? (
                <span className="week-badge-active">Questa settimana</span>
              ) : null}
              <span className="week-range-text">
                {getWeekDateRange(viewedWeekId || currentWeekId)}
              </span>
              <button className="btn-text" style={{ padding: '2px 4px', marginLeft: '4px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setCloneMenuOpen(!cloneMenuOpen)}>
                <ChevronDown size={16} />
              </button>
              {cloneMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.25rem', zIndex: 100, minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px' }}>
                  <button onClick={handleCloneLastWeek} className="btn-text" style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--text-main)', fontSize: '0.85rem' }}><Copy size={14} style={{ marginRight: '6px' }} /> {t('clone_last_week')}</button>
                  <button onClick={() => { setJsonImport({ open: true, mode: 'week', text: '', error: '' }); setCloneMenuOpen(false); }} className="btn-text" style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--text-main)', fontSize: '0.85rem' }}><FileCode2 size={14} style={{ marginRight: '6px' }} /> {t('import_week_json')}</button>
                  <button onClick={handleClearWeek} className="btn-text" style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--primary)', fontSize: '0.85rem' }}><Trash2 size={14} style={{ marginRight: '6px' }} /> {t('start_blank')}</button>
                </div>
              )}
            </div>
            <button className="btn-icon" onClick={() => changeWeek(1)} style={{ padding: '2px' }}><ChevronRight size={20} /></button>
          </div>
        )}
      </div>

      {/* Banner: viewing past or future week */}
      {!isViewingActive && (
        <div className="week-context-banner" style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '10px',
          padding: '0.6rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: '#fcd34d',
        }}>
          <span>📅 Stai guardando la settimana del {getWeekDateRange(viewedWeekId)}</span>
          <button
            className="btn-primary"
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}
            onClick={() => setViewedWeekId(currentWeekId)}
          >
            Torna ad oggi
          </button>
        </div>
      )}

      {/* Undo banner: week-level destructive operation */}
      {weekUndoItem && (
        <div className="undo-banner" style={{
          position: 'fixed',
          bottom: '160px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface)',
          border: '1px solid #f59e0b',
          color: 'var(--text-main)',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 2001,
          animation: 'slideUpUndo 0.3s ease-out',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '0.9rem' }}>Settimana modificata ({weekUndoItem.label})</span>
          <button className="btn-primary" onClick={undoWeekChange} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Annulla</button>
          <button onClick={() => setWeekUndoItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {deletedItem && (
        <div className="undo-banner" style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface)',
          border: '1px solid var(--primary)',
          color: 'var(--text-main)',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 2000,
          animation: 'slideUpUndo 0.3s ease-out'
        }}>
          <span style={{ fontSize: '0.9rem' }}>{t('exercise_deleted')} ({deletedItem.exercise.name})</span>
          <button className="btn-primary" onClick={undoDelete} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>{t('undo')}</button>
          <button onClick={() => setDeletedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      <div className="days-selector">
        {daysOfWeek.map((day, dayIdx) => {
          const comp = getDayCompletion(day);
          const dayDate = weekDates[dayIdx];
          const dayNum = dayDate ? dayDate.getUTCDate() : '';
          return (
            <button
              key={day}
              className={`day-btn ${activeDay === day ? 'active' : ''} ${day === todayDay && isViewingActive ? 'today' : ''} ${comp && comp.done === comp.total && comp.total > 0 ? 'day-complete' : ''}`}
              onClick={() => requestDayChange(day)}
            >
              <span className="day-btn-label">{t('short_days')[dayIdx]}</span>
              <span className="day-btn-num">{dayNum}</span>
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
            <h2>{t(`days.${activeDay}`)}</h2>
            {getDayTotalDuration() && <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>{getDayTotalDuration()}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-icon import-json-btn" title={t('import_json')} onClick={() => setJsonImport({ open: true, mode: 'day', text: '', error: '' })}>
              <FileCode2 size={18} />
            </button>
            <button className="btn-icon add-btn" onClick={() => addExercise(activeDay)}>
              <Plus size={20} title={t('add_exercise')} />
            </button>
            <button 
              className="btn-icon" 
              title="Load from template"
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              style={{ color: showTemplatePicker ? 'var(--primary)' : undefined }}
            >
              <BookOpen size={18} />
            </button>
          </div>
        </div>

        {showTemplatePicker && workoutTemplates?.length > 0 && (
          <div style={{ 
            background:'var(--surface)', border:'1px solid var(--border-color)',
            borderRadius:'8px', padding:'0.75rem', marginBottom:'1rem'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              marginBottom:'0.5rem', fontSize:'0.85rem', fontWeight:600 }}>
              <span>Templates</span>
              <button 
                onClick={() => setShowTemplatePicker(false)}
                style={{ background:'none', border:'none', 
                  color:'var(--text-muted)', cursor:'pointer' }}
              >×</button>
            </div>
            {workoutTemplates.map(tmpl => (
              <div key={tmpl.id} style={{ 
                display:'flex', justifyContent:'space-between', 
                alignItems:'center', padding:'0.4rem 0',
                borderBottom:'1px solid var(--border-color)' 
              }}>
                <div>
                  <div style={{ fontSize:'0.85rem', fontWeight:600 }}>
                    {tmpl.name}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                    {tmpl.type} · {tmpl.steps?.length || 0} steps
                  </div>
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button 
                    className="btn-primary"
                    style={{ padding:'0.3rem 0.6rem', fontSize:'0.75rem' }}
                    onClick={() => {
                      const newSchedule = { ...viewedSchedule }
                      const newId = generateId()
                      newSchedule[activeDay] = [
                        ...(newSchedule[activeDay] || []),
                        { 
                          id: newId,
                          type: tmpl.type,
                          name: tmpl.name,
                          notes: tmpl.notes || '',
                          plannedTime: '',
                          done: false,
                          steps: tmpl.steps ? tmpl.steps.map(s => ({ 
                            ...s, id: generateId() 
                          })) : []
                        }
                      ]
                      setViewedSchedule(newSchedule)
                      setShowTemplatePicker(false)
                    }}
                  >Use</button>
                  <button 
                    className="btn-icon danger"
                    style={{ width:'28px', height:'28px' }}
                    onClick={() => setWorkoutTemplates(prev => 
                      prev.filter(t => t.id !== tmpl.id)
                    )}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeExercises.length === 0 ? (
          <div className="empty-state">
            {t('rest_day')}
            {viewedSchedule && Object.values(viewedSchedule).every(arr => arr.length === 0) && !isViewingActive ? (
              // Empty week that was navigated to
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Questa settimana è vuota.</p>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                  onClick={handleCloneFromPrevious}
                >
                  <Copy size={14} style={{ marginRight: '4px' }} /> Copia da settimana precedente
                </button>
              </div>
            ) : (
              activeDay === todayDay && isViewingActive && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                  Tap + to add an exercise, or ask your Coach to plan this week.
                </div>
              )
            )}
          </div>
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
                    {editForm.isCourse && (editForm.courseId || editForm.courseIdx !== '') ? (
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
                            onChange={e => setEditForm(prev => ({ ...prev, courseLocationId: e.target.value, courseId: '', courseIdx: '' }))}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: 'var(--surface)', color: 'var(--text-main)', height: '42px' }}
                          >
                            <option value="">Seleziona Luogo...</option>
                            {(profile?.locations || []).map((loc, idx) => (
                              <option key={idx} value={idx}>{loc.name || `Luogo ${idx + 1}`}</option>
                            ))}
                          </select>

                          {editForm.courseLocationId !== '' && (
                            <select
                              value={editForm.courseId || editForm.courseIdx}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '') return;
                                const loc = profile.locations[editForm.courseLocationId];
                                const courses = Array.isArray(loc.schedule) ? loc.schedule : [];
                                const filtered = courses.filter(c => c.day?.toLowerCase() === activeDay.toLowerCase());
                                
                                // Try to find by courseId first, then fallback to index for legacy support
                                let picked = filtered.find(c => c.courseId === val);
                                if (!picked && !isNaN(val)) {
                                  picked = filtered[val];
                                }

                                if (picked) {
                                  setEditForm(prev => ({
                                    ...prev,
                                    courseId: picked.courseId || '',
                                    courseIdx: picked.courseId ? '' : val, // Only save index as fallback
                                    name: picked.course || prev.name,
                                    plannedTime: picked.time || prev.plannedTime,
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
                                    <option key={c.courseId || i} value={c.courseId || i}>{c.time} - {c.course}</option>
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
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>Quick Macro:</span>
                        
                        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                          <button
                            className="btn-text"
                            style={{ width: '100%', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border-color)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onClick={() => setIsMacroListOpen(!isMacroListOpen)}
                          >
                            <span>Seleziona macro salvate ({selectedMacroIds.length})</span>
                            <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                          </button>
                          
                          {isMacroListOpen && (
                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', maxHeight: '350px', display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                              <div style={{ padding: '0.4rem' }}>
                                <input 
                                  type="text" 
                                  placeholder="Cerca macro o tag..." 
                                  value={macroSearchTerm}
                                  onChange={(e) => setMacroSearchTerm(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
                                />
                              </div>
                              <div style={{ overflowY: 'auto', flex: 1 }}>
                                {historicalSteps.filter(s => {
                                  if (!macroSearchTerm.trim()) return true;
                                  const term = macroSearchTerm.toLowerCase();
                                  if (s.name.toLowerCase().includes(term)) return true;
                                  if (s.tags && s.tags.some(t => t.toLowerCase().includes(term))) return true;
                                  return false;
                                }).map(s => (
                                  <div key={s.originalKey} style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={selectedMacroIds.includes(s.originalKey)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedMacroIds([...selectedMacroIds, s.originalKey]);
                                        else setSelectedMacroIds(selectedMacroIds.filter(id => id !== s.originalKey));
                                      }}
                                      style={{ width: 'auto', flex: '0 0 auto', marginRight: '8px', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }} onClick={() => {
                                      if (selectedMacroIds.includes(s.originalKey)) setSelectedMacroIds(selectedMacroIds.filter(id => id !== s.originalKey));
                                      else setSelectedMacroIds([...selectedMacroIds, s.originalKey]);
                                    }}>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{getStepMacroLabel(s)}</span>
                                      {s.tags && s.tags.length > 0 && (
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                                          {s.tags.map(tag => (
                                            <span key={tag} style={{ fontSize: '0.65rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0 4px', borderRadius: '4px' }}>{tag}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {historicalSteps.length === 0 && (
                                  <div style={{ padding: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Nessuna macro salvata.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <button 
                          className="btn-primary" 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                          disabled={selectedMacroIds.length === 0}
                          onClick={() => {
                            const newSteps = [];
                            selectedMacroIds.forEach(id => {
                              const stepToCopy = historicalSteps.find(s => s.originalKey === id);
                              if (stepToCopy) newSteps.push({ ...stepToCopy, id: generateId() });
                            });
                            if (newSteps.length > 0) {
                              setEditForm(prev => ({ ...prev, steps: [...prev.steps, ...newSteps] }));
                              setSelectedMacroIds([]);
                              setIsMacroListOpen(false);
                            }
                          }}
                        >
                          <Plus size={16} /> Aggiungi
                        </button>
                      </div>
                      
                      {selectedMacroIds.length > 0 && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {selectedMacroIds.map(id => {
                            const s = historicalSteps.find(st => st.originalKey === id);
                            if (!s) return null;
                            return (
                              <div key={id} style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                  <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', marginBottom: '4px', alignItems: 'center' }}>
                                      {s.tags && s.tags.map(tag => (
                                        <span key={tag} style={{ fontSize: '0.65rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          {tag}
                                          {!s._isDefault && (
                                            <button className="btn-text" style={{ padding: 0, margin: 0, color: 'var(--primary)', height: '12px' }} onClick={() => updateMacroTags(s.originalKey, s.tags.filter(t => t !== tag))}>×</button>
                                          )}
                                        </span>
                                      ))}
                                      {!s._isDefault && (
                                        <input 
                                          type="text" 
                                          placeholder="+ tag" 
                                          style={{ fontSize: '0.65rem', padding: '2px 4px', border: '1px dashed var(--border-color)', borderRadius: '4px', background: 'transparent', width: '80px', color: 'var(--text-main)' }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              if (e.target.value.trim()) {
                                                const newTag = e.target.value.trim();
                                                const currentTags = s.tags || [];
                                                if (!currentTags.includes(newTag)) updateMacroTags(s.originalKey, [...currentTags, newTag]);
                                                e.target.value = '';
                                              }
                                            }
                                          }}
                                          onBlur={(e) => {
                                            if (e.target.value.trim()) {
                                              const newTag = e.target.value.trim();
                                              const currentTags = s.tags || [];
                                              if (!currentTags.includes(newTag)) updateMacroTags(s.originalKey, [...currentTags, newTag]);
                                              e.target.value = '';
                                            }
                                          }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                  {!s._isDefault && (
                                    <button 
                                      className="btn-icon danger" 
                                      style={{ padding: '2px' }}
                                      title="Nascondi questa macro"
                                      onClick={() => {
                                        hideMacro(s.originalKey);
                                        setSelectedMacroIds(selectedMacroIds.filter(mid => mid !== s.originalKey));
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                                {s.type === 'round' && <div>Round: {s.rounds}x ({Math.round(s.work/60)}' lav / {Math.round(s.rest/60)}' rip)</div>}
                                {(s.type === 'timer' || s.type === 'manual_timer') && <div>Timer: {Math.round(s.duration/60)} minuti</div>}
                                {s.type === 'sets' && <div>Sets: {s.sets}x {s.reps} (rec {s.rest}s)</div>}
                                {s.instruction && <div style={{ marginTop: '2px', fontStyle: 'italic', opacity: 0.8 }}>"{s.instruction}"</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {editForm.steps.map((step, idx) => renderStepEditor(step, idx))}
                    {editForm.steps.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No guided steps. Timer will not be available for this exercise.</p>}
                  </div>

                  <div className="editor-actions" style={{ marginTop: '1rem' }}>
                    <button className="btn-icon danger" onClick={() => deleteExercise(activeDay, ex.id)}>
                      <Trash2 size={18} />
                    </button>
                    {editingId !== null && (
                      <button 
                        className="btn-secondary"
                        style={{ fontSize:'0.8rem', padding:'0.4rem 0.6rem' }}
                        onClick={() => {
                          const template = {
                            id: generateId(),
                            name: editForm.name,
                            type: editForm.type,
                            notes: editForm.notes,
                            steps: editForm.steps,
                            savedAt: new Date().toISOString()
                          }
                          setWorkoutTemplates(prev => [template, ...prev])
                          showAlert('Template saved', 
                            `"${editForm.name}" saved as a template.`)
                        }}
                      >
                        Save template
                      </button>
                    )}
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

                    {(() => {
                      const last = lastLogByName[ex.name];
                      if (!last) return null;
                      return (
                        <div style={{
                          display: 'flex', gap: '0.5rem', marginTop: '4px', flexWrap: 'wrap',
                          fontSize: '0.75rem', color: 'var(--text-muted)',
                          borderLeft: '2px solid var(--border-color)', paddingLeft: '8px'
                        }}>
                          <span>Last: {last.date}</span>
                          {last.duration && <span>· {last.duration}</span>}
                          {last.rpe > 0 && <span>· RPE:{last.rpe}</span>}
                          {last.feelTags && last.feelTags.length > 0 && <span>· {last.feelTags.join(', ')}</span>}
                          {last.headTags && last.headTags.length > 0 && <span>· {last.headTags.join(', ')}</span>}
                        </div>
                      );
                    })()}

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
                    {/* Duplicate session */}
                    <button
                      className="btn-icon"
                      title="Duplica sessione"
                      style={{ padding: '4px', opacity: 0.8 }}
                      onClick={() => {
                        const cloned = JSON.parse(JSON.stringify(ex));
                        cloned.id = generateId();
                        cloned.done = false;
                        cloned.steps = (cloned.steps || []).map(s => ({ ...s, id: generateId() }));
                        const newSchedule = {
                          ...viewedSchedule,
                          [activeDay]: [...(viewedSchedule[activeDay] || []), cloned]
                        };
                        setViewedSchedule(newSchedule);
                      }}
                    >
                      <Copy size={15} />
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
            const finalLog = {
              ...quickLogTarget.initialLogData,
              ...logData
            };
            setLogs(prev => [finalLog, ...prev]);
            setQuickLogTarget(null);
          }}
          onSkip={() => {
            setLogs(prev => [quickLogTarget.initialLogData, ...prev]);
            setQuickLogTarget(null);
          }}
          onCancel={() => {
            const day = quickLogTarget.day;
            const exId = quickLogTarget.exercise.id;
            const newSchedule = {
              ...schedule,
              [day]: schedule[day].map(e => e.id === exId ? { ...e, done: false } : e)
            };
            setSchedule(newSchedule);
            setQuickLogTarget(null);
          }}
        />
      )}
    </div>
  );
}
