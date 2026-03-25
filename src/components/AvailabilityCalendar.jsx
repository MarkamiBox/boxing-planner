import React, { useState, useRef, useCallback, useEffect } from 'react';
import './AvailabilityCalendar.css';
import { addMinutesToTime, calculateDuration, timeToMinutes } from '../utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const START_HOUR = 6;   // 06:00
const END_HOUR = 24;    // up to 23:30 (exclusive 24:00)
const SLOT_MINS = 30;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINS; // 36 rows

const REASONS = ['work', 'social', 'travel', 'rest', 'family', 'other'];
const REASON_LABELS = { work: 'Work', social: 'Social', travel: 'Travel', rest: 'Rest', family: 'Family', other: 'Other' };
const ENERGY_OPTIONS = ['drained', 'neutral', 'fresh'];

function slotIndexFromTime(hhmm) {
  if (!hhmm) return 0;
  // If hhmm is a range (e.g. 15:15-16:15), only use the start time
  const startTimePart = hhmm.split('-')[0];
  const [h, m] = startTimePart.split(':').map(Number);
  return ((h - START_HOUR) * 60 + m) / SLOT_MINS;
}

function slotIndexToLabel(idx) {
  const totalMins = START_HOUR * 60 + idx * SLOT_MINS;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function stringToHue(str) {
  if (!str) return 200;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let hue = Math.abs(hash % 360);
  const primaryHues = [24, 48, 142, 217, 273];
  for (const ph of primaryHues) {
    if (Math.abs(hue - ph) < 20) {
      hue = (hue + 120) % 360;
      break;
    }
  }
  return hue;
}



// ─── Exported Utility Functions ───────────────────────────────────────────────

export function compressAvailability(availability, locations, profile) {
  const dayAbbr = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
  const parts = [];
  let primeWindows = 0;
  const primeDays = [];

  for (const day of DAYS) {
    const slots = availability[day] || [];
    if (slots.length === 0) {
      parts.push(`${dayAbbr[day]}: PRIME free all day`);
      primeWindows++;
      primeDays.push(dayAbbr[day]);
      continue;
    }

    const hardSlots = slots.filter(s => s.importance === 'hard');
    const softSlots = slots.filter(s => s.importance === 'soft');
    const allBusy = slots.length > 0 && hardSlots.length === slots.length && slots.every(s => s.reason === 'rest' || s.reason === 'work');

    if (allBusy) {
      parts.push(`${dayAbbr[day]}: REST busy all day`);
      continue;
    }

    const slotDescs = slots.map(s => {
      const buf = calculateEffectiveWindow(s, slots, locations, profile);
      const locHint = (s.reason === 'rest' || s.reason === 'work') ? '' : '';
      return `${s.importance === 'hard' ? 'hard' : 'soft'} ${s.reason} ${s.start}-${s.end} ${s.energyAfter}${locHint}`;
    }).join(', ');

    parts.push(`${dayAbbr[day]}: ${slotDescs}`);
    primeWindows++;
    primeDays.push(dayAbbr[day]);
  }

  const structure = primeWindows >= 5
    ? 'recommend Hard-Technical-Conditioning-Rest-Full-Recovery structure'
    : primeWindows >= 3
      ? 'recommend Technical-Conditioning-Recovery structure'
      : 'limited training week — prioritise recovery';

  parts.push(`WEEK ASSESSMENT: ${primeWindows} prime windows ${primeDays.join('/')}, ${structure}`);
  return parts.join(' | ');
}

export function detectSkipPatterns(logs, weeks, currentWeekId) {
  if (!logs || !weeks) return [];
  const patterns = [];
  const daySlots = {};

  const weekIds = Object.keys(weeks).sort().filter(w => w !== currentWeekId).slice(-4);
  for (const wid of weekIds) {
    const schedule = weeks[wid];
    if (!schedule) continue;
    for (const day of DAYS) {
      const sessions = (schedule[day] || []);
      for (const s of sessions) {
        if (!s.plannedTime) continue;
        const key = day;
        if (!daySlots[key]) daySlots[key] = { planned: 0, done: 0 };
        daySlots[key].planned++;
        const logged = logs.find(l => l.sessionId === s.id && l.done);
        if (logged) daySlots[key].done++;
      }
    }
  }

  for (const [day, stats] of Object.entries(daySlots)) {
    if (stats.planned >= 2) {
      const skipRate = 1 - stats.done / stats.planned;
      if (skipRate >= 0.6) {
        const skips = stats.planned - stats.done;
        const dayLabel = DAY_LABELS[DAYS.indexOf(day)];
        patterns.push(`${dayLabel} evenings skipped ${skips} of last ${stats.planned} weeks — treating as soft-unavailable`);
      }
    }
  }
  return patterns;
}

export function calculateEffectiveWindow(slot, dayBusySlots, locations, profile) {
  const startMin = timeToMinutes(slot.start);
  const endMin = timeToMinutes(slot.end);
  let usable = endMin - startMin;

  // Shower buffer
  const hasShower = (locations || []).some(l => l.showerAvailable);
  if (hasShower) usable -= 20;

  // Travel buffer (closest location travel × 2)
  const minTravel = (locations || []).reduce((min, l) => {
    const t = l.travelMinutes || 0;
    return t > 0 && t < min ? t : min;
  }, Infinity);
  if (minTravel !== Infinity) usable -= minTravel * 2;

  // Wakeup buffer (if slot starts early)
  if (profile?.wakeupRampMinutes && startMin < 480) { // before 8am
    usable -= profile.wakeupRampMinutes;
  }

  // Meal buffer
  if (profile?.mealBufferEnabled) usable -= 30;

  return Math.max(0, usable);
}

// ─── Slot Form Component ──────────────────────────────────────────────────────
function SlotForm({ anchorRef, slotData, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(slotData || {
    start: '08:00', end: '09:00', reason: 'work', customReason: '', importance: 'hard', energyAfter: 'neutral', isRecurring: false
  });
  const formRef = useRef(null);

  // Position relative to anchor
  useEffect(() => {
    if (!formRef.current || !anchorRef) return;
    const rect = anchorRef;
    const formEl = formRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = rect.bottom + 6;
    let left = rect.left;
    if (top + formEl.offsetHeight > vh - 8) top = rect.top - formEl.offsetHeight - 6;
    if (left + 210 > vw - 8) left = vw - 218;
    formEl.style.top = `${top}px`;
    formEl.style.left = `${left}px`;
  }, [anchorRef]);

  // Click outside to cancel
  useEffect(() => {
    const handler = (e) => {
      if (formRef.current && !formRef.current.contains(e.target)) onCancel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="av-slot-form" ref={formRef}>
      <div className="av-form-title">{slotData?.id ? 'Edit Slot' : 'Add Busy Slot'}</div>

      <div className="av-form-row">
        <label>From – To</label>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="time" value={form.start} onChange={e => set('start', e.target.value)} style={{ flex: 1 }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>→</span>
          <input type="time" value={form.end} onChange={e => set('end', e.target.value)} style={{ flex: 1 }} />
        </div>
      </div>

      <div className="av-form-row">
        <label>Reason</label>
        <select value={form.reason} onChange={e => set('reason', e.target.value)}>
          {REASONS.map(r => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
        </select>
      </div>

      {form.reason === 'other' && (
        <div className="av-form-row">
          <label>Custom Reason</label>
          <input
            type="text"
            value={form.customReason || ''}
            onChange={e => set('customReason', e.target.value)}
            placeholder="e.g. Appointment"
            autoFocus
          />
        </div>
      )}

      <div className="av-form-row">
        <label>Importance</label>
        <div className="av-importance-toggle">
          <button
            className={form.importance === 'hard' ? 'active-hard' : ''}
            onClick={() => set('importance', 'hard')}
            title="Hard = cannot move."
          >Hard</button>
          <button
            className={form.importance === 'soft' ? 'active-soft' : ''}
            onClick={() => set('importance', 'soft')}
            title="Soft = flexible."
          >Soft</button>
        </div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {form.importance === 'hard' ? 'Constraint cannot be moved.' : 'AI can suggest rescheduling.'}
        </div>
      </div>

      <div className="av-form-row">
        <label>Post-Activity Energy</label>
        <select value={form.energyAfter} onChange={e => set('energyAfter', e.target.value)}>
          <option value="fresh">Fresh</option>
          <option value="neutral">Neutral</option>
          <option value="drained">Drained</option>
        </select>
      </div>

      <div className="av-form-switch-row">
        <label className="switch" style={{ flexShrink: 0 }}>
          <input type="checkbox" checked={form.isRecurring} onChange={e => set('isRecurring', e.target.checked)} />
          <span className="slider-toggle"></span>
        </label>
        <span>Repeat every week</span>
      </div>

      <div className="av-form-actions">
        <button className="av-btn-save" onClick={() => onSave(form)}>Save</button>
        {slotData?.id && <button onClick={onDelete} style={{ color: '#f87171', borderColor: '#7f1d1d', flex: '0 0 auto', padding: '5px 8px' }}>🗑</button>}
        <button className="av-btn-cancel" onClick={onCancel}>✕</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AvailabilityCalendar({
  availability = {},
  setAvailability,
  availabilityTemplate = {},
  setAvailabilityTemplate,
  schedule = {},
  locations = [],
  profile = {},
  onConflictDetected,
}) {
  const [activeForm, setActiveForm] = useState(null); // { day, slotIndex, anchor, existingSlot }
  const [dragging, setDragging] = useState(null); // { day, slot, span }
  const [dragOver, setDragOver] = useState(null); // { day, rowIndex }

  // Build time rows
  const timeRows = Array.from({ length: TOTAL_SLOTS }, (_, i) => slotIndexToLabel(i));

  // Map slots per day → array of {slot, startIdx, endIdx}
  const getSlotsForDay = useCallback((day) => {
    return (availability[day] || []).map(slot => ({
      slot,
      startIdx: slotIndexFromTime(slot.start),
      endIdx: slotIndexFromTime(slot.end),
    }));
  }, [availability]);

  // Map schedule exercises to {day, rowIndex, name, span}
  const getScheduleChips = useCallback((day) => {
    const chips = [];
    const dayKey = day.toLowerCase();
    const daySessions = schedule[dayKey] || schedule[dayKey.charAt(0).toUpperCase() + dayKey.slice(1)] || [];

    for (const session of daySessions) {
      if (session.plannedTime) {
        const floatIdx = slotIndexFromTime(session.plannedTime);
        const startIdx = Math.floor(floatIdx);
        const offsetPercent = (floatIdx - startIdx) * 100;

        if (startIdx >= 0 && startIdx < TOTAL_SLOTS) {
          const duration = calculateDuration(session, locations, day) || 60;
          const span = Math.max(0.5, duration / SLOT_MINS);
          chips.push({
            id: session.id,
            rowIndex: startIdx,
            endRowIndex: startIdx + span,
            offsetPercent,
            name: session.name || session.type,
            type: session.type,
            notes: session.notes,
            duration,
            plannedTime: session.plannedTime,
            span,
            isPlanned: true
          });
        }
      }
    }
    return chips;
  }, [schedule]);

  const isConflict = useCallback((day, rowIndex) => {
    const cellStart = timeToMinutes(timeRows[rowIndex]);
    const cellEnd = cellStart + SLOT_MINS;
    const daySlots = availability[day] || [];
    const chips = getScheduleChips(day);

    // 1. Busy on Chip conflict (Precision overlap)
    for (const chip of chips) {
      // Calculate exact session times in minutes
      const chipStart = timeToMinutes(timeRows[chip.rowIndex]) + (chip.offsetPercent / 100 * SLOT_MINS);
      const chipEnd = chipStart + (chip.span * SLOT_MINS);

      // Is this cell part of the session?
      if (Math.max(cellStart, chipStart) < Math.min(cellEnd, chipEnd)) {
        // Check if ANY busy slot overlaps with THIS whole session duration
        for (const bs of daySlots) {
          const bsStart = timeToMinutes(bs.start);
          const bsEnd = timeToMinutes(bs.end);
          const hasShower = locations.some(l => l.showerAvailable);
          const minTravel = locations.reduce((min, l) => {
            const t = l.travelMinutes || 0;
            return t > 0 && t < min ? t : min;
          }, Infinity);
          const buffer = (hasShower ? 20 : 0) + (minTravel !== Infinity ? minTravel * 2 : 0);

          if (Math.max(chipStart, bsStart - buffer) < Math.min(chipEnd, bsEnd)) {
            return true;
          }
        }
      }
    }

    // 2. Busy on Busy conflict (Precision overlap)
    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        const s1 = timeToMinutes(daySlots[i].start);
        const e1 = timeToMinutes(daySlots[i].end);
        const s2 = timeToMinutes(daySlots[j].start);
        const e2 = timeToMinutes(daySlots[j].end);

        if (Math.max(s1, s2) < Math.min(e1, e2)) {
          // Overlap exists. Does this cell touch part of the overlap?
          const oStart = Math.max(s1, s2);
          const oEnd = Math.min(e1, e2);
          if (Math.max(cellStart, oStart) < Math.min(cellEnd, oEnd)) return true;
        }
      }
    }

    return false;
  }, [availability, getScheduleChips, locations, timeRows]);

  const openForm = (day, rowIndex, e, existingSlot = null) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveForm({ day, rowIndex, anchor: rect, existingSlot });
  };

  const handleSave = (form) => {
    if (!activeForm) return;
    const { day } = activeForm;

    const newSlot = {
      ...form,
      id: activeForm.existingSlot?.id || generateId(),
    };

    const updateDay = (prev) => {
      const existing = (prev[day] || []).filter(s => s.id !== newSlot.id);
      return { ...prev, [day]: [...existing, newSlot] };
    };

    setAvailability(updateDay);

    if (form.isRecurring) {
      setAvailabilityTemplate(updateDay);
    }

    setActiveForm(null);
  };

  const handleDragStart = (e, day, slot) => {
    e.stopPropagation();
    const startIdx = slotIndexFromTime(slot.start);
    const endIdx = slotIndexFromTime(slot.end);
    setDragging({ day, slot, span: endIdx - startIdx });
  };

  const handleDragOver = (day, rowIndex) => {
    if (dragging) {
      setDragOver({ day, rowIndex });
    }
  };

  const finalizeMove = () => {
    if (dragging && dragOver) {
      const { day: newDay, rowIndex: newRowIndex } = dragOver;
      const { day: oldDay, slot, span } = dragging;

      const newStart = slotIndexToLabel(newRowIndex);
      const newEnd = slotIndexToLabel(newRowIndex + span);

      const movedSlot = { ...slot, start: newStart, end: newEnd };

      setAvailability(prev => {
        const cleanedOld = (prev[oldDay] || []).filter(s => s.id !== slot.id);
        const next = { ...prev, [oldDay]: cleanedOld };
        next[newDay] = [...(next[newDay] || []), movedSlot];
        return next;
      });

      if (movedSlot.isRecurring) {
        setAvailabilityTemplate(prev => {
          const cleanedOld = (prev[oldDay] || []).filter(s => s.id !== slot.id);
          const next = { ...prev, [oldDay]: cleanedOld };
          next[newDay] = [...(next[newDay] || []), movedSlot];
          return next;
        });
      }
    }
    setDragging(null);
    setDragOver(null);
  };

  const handleDelete = () => {
    if (!activeForm?.existingSlot) return;
    const { day } = activeForm;
    const id = activeForm.existingSlot.id;
    setAvailability(prev => ({ ...prev, [day]: (prev[day] || []).filter(s => s.id !== id) }));
    setActiveForm(null);
  };

  const getDayLayout = (day) => {
    const slots = (availability[day] || []).map(s => ({ ...s, isPlanned: false }));
    const chips = getScheduleChips(day).map(c => ({ 
      ...c, 
      isPlanned: true, 
      start: slotIndexToLabel(c.rowIndex), 
      end: slotIndexToLabel(c.endRowIndex) 
    }));
    
    const all = [...slots, ...chips].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    const columns = []; // { lastEnd, slots[] }
    const layout = new Map();

    for (const s of all) {
      const sStart = slotIndexFromTime(s.start);
      const sEnd = slotIndexFromTime(s.end);
      let colIdx = columns.findIndex(c => c.lastEnd <= sStart);
      if (colIdx === -1) {
        colIdx = columns.length;
        columns.push({ lastEnd: sEnd, items: [s] });
      } else {
        columns[colIdx].lastEnd = sEnd;
        columns[colIdx].items.push(s);
      }
      layout.set(s.id, { colIdx, sStart, sEnd });
    }
    return { layout, totalCols: Math.max(1, columns.length), allItems: all };
  };

  const handleCellClick = (day, rowIndex, e) => {
    // Check if clicking on existing slot
    const daySlotData = getSlotsForDay(day);
    const hit = daySlotData.find(({ startIdx, endIdx }) => rowIndex >= startIdx && rowIndex < endIdx);
    if (hit) {
      openForm(day, rowIndex, e, hit.slot);
      return;
    }
    // Check conflict
    if (isConflict(day, rowIndex)) {
      const chips = getScheduleChips(day);
      const chip = chips.find(c => c.rowIndex === rowIndex);
      onConflictDetected?.({ day, exerciseName: chip?.name, conflictDetails: `Busy slot overlaps planned exercise window.` });
      return;
    }
    openForm(day, rowIndex, e);
  };

  // Render a single day column's cells
  const renderDayColumn = (day, dayIdx) => {
    const { layout, totalCols, allItems } = getDayLayout(day);
    const rendered = new Set();

    return timeRows.map((_, rowIndex) => {
      const isHourStart = rowIndex % 2 === 0;
      const conflict = isConflict(day, rowIndex);

      return (
        <div
          key={`${day}-${rowIndex}`}
          className={`av-cell${isHourStart ? ' hour-start' : ''}${conflict ? ' conflict' : ''}${dragOver && dragOver.day === day && dragOver.rowIndex === rowIndex ? ' drag-over' : ''}`}
          style={{
            gridColumn: dayIdx + 2,
            gridRow: rowIndex + 2,
            position: 'relative'
          }}
          onClick={(e) => handleCellClick(day, rowIndex, e)}
          onMouseEnter={() => handleDragOver(day, rowIndex)}
        >
          {/* Render All Items (Busy + Planned) starting in this cell */}
          {allItems.filter(it => Math.floor(slotIndexFromTime(it.start)) === rowIndex).map((it) => {
              if (rendered.has(it.id)) return null;
              rendered.add(it.id);

              const lData = layout.get(it.id);
              const colIdx = lData.colIdx;
              const isBeingDragged = dragging && dragging.slot.id === it.id;
              
              const offsetPercent = (lData.sStart - rowIndex) * 100;
              const span = lData.sEnd - lData.sStart;
              const widthRatio = 100 / totalCols;

              if (it.isPlanned) {
                  return (
                    <div 
                        key={it.id}
                        className="av-sched-chip in-grid"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          height: `${span * 24 - 4}px`,
                          width: `calc(${widthRatio}% - 6px)`,
                          position: 'absolute',
                          left: `calc(${colIdx * (100 / totalCols)}% + 3px)`,
                          top: `calc(${offsetPercent}% + 2px)`,
                          zIndex: 10
                        }}
                    >
                        <span className="chip-name">{it.name}</span>
                        <div className="chip-tooltip">
                          <div className="tooltip-header">
                            <span className={`tag ${it.type?.toLowerCase()}`}>{it.type}</span>
                            <strong>{it.name}</strong>
                          </div>
                          <div className="tooltip-time">🕒 {(() => {
                            const endTime = addMinutesToTime(it.plannedTime?.split('-')[0], it.duration);
                            return it.plannedTime?.includes('-') ? it.plannedTime : `${it.plannedTime}-${endTime}`;
                          })()} ({it.duration} min)</div>
                          {it.notes && <div className="tooltip-notes">{it.notes}</div>}
                        </div>
                    </div>
                  );
              }

              const isOther = it.reason === 'other';
              const customStyle = {};
              if (isOther && it.customReason) {
                const hue = stringToHue(it.customReason);
                customStyle.background = `hsla(${hue}, 70%, 35%, 0.3)`;
                customStyle.color = `hsl(${hue}, 80%, 80%)`;
                customStyle.borderLeftColor = `hsl(${hue}, 80%, 70%)`;
              }
              const fullName = isOther ? it.customReason || 'Other' : REASON_LABELS[it.reason];

              return (
                  <div
                    key={it.id}
                    className={`av-slot-block reason-${it.reason} importance-${it.importance}${isBeingDragged ? ' is-dragging' : ''}`}
                    title={fullName}
                    style={{ 
                      height: `${span * 24 - 2}px`,
                      width: `calc(${widthRatio}% - 4px)`,
                      position: 'absolute',
                      left: `calc(${colIdx * (100 / totalCols)}% + 2px)`,
                      top: `calc(${offsetPercent}% + 1px)`,
                      zIndex: 20,
                      ...customStyle
                    }}
                    onMouseDown={(e) => handleDragStart(e, day, it)}
                  >
                    {fullName}
                  </div>
              );
          })}
          {conflict && <span className="av-conflict-icon">!</span>}
        </div>
      );
    });
  };

  return (
    <div>
      <div className="av-cal-wrapper" onMouseUp={finalizeMove} onMouseLeave={() => { setDragging(null); setDragOver(null); }}>
        <div
          className="av-cal-grid"
          style={{ gridTemplateRows: `24px repeat(${TOTAL_SLOTS}, 24px)` }}
        >
          {/* Header */}
          <div className="av-cal-header-cell" style={{ gridColumn: 1, gridRow: 1, position: 'sticky', left: 0, zIndex: 50 }} />
          {DAY_LABELS.map((lbl, i) => (
            <div key={lbl} className="av-cal-header-cell" style={{ gridColumn: i + 2, gridRow: 1 }}>
              {lbl}
            </div>
          ))}

          {/* Time axis + day cells */}
          {timeRows.map((label, rowIndex) => (
            <div
              key={`time-${rowIndex}`}
              className="av-time-label"
              style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
            >
              {rowIndex % 2 === 0 ? label : ''}
            </div>
          ))}

          {DAYS.map((day, dayIdx) => renderDayColumn(day, dayIdx))}
        </div>
      </div>

      {/* LEGEND */}
      <div className="av-legend">
        <div className="av-legend-item"><div className="av-legend-dot" style={{ background: '#fb923c' }} /> Work</div>
        <div className="av-legend-item"><div className="av-legend-dot" style={{ background: '#facc15' }} /> Social</div>
        <div className="av-legend-item"><div className="av-legend-dot" style={{ background: '#c084fc' }} /> Travel</div>
        <div className="av-legend-item"><div className="av-legend-dot" style={{ background: '#60a5fa' }} /> Rest</div>
        <div className="av-legend-item"><div className="av-legend-dot" style={{ background: '#4ade80' }} /> Family</div>
        <div className="av-legend-item"><div className="av-legend-dot rainbow" /> Other (Custom)</div>
        <div className="av-legend-item"><div className="av-legend-dot" style={{ background: 'rgba(34,197,94,0.3)', border: '1px solid #4ade80' }} /> Planned session</div>
        <div className="av-legend-item" style={{ color: '#f87171' }}>! Conflict</div>
      </div>

      {/* Inline form portal */}
      {activeForm && (
        <SlotForm
          anchorRef={activeForm.anchor}
          slotData={activeForm.existingSlot ? { ...activeForm.existingSlot } : {
            start: slotIndexToLabel(activeForm.rowIndex),
            end: slotIndexToLabel(Math.min(activeForm.rowIndex + 2, TOTAL_SLOTS - 1)),
            reason: 'work',
            customReason: '',
            importance: 'hard',
            energyAfter: 'neutral',
            isRecurring: false,
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={() => setActiveForm(null)}
        />
      )}
    </div>
  );
}
