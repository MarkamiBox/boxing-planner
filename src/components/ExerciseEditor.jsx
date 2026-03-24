import React, { useState } from 'react';
import { Trash2, X, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { TimeInput } from './TimeInput';

export function ExerciseEditor({ exercise, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState({
    name: exercise.name || '',
    type: exercise.type || 'Boxing',
    notes: exercise.notes || '',
    plannedTime: exercise.plannedTime || '',
    steps: exercise.steps ? JSON.parse(JSON.stringify(exercise.steps)) : []
  });

  const updateStep = (idx, field, value) => {
    const newSteps = [...form.steps];
    newSteps[idx] = { ...newSteps[idx], [field]: value };
    setForm({ ...form, steps: newSteps });
  };

  const addStep = () => {
    setForm({
      ...form,
      steps: [...form.steps, { id: `s${Date.now()}`, name: '', type: 'text', instruction: '' }]
    });
  };

  const removeStep = (idx) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) });
  };

  const moveStep = (idx, dir) => {
    if (dir === 'up' && idx > 0) {
      const newSteps = [...form.steps];
      [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
      setForm({ ...form, steps: newSteps });
    } else if (dir === 'down' && idx < form.steps.length - 1) {
      const newSteps = [...form.steps];
      [newSteps[idx + 1], newSteps[idx]] = [newSteps[idx], newSteps[idx + 1]];
      setForm({ ...form, steps: newSteps });
    }
  };

  const handleInstructionChange = (stepIdx, roundIdx, newValue) => {
    const step = form.steps[stepIdx];
    const rounds = step.type === 'interval' ? (step.rounds || 1) : (step.sets || 1);
    let parts = (step.instruction || '').split(' | ');
    while (parts.length < rounds) parts.push('');
    parts[roundIdx] = newValue;
    updateStep(stepIdx, 'instruction', parts.join(' | '));
  };

  const renderStep = (step, idx) => (
    <div key={step.id} className="step-edit-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} style={{ color: idx === 0 ? 'var(--text-muted)' : 'var(--primary)', background: 'none', border: 'none', padding: '4px', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUp size={16}/></button>
          <button onClick={() => moveStep(idx, 'down')} disabled={idx === form.steps.length - 1} style={{ color: idx === form.steps.length - 1 ? 'var(--text-muted)' : 'var(--primary)', background: 'none', border: 'none', padding: '4px', cursor: idx === form.steps.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowDown size={16}/></button>
        </div>
        <select value={step.type} onChange={e => updateStep(idx, 'type', e.target.value)} style={{ flex: 1, fontSize: '0.8rem', padding: '4px' }}>
          <option value="text">Testo</option>
          <option value="timer">Timer</option>
          <option value="interval">Interval</option>
          <option value="sets">Sets</option>
          <option value="manual_timer">Manual Timer</option>
        </select>
        <button onClick={() => removeStep(idx)} style={{ color: 'var(--primary)', background: 'none', border: 'none' }}><Trash2 size={14}/></button>
      </div>
      
      <input type="text" placeholder="Nome Step" value={step.name} onChange={e => updateStep(idx, 'name', e.target.value)} style={{ width: '100%', marginBottom: '0.4rem', padding: '4px', fontSize: '0.85rem' }} />

      {['timer', 'manual_timer'].includes(step.type) && (
        <TimeInput label="Duration" value={step.duration || 0} onChange={val => updateStep(idx, 'duration', val)} />
      )}
      {step.type === 'interval' && (
        <div style={{ display: 'flex', gap: '4px' }}>
          <TimeInput label="Work" value={step.work || 0} onChange={val => updateStep(idx, 'work', val)} style={{ flex: 1 }} />
          <TimeInput label="Rest" value={step.rest || 0} onChange={val => updateStep(idx, 'rest', val)} style={{ flex: 1 }} />
          <input type="number" value={step.rounds || 0} onChange={e => updateStep(idx, 'rounds', parseInt(e.target.value))} style={{ width: '40px' }} />
        </div>
      )}
      {step.type === 'sets' && (
        <div style={{ display: 'flex', gap: '4px' }}>
          <input type="number" placeholder="Sets" value={step.sets || 0} onChange={e => updateStep(idx, 'sets', parseInt(e.target.value))} style={{ flex: 1 }} />
          <input type="text" placeholder="Reps" value={step.reps || ''} onChange={e => updateStep(idx, 'reps', e.target.value)} style={{ flex: 1 }} />
          <TimeInput label="Rest" value={step.rest || 0} onChange={val => updateStep(idx, 'rest', val)} style={{ flex: 1 }} />
        </div>
      )}
      {((step.type === 'interval' && (step.rounds || 0) > 1) || (step.type === 'sets' && (step.sets || 0) > 1)) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.4rem' }}>
          {Array.from({ length: (step.type === 'interval' ? step.rounds : step.sets) }).map((_, rIdx) => {
            const parts = (step.instruction || '').split(' | ');
            return (
              <div key={rIdx} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '1px' }}>Round {rIdx+1}</label>
                <textarea 
                  placeholder={`Istruzione round ${rIdx+1}`}
                  value={parts[rIdx] || ''} 
                  onChange={e => handleInstructionChange(idx, rIdx, e.target.value)}
                  style={{ width: '100%', padding: '4px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px', minHeight: '30px', resize: 'vertical', color: 'inherit' }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <input type="text" placeholder="Istruzioni" value={step.instruction || ''} onChange={e => updateStep(idx, 'instruction', e.target.value)} style={{ width: '100%', marginTop: '0.4rem', padding: '4px', fontSize: '0.8rem' }} />
      )}
    </div>
  );

  return (
    <div className="exercise-editor" style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)' }}>
      <div className="editor-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input style={{ flex: 2 }} type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome Esercizio" />
        <select style={{ flex: 1 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          <option value="Boxing">Boxing</option>
          <option value="Strength">Strength</option>
          <option value="Running">Running</option>
          <option value="Recovery">Recovery</option>
        </select>
        <input style={{ width: '80px' }} type="time" value={form.plannedTime} onChange={e => setForm({ ...form, plannedTime: e.target.value })} />
      </div>
      <textarea style={{ width: '100%', marginBottom: '0.5rem' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Note" rows="2" />
      
      <div className="steps-builder" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Guided Steps</label>
          <button onClick={addStep} style={{ color: 'var(--primary)', fontSize: '0.8rem', background: 'none', border: 'none' }}>+ Aggiungi</button>
        </div>
        {form.steps.map((s, i) => renderStep(s, i))}
      </div>

      <div className="editor-actions" style={{ display: 'flex', gap: '0.5rem' }}>
        {onDelete && <button onClick={onDelete} className="btn-icon danger"><Trash2 size={18}/></button>}
        <div style={{ flex: 1 }}></div>
        <button onClick={onCancel} className="btn-secondary"><X size={16}/> Annulla</button>
        <button onClick={() => onSave(form)} className="btn-primary"><Save size={16}/> Salva</button>
      </div>
    </div>
  );
}
