import React from 'react';
import { Play, Pause, Square, Volume2, VolumeX, CheckCircle, SkipForward, SkipBack, X } from 'lucide-react';
import { useTimer } from '../components/TimerContext';
import { formatTime } from '../utils';
import './timer.css';

export function TimerView({ presets, setPresets, activeWorkout, setActiveWorkout, setActiveTab }) {
  const {
    soundEnabled, setSoundEnabled,
    work, setWork, rest, setRest, totalRounds, setTotalRounds,
    isRunning, phase, timeLeft, currentRound, currentStepIdx,
    isGuided, currentStep,
    getPhaseColor, getPhaseLabel,
    startTimer, pauseTimer, stopTimer, skipStep, previousStep, completeSet
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
        <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={skipStep}>
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
          <button className="timer-btn skip" onClick={previousStep} style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--text-muted)', visibility: (isGuided && currentStepIdx > 0) || (!isGuided && phase !== 'stopped') ? 'visible' : 'hidden' }}>
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
    </div>
  );
}
