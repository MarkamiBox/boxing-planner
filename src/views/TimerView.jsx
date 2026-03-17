import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, CheckCircle, SkipForward, X } from 'lucide-react';
import './timer.css';

const playBeep = (type = 'short') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'long') {
      osc.frequency.value = 400;
      gainNode.gain.setValueAtTime(1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } else {
      osc.frequency.value = 800;
      gainNode.gain.setValueAtTime(1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
    
    if (navigator.vibrate) {
      if (type === 'long') navigator.vibrate([1000]);
      else navigator.vibrate([300]);
    }
  } catch (e) {
    console.log("Audio interaction needed");
  }
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function TimerView({ presets, setPresets, activeWorkout, setActiveWorkout, setActiveTab }) {
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual Timer State 
  const [work, setWork] = useState(180);
  const [rest, setRest] = useState(60);
  const [totalRounds, setTotalRounds] = useState(3);
  
  // Shared Timer Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState('stopped'); // stopped, prep, work, rest
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const timerRef = useRef(null);

  // Guided Workout State
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Stats tracking
  const statsTracker = useRef({ actualDuration: 0, skippedSteps: 0, lastActive: null });
  const plannedDuration = useRef(0);

  // Derive mode dynamically
  const isGuided = activeWorkout && activeWorkout.steps && activeWorkout.steps.length > 0;
  const currentStep = isGuided ? activeWorkout.steps[currentStepIdx] : null;

  // Restore state on mount
  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem('bxng_timer_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setPhase(parsed.phase);
        setCurrentRound(parsed.currentRound);
        setCurrentStepIdx(parsed.currentStepIdx || 0);
        setTimeLeft(parsed.timeLeft);
        if (parsed.expectedEndTime) {
           if (!timerRef.current) timerRef.current = {};
           timerRef.current.expectedEndTime = parsed.expectedEndTime;
        }
        if (parsed.statsTracker) statsTracker.current = parsed.statsTracker;
        if (parsed.plannedDuration) plannedDuration.current = parsed.plannedDuration;
        if (parsed.isRunning && parsed.expectedEndTime) {
           setIsRunning(true);
        }
      }
    } catch(e) {}
  }, []);

  // Save state continuously
  useEffect(() => {
    if (phase !== 'stopped' || isRunning || (isGuided && currentStepIdx > 0)) {
      const stateToSave = {
        phase, isRunning, currentRound, currentStepIdx, timeLeft,
        expectedEndTime: timerRef.current?.expectedEndTime || null,
        statsTracker: statsTracker.current,
        plannedDuration: plannedDuration.current
      };
      window.localStorage.setItem('bxng_timer_state', JSON.stringify(stateToSave));
    } else {
      window.localStorage.removeItem('bxng_timer_state');
    }
  }, [phase, isRunning, currentRound, currentStepIdx, timeLeft]);

  useEffect(() => {
    // If we receive a new activeWorkout, reset the sequence and compute planned duration
    if (isGuided && phase === 'stopped' && currentStepIdx === 0) {
      plannedDuration.current = activeWorkout.steps.reduce((acc, step) => {
        if (step.type === 'timer' || step.type === 'manual_timer') return acc + step.duration;
        if (step.type === 'interval') return acc + ((step.work + step.rest) * step.rounds);
        if (step.type === 'sets') return acc + (step.rest * step.sets);
        return acc;
      }, 0);
      statsTracker.current = { actualDuration: 0, skippedSteps: 0, lastActive: null };
    }
  }, [activeWorkout]);

  // Robust background-proof timer execution
  useEffect(() => {
    if (isRunning) {
      // When we start running, set an absolute end time in the real world
      if (!timerRef.current) timerRef.current = {};
      
      if (!timerRef.current.expectedEndTime) {
        timerRef.current.expectedEndTime = Date.now() + (timeLeft * 1000);
      }

      timerRef.current.interval = setInterval(() => {
        const now = Date.now();
        
        // Track precise actual duration elapsed
        if (statsTracker.current.lastActive) {
          statsTracker.current.actualDuration += (now - statsTracker.current.lastActive) / 1000;
        }
        statsTracker.current.lastActive = now;

        const absoluteTimeLeft = Math.ceil((timerRef.current.expectedEndTime - now) / 1000);
        
        if (absoluteTimeLeft <= 0) {
           handlePhaseTransition();
           // Clear expected end time so the transition function can set a new one
           delete timerRef.current.expectedEndTime;
        } else {
           setTimeLeft(absoluteTimeLeft);
           // Handle beep precisely
           if (absoluteTimeLeft <= 3 && absoluteTimeLeft > 0 && soundEnabled && !timerRef.current['beeped' + absoluteTimeLeft]) {
              playBeep('short');
              timerRef.current['beeped' + absoluteTimeLeft] = true;
           }
        }
      }, 250); // Tick faster for precision
    } else {
      statsTracker.current.lastActive = null;
      if (timerRef.current?.interval) clearInterval(timerRef.current.interval);
      if (timerRef.current) delete timerRef.current.expectedEndTime; // Pause clears absolute time
    }
    
    // Clear beep flags on phase change
    return () => {
       if (timerRef.current?.interval) clearInterval(timerRef.current.interval);
       if (timerRef.current) {
          delete timerRef.current.beeped1;
          delete timerRef.current.beeped2;
          delete timerRef.current.beeped3;
       }
    };
  }, [isRunning, phase, currentRound, isGuided, currentStepIdx, timeLeft]);

  // Handle generic phase transitions (for both manual and guided)
  const handlePhaseTransition = () => {
    if (soundEnabled) playBeep('long');
    
    // Remove old endTime marker so a new one is set on the next tick
    if (timerRef.current) delete timerRef.current.expectedEndTime;

    if (isGuided) {
      handleGuidedTransition();
    } else {
      handleManualTransition();
    }
  };

  const handleManualTransition = () => {
    if (phase === 'prep') {
      setPhase('work');
      setTimeLeft(work);
    } else if (phase === 'work') {
      if (currentRound >= totalRounds) {
        setPhase('stopped');
        setIsRunning(false);
      } else {
        setPhase('rest');
        setTimeLeft(rest);
      }
    } else if (phase === 'rest') {
      setPhase('work');
      setTimeLeft(work);
      setCurrentRound((prev) => prev + 1);
    }
  };

  const handleGuidedTransition = () => {
    if (!currentStep) return;

    if (currentStep.type === 'timer' || currentStep.type === 'manual_timer') {
      // Single continuous countdown finished
      advanceGuidedStep();
    } else if (currentStep.type === 'interval') {
      // Complex interval loop
      if (phase === 'prep') {
        setPhase('work');
        setTimeLeft(currentStep.work);
      } else if (phase === 'work') {
        if (currentRound >= currentStep.rounds) {
          advanceGuidedStep();
        } else {
          setPhase('rest');
          setTimeLeft(currentStep.rest);
        }
      } else if (phase === 'rest') {
        setPhase('work');
        setTimeLeft(currentStep.work);
        setCurrentRound(prev => prev + 1);
      }
    } else if (currentStep.type === 'sets') {
      // For sets, transitioning from a rest phase goes back to "wait for set" (stopped)
      if (phase === 'rest') {
        setPhase('stopped');
        setIsRunning(false);
        if (currentRound >= currentStep.sets) {
          advanceGuidedStep();
        } else {
          setCurrentRound(prev => prev + 1); 
        }
      }
    }
  };

  const advanceGuidedStep = () => {
    if (currentStepIdx + 1 >= activeWorkout.steps.length) {
      // Workout Complete!
      setPhase('stopped');
      setIsRunning(false);
      
      // Complete stats
      if (isGuided) {
        setActiveWorkout({
          ...activeWorkout,
          timerStats: {
            actualDuration: statsTracker.current.actualDuration,
            plannedDuration: plannedDuration.current,
            skippedSteps: statsTracker.current.skippedSteps
          }
        });
      }

      // Auto-jump to logger
      setActiveTab('logger');
    } else {
      // Move to next step
      const nextStep = activeWorkout.steps[currentStepIdx + 1];
      setCurrentStepIdx(prev => prev + 1);
      prepareGuidedStep(nextStep);
      
      // Auto-start next step unless it's a manual timer or sets 
      if (nextStep.type !== 'manual_timer' && nextStep.type !== 'sets' && nextStep.type !== 'text') {
        // give React a tick to update state, then start
        setTimeout(() => {
          setPhase(nextStep.type === 'interval' ? 'prep' : 'work');
          setTimeLeft(nextStep.type === 'interval' ? 10 : nextStep.duration);
          setIsRunning(true);
        }, 50);
      }
    }
  };

  const prepareGuidedStep = (step) => {
    setPhase('stopped');
    setIsRunning(false);
    setCurrentRound(1);
    // Remove the expectedEndTime when preparing a completely new step.
    if (timerRef.current && timerRef.current.expectedEndTime) {
      delete timerRef.current.expectedEndTime;
    }

    if (step.type === 'timer' || step.type === 'manual_timer') {
      setTimeLeft(step.duration);
    } else if (step.type === 'interval') {
      setTimeLeft(10); // Prep time
    } else if (step.type === 'sets') {
      setTimeLeft(0);
    }
  };

  const startTimer = () => {
    if (isGuided && currentStep) {
      if (currentStep.type === 'sets') {
        // We shouldn't "play" a set. The user clicks "Done". 
      } else {
        if (phase === 'stopped') {
          if (currentStep.type === 'interval') {
            setPhase('prep');
            setTimeLeft(10);
            setCurrentRound(1);
          } else if (currentStep.type === 'timer') {
            setPhase('work'); // Call it work for coloring
            setTimeLeft(currentStep.duration);
          }
        }
        setIsRunning(true);
        if (soundEnabled) playBeep('short');
      }
    } else {
      // Manual Mode
      if (phase === 'stopped') {
        setPhase('prep');
        setTimeLeft(10);
        setCurrentRound(1);
      }
      setIsRunning(true);
      if (soundEnabled) playBeep('short');
    }
  };

  const completeSet = () => {
    // User finished a rep set -> start rest timer
    if (isGuided && currentStep && currentStep.type === 'sets') {
      setPhase('rest');
      setTimeLeft(currentStep.rest);
      setIsRunning(true);
      if (soundEnabled) playBeep('long');
    }
  };

  const pauseTimer = () => setIsRunning(false);

  const stopTimer = () => {
    setIsRunning(false);
    setPhase('stopped');
    setTimeLeft(0);
    setCurrentRound(1);
    setCurrentStepIdx(0); // Reset guided
    if (isGuided) {
      if (window.confirm("Se interrompi ora, vuoi loggare l'attività parziale o annullare?\nOK = Vai al Logger\nAnnulla = Torna allo Schedule senza salvare")) {
        setActiveWorkout({
          ...activeWorkout,
          timerStats: {
            actualDuration: statsTracker.current.actualDuration,
            plannedDuration: plannedDuration.current,
            skippedSteps: statsTracker.current.skippedSteps
          }
        });
        setActiveTab('logger');
      } else {
        setActiveWorkout(null); // Cancel entirely
      }
    }
  };

  const skipStep = () => {
    statsTracker.current.skippedSteps += 1;
    if (!isGuided) { // For manual mode, simulate skip completely
      if (phase === 'work' && currentRound < totalRounds) {
        setPhase('rest');
        setTimeLeft(rest);
      } else if (phase === 'rest' || (phase === 'prep')) {
        setPhase('work');
        setTimeLeft(work);
        if (phase === 'rest') setCurrentRound(r => r + 1);
      } else {
        stopTimer();
      }
    } else {
      advanceGuidedStep();
    }
  };

  const getPhaseColor = () => {
    if (phase === 'work') return '#ef4444'; // Red
    if (phase === 'rest') return '#3b82f6'; // Blue
    if (phase === 'prep') return '#f59e0b'; // Yellow
    return 'var(--text-muted)';
  };

  const getPhaseLabel = () => {
    if (phase === 'stopped') return 'READY';
    if (phase === 'prep') return 'PREP';
    if (phase === 'work') return 'WORK';
    if (phase === 'rest') return 'REST';
    return '';
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
          {currentStep.instruction && <p className="step-instruction">{currentStep.instruction}</p>}
        </div>
      )}

      {/* Main Display Window */}
      {isGuided && currentStep.type === 'text' ? (
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
          
          {isGuided && currentStep.type === 'sets' && phase === 'stopped' ? (
            renderSetsStep()
          ) : (
            <div className="time-huge">
              {phase === 'stopped' && !isGuided ? formatTime(work) : 
               phase === 'stopped' && isGuided && currentStep.type === 'timer' ? formatTime(currentStep.duration) :
               formatTime(timeLeft)}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {(!isGuided || (currentStep && currentStep.type !== 'text' && currentStep.type !== 'sets') || (currentStep && currentStep.type === 'sets' && isRunning)) && (
        <div className="timer-controls">
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
