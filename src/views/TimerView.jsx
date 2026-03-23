import React, { useState } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, CheckCircle, SkipForward, SkipBack, X, StickyNote } from 'lucide-react';
import { useTimer } from '../components/TimerContext';
import { formatTime } from '../utils';
import './timer.css';

function FloatingNoteBubble({ addSessionNote, sessionNotes }) {
  const { phase, isRunning, currentRound, currentStepIdx, activeWorkout, totalRounds } = useTimer();
  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  
  // Override state
  const [ovRound, setOvRound] = useState(currentRound);
  const [ovStepIdx, setOvStepIdx] = useState(currentStepIdx);
  const [ovPhase, setOvPhase] = useState(phase);
  const [isAutoSync, setIsAutoSync] = useState(true);

  const isGuided = !!(activeWorkout && activeWorkout.steps && activeWorkout.steps.length > 0);

  // Reset auto-sync when opened
  React.useEffect(() => {
    if (isOpen) {
      setIsAutoSync(true);
    }
  }, [isOpen]);

  // Keep in sync with live timer UNLESS user manually navigates
  React.useEffect(() => {
    if (isAutoSync) {
      setOvRound(currentRound);
      setOvStepIdx(currentStepIdx);
      setOvPhase(phase === 'stopped' ? 'WORK' : phase);
    }
  }, [currentRound, currentStepIdx, phase, isAutoSync, activeWorkout, totalRounds]);

  // AUTO-CATCHUP: If user manually navigates back to 'Present', re-enable auto-sync
  React.useEffect(() => {
    const livePhase = phase === 'stopped' ? 'WORK' : phase;
    if (!isAutoSync && ovStepIdx === currentStepIdx && ovRound === currentRound && ovPhase === livePhase) {
      setIsAutoSync(true);
    }
  }, [ovStepIdx, ovRound, ovPhase, currentStepIdx, currentRound, phase, isAutoSync]);

  const phases = ['prep', 'work', 'rest'];

  const noteSkipBack = () => {
    setIsAutoSync(false);
    // 1. Traverse phases within same round
    const phaseIdx = phases.indexOf(ovPhase);
    if (phaseIdx > 0) {
      setOvPhase(phases[phaseIdx - 1]);
      return;
    }

    // 2. Traverse to previous round
    if (ovRound > 1) {
      setOvRound(ovRound - 1);
      const stepForRnd = isGuided ? activeWorkout.steps[ovStepIdx] : null;
      setOvPhase(stepForRnd?.type === 'sets' ? 'work' : 'rest');
      return;
    }

    // 3. Traverse to previous step
    if (isGuided && ovStepIdx > 0) {
      const prevIdx = ovStepIdx - 1;
      const prevStep = activeWorkout.steps[prevIdx];
      setOvStepIdx(prevIdx);
      setOvRound(prevStep.rounds || prevStep.sets || 1);
      setOvPhase('rest'); // End of previous step is usually rest
    }
  };

  const noteSkipForward = () => {
    setIsAutoSync(false);
    const phaseIdx = phases.indexOf(ovPhase);
    const stepObj = isGuided ? activeWorkout.steps[ovStepIdx] : null;
    const maxRnds = stepObj?.rounds || stepObj?.sets || totalRounds;

    // 1. Traverse phases within same round
    if (phaseIdx < 2) {
      setOvPhase(phases[phaseIdx + 1]);
      return;
    }

    // 2. Traverse to next round
    if (ovRound < maxRnds) {
      setOvRound(ovRound + 1);
      setOvPhase('prep');
      return;
    }

    // 3. Traverse to next step
    if (isGuided && ovStepIdx + 1 < activeWorkout.steps.length) {
      const nextIdx = ovStepIdx + 1;
      setOvStepIdx(nextIdx);
      setOvRound(1);
      setOvPhase('prep');
    }
  };

  const currentStepFromOv = isGuided && activeWorkout.steps[ovStepIdx] ? activeWorkout.steps[ovStepIdx] : null;

  const getCustomTag = () => {
    const phaseLabel = ovPhase.toUpperCase();
    if (isGuided && currentStepFromOv) {
      return `[Step ${ovStepIdx + 1}/${activeWorkout.steps.length} · ${currentStepFromOv.name} · R${ovRound} · ${phaseLabel}]`;
    }
    return `[Round ${ovRound} · ${phaseLabel}]`;
  };

  const handleSave = () => {
    if (!noteText.trim()) return;
    const tag = getCustomTag();
    addSessionNote({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      tag,
      text: noteText.trim(),
      raw: `${tag} ${noteText.trim()}`
    });
    setNoteText('');
    setIsOpen(false);
  };

  if (phase === 'stopped' && !isOpen) return null;

  return (
    <div className="note-bubble-container">
      {isOpen && (
        <div className="note-panel">
          <div className="note-panel-header">
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Nota Sessione</span>
            <button className="btn-icon" onClick={() => setIsOpen(false)}><X size={18}/></button>
          </div>
          <div className="note-panel-body">
            
            {/* NEW Timeline Navigation */}
            <div className="note-timeline-nav">
              <button className="nav-arrow" onClick={noteSkipBack} title="Back in timeline">
                <SkipBack size={18} />
              </button>
              
              <div className="nav-context-pill">
                <span className="pill-primary">R{ovRound} {ovPhase.toUpperCase()}</span>
                {isGuided && currentStepFromOv && (
                  <span className="pill-secondary">
                    Step {ovStepIdx + 1}/{activeWorkout.steps.length}: {currentStepFromOv.name}
                  </span>
                )}
              </div>

              <button 
                className="nav-arrow" 
                onClick={noteSkipForward}
                disabled={
                  isGuided 
                    ? (ovStepIdx === activeWorkout.steps.length - 1 && 
                       ovRound === (activeWorkout.steps[ovStepIdx].rounds || activeWorkout.steps[ovStepIdx].sets || 1) && 
                       ovPhase === 'rest')
                    : (ovRound === totalRounds && ovPhase === 'rest')
                }
                title="Forward in timeline"
              >
                <SkipForward size={18} />
              </button>
            </div>

            <div className="note-context-selectors mini">
              {isGuided && (
                <div className="selector-group">
                  <select 
                    value={ovStepIdx} 
                    onChange={e => {
                      setIsAutoSync(false);
                      const newIdx = parseInt(e.target.value);
                      setOvStepIdx(newIdx);
                      const max = activeWorkout.steps[newIdx]?.rounds || 1;
                      if (ovRound > max) setOvRound(max);
                    }}
                    className="step-select small"
                  >
                    {activeWorkout.steps.map((s, i) => (
                      <option key={s.id || i} value={i}>{i+1}. {s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="tag-preview">{getCustomTag()}</div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <textarea 
                autoFocus
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Scrivi cosa è successo..."
                className="note-textarea-box"
              />
            </div>
            <button className="btn-primary w-full" onClick={handleSave} disabled={!noteText.trim()}>
              Salva Nota
            </button>
            
            {sessionNotes.length > 0 && (
              <div className="note-history">
                <div className="history-title">Note recenti:</div>
                {sessionNotes.slice(-3).reverse().map(note => (
                  <div key={note.id} className="note-history-item">
                    <span className="note-item-tag">{note.tag}</span>
                    {note.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <button className="note-bubble" onClick={() => setIsOpen(!isOpen)}>
        <StickyNote size={20} />
        {sessionNotes.length > 0 && (
          <span className="note-count-badge">{sessionNotes.length}</span>
        )}
      </button>
    </div>
  );
}

export function TimerView({ presets, setPresets, activeWorkout, setActiveWorkout, setActiveTab, sessionNotes, addSessionNote }) {
  const {
    soundEnabled, setSoundEnabled,
    work, setWork, rest, setRest, totalRounds, setTotalRounds,
    isRunning, phase, timeLeft, currentRound, currentStepIdx,
    isGuided, currentStep,
    getPhaseColor, getPhaseLabel,
    startTimer, pauseTimer, stopTimer, skipStep, previousStep, completeSet, advanceGuidedStep
  } = useTimer();

  const getCurrentInstruction = () => {
    if (!currentStep?.instruction) return null;
    if (!['interval', 'sets'].includes(currentStep.type)) return currentStep.instruction;

    const segments = currentStep.instruction.split(/(?:\n|\|)/).map(s => s.trim()).filter(Boolean);
    let roundText = null;
    let generalText = [];

    segments.forEach(seg => {
      const match = seg.match(/^(?:R(?:ound)?\s*)?(\d+)[\:\-\.]\s*(.*)/i);
      if (match) {
        if (parseInt(match[1], 10) === currentRound) {
          roundText = match[2];
        }
      } else {
        generalText.push(seg);
      }
    });

    if (roundText) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {generalText.length > 0 && <span style={{fontSize: '0.85em', opacity: 0.8}}>{generalText.join('. ')}</span>}
          <span style={{fontWeight: 700, color: 'var(--primary)', fontSize: '1.1em'}}>
            R{currentRound}: {roundText}
          </span>
        </div>
      );
    }

    return currentStep.instruction;
  };

  // Rendering variations based on what's active
  const renderSetsStep = () => {
    return (
      <div className="sets-container">
        <h2 className="sets-reps">{currentStep.reps}</h2>
        <p className="sets-label">SET {currentRound} OF {currentStep.sets}</p>
        {!isRunning && phase !== 'rest' && (
          <button className="btn-primary" style={{ width: '100%', fontSize: '1.25rem', padding: '1rem', marginTop: '1rem' }} onClick={completeSet}>
            <CheckCircle size={24} /> SET COMPLETED
          </button>
        )}
      </div>
    );
  };

  const renderTextStep = () => {
    return (
      <div className="text-step-container">
        <p className="text-instruction">{currentStep.instruction}</p>
        <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={advanceGuidedStep}>
          <CheckCircle size={18} /> MARK DONE
        </button>
      </div>
    );
  };

  return (
    <div className="page-container timer-view">
      <div className="timer-header">
        <h1 className="page-title">{isGuided ? 'Guided Workout' : 'Boxing Timer'}</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isGuided && (
            <button className="btn-icon" onClick={() => setActiveWorkout(null)} style={{ color: 'var(--text-muted)' }} title="Exit Guided Workout">
              <X size={28} />
            </button>
          )}
          <button className="btn-icon" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>
      </div>

      {isGuided && (
        <div className="guided-step-info">
          <div className="step-progress">
            STEP {currentStepIdx + 1} OF {activeWorkout.steps.length}
          </div>
          <h2 className="step-name">{currentStep.name}</h2>
          {currentStep.instruction && <div className="step-instruction">{getCurrentInstruction()}</div>}
        </div>
      )}

      {/* Main Display Window */}
      {isGuided && currentStep?.type === 'text' ? (
        renderTextStep()
      ) : (
        <div className="timer-display-card" style={{ '--phase-color': getPhaseColor() }}>
          
          <p className="phase-label">
            {getPhaseLabel()}
            {phase !== 'stopped' && phase !== 'prep' && (
              (!isGuided && ` - RND ${currentRound}/${totalRounds}`) ||
              (isGuided && currentStep?.type === 'interval' && ` - RND ${currentRound}/${currentStep.rounds}`) ||
              (isGuided && currentStep?.type === 'sets' && ` - REST`)
            )}
          </p>
          
          {isGuided && currentStep?.type === 'sets' && phase === 'stopped' ? (
            renderSetsStep()
          ) : (
            <div className="time-huge">
              {phase === 'stopped' && !isGuided ? formatTime(work) : 
                phase === 'stopped' && isGuided && currentStep?.type === 'timer' ? formatTime(currentStep.duration) :
                formatTime(timeLeft)}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {(!isGuided || (currentStep && currentStep.type !== 'text' && currentStep.type !== 'sets') || (currentStep && currentStep.type === 'sets' && isRunning)) && (
        <div className="timer-controls">
          <button 
            className="timer-btn skip" 
            onClick={previousStep} 
            style={{ 
              backgroundColor: 'var(--surface-hover)', 
              borderColor: 'var(--text-muted)', 
              visibility: (isGuided && (currentStepIdx > 0 || currentRound > 1 || phase === 'rest')) || (!isGuided && phase !== 'stopped') ? 'visible' : 'hidden' 
            }}
          >
            <SkipBack size={24} />
          </button>

          {!isRunning ? (
            <button className="timer-btn play" onClick={startTimer}><Play size={32} /></button>
          ) : (
              <button className="timer-btn pause" onClick={pauseTimer}><Pause size={32} /></button>
          )}
          <button className="timer-btn stop" onClick={stopTimer}><Square size={32} /></button>

          <button className="timer-btn skip" onClick={skipStep} style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--text-muted)' }}>
            <SkipForward size={24} />
          </button>
        </div>
      )}

      {/* Manual Settings if not Guided */}
      {!isGuided && phase === 'stopped' && (
        <div className="timer-settings card">
          <h3>Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Work (s)</label>
              <input type="number" value={work} onChange={(e) => setWork(Number(e.target.value))} />
            </div>
            <div className="setting-item">
              <label>Rest (s)</label>
              <input type="number" value={rest} onChange={(e) => setRest(Number(e.target.value))} />
            </div>
            <div className="setting-item">
              <label>Rounds</label>
              <input type="number" value={totalRounds} onChange={(e) => setTotalRounds(Number(e.target.value))} />
            </div>
          </div>

          <h3 style={{ marginTop: '2rem' }}>Presets</h3>
          <div className="presets-list">
            {presets.map(p => (
              <button key={p.id} className="preset-btn" onClick={() => { setWork(p.work); setRest(p.rest); setTotalRounds(p.rounds); }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <FloatingNoteBubble addSessionNote={addSessionNote} sessionNotes={sessionNotes} />
    </div>
  );
}
