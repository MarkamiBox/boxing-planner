import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { get, set, del } from 'idb-keyval';
import { useDialog } from './DialogContext';
import { fireLogNudge } from '../services/notificationService';

const TimerContext = createContext(null);

export const playBeep = (type = 'short', noSound = false) => {
  if (noSound) return;
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

export function TimerProvider({ children, activeWorkout, setActiveWorkout, setActiveTab, globalPrepTime = 60, profile, addSessionNote }) {
  const { showConfirm } = useDialog();
  const [isReady, setIsReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual Timer Settings 
  const [work, setWork] = useState(180);
  const [rest, setRest] = useState(60);
  const [totalRounds, setTotalRounds] = useState(3);

  // Shared Timer Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState('stopped'); // stopped, prep, work, rest
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const timerRef = useRef({})

  // Guided Workout State
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Stats tracking
  const statsTracker = useRef({ actualDuration: 0, lastActive: null });
  const plannedDuration = useRef(0);

  const isGuided = activeWorkout && activeWorkout.steps && activeWorkout.steps.length > 0;
  const currentStep = isGuided ? activeWorkout.steps[currentStepIdx] : null;

  // Auto-tagging helper
  const getNoteTag = () => {
    const phaseLabel = phase.toUpperCase();
    if (isGuided && currentStep) {
      return `[Step ${currentStepIdx + 1}/${activeWorkout.steps.length} · ${currentStep.name} · Round ${currentRound} · ${phaseLabel}]`;
    }
    const totalRnds = !isGuided ? totalRounds : (currentStep?.rounds || 1);
    return `[Round ${currentRound}/${totalRnds} · ${phaseLabel}]`;
  };


  // Restore state on mount
  useEffect(() => {
    async function restore() {
      try {
        const savedState = await get('bxng_timer_state');
        if (savedState) {
          setPhase(savedState.phase);
          setCurrentRound(savedState.currentRound);
          setCurrentStepIdx(savedState.currentStepIdx || 0);
          setTimeLeft(savedState.timeLeft);
          if (savedState.expectedEndTime) {
            timerRef.current.expectedEndTime = savedState.expectedEndTime;
          }
          if (savedState.statsTracker) statsTracker.current = savedState.statsTracker;
          if (savedState.plannedDuration) plannedDuration.current = savedState.plannedDuration;
          if (savedState.isRunning && savedState.expectedEndTime) {
            setIsRunning(true);
          }
        }
      } catch (e) {
        console.error("Timer state restoration error:", e);
      } finally {
        setIsReady(true);
      }
    }
    restore();
  }, []);

  // Save state continuously
  useEffect(() => {
    if (!isReady) return;
    const save = async () => {
      if (phase !== 'stopped' || isRunning || (isGuided && currentStepIdx > 0)) {
        const stateToSave = {
          phase, isRunning, currentRound, currentStepIdx, timeLeft,
          expectedEndTime: timerRef.current?.expectedEndTime || null,
          statsTracker: statsTracker.current,
          plannedDuration: plannedDuration.current
        };
        await set('bxng_timer_state', stateToSave);
      } else {
        await del('bxng_timer_state');
      }
    };
    save();
  }, [phase, isRunning, currentRound, currentStepIdx, timeLeft, isGuided, isReady]);

  const lastWorkoutRef = useRef(null);

  useEffect(() => {
    // If we receive a new workout or the user clicks "Play" again (different playTime), reset
    if (activeWorkout && (activeWorkout.id !== lastWorkoutRef.current?.id || activeWorkout.playTime !== lastWorkoutRef.current?.playTime)) {
      setPhase('stopped');
      setIsRunning(false);
      setCurrentStepIdx(0);
      setCurrentRound(1);
      lastWorkoutRef.current = activeWorkout;
    }
  }, [activeWorkout]);

  useEffect(() => {
    // Re-init sequence parameters when workout is fresh or reset
    if (isGuided && phase === 'stopped' && currentStepIdx === 0) {
      plannedDuration.current = activeWorkout.steps.reduce((acc, step) => {
        if (step.type === 'timer' || step.type === 'manual_timer') return acc + (step.duration || 0);
        if (step.type === 'interval') return acc + (((step.work || 0) + (step.rest || 0)) * (step.rounds || 1));
        if (step.type === 'sets') return acc + ((step.rest || 60) * (step.sets || 1));
        return acc;
      }, 0);
      statsTracker.current = { actualDuration: 0, lastActive: null };
    }
  }, [activeWorkout, isGuided, phase, currentStepIdx]);

  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker('/timerWorker.js');
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Robust background-proof timer execution
  useEffect(() => {
    if (isRunning && isReady) {
      if (!timerRef.current.expectedEndTime) {
        timerRef.current.expectedEndTime = Date.now() + (timeLeft * 1000);
      }

      workerRef.current.postMessage({ type: 'START', intervalMs: 250 });

      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'TICK') {
          const now = e.data.now;

          if (statsTracker.current.lastActive) {
            statsTracker.current.actualDuration += (now - statsTracker.current.lastActive) / 1000;
          }
          statsTracker.current.lastActive = now;

          const absoluteTimeLeft = Math.ceil((timerRef.current.expectedEndTime - now) / 1000);

          if (absoluteTimeLeft <= 0) {
            handlePhaseTransition();
            delete timerRef.current.expectedEndTime;
          } else {
            setTimeLeft(absoluteTimeLeft);
            if (absoluteTimeLeft <= 3 && absoluteTimeLeft > 0 && soundEnabled && !timerRef.current['beeped' + absoluteTimeLeft]) {
              playBeep('short', !soundEnabled);
              timerRef.current['beeped' + absoluteTimeLeft] = true;
            }
          }
        }
      };
    } else {
      statsTracker.current.lastActive = null;
      if (workerRef.current) workerRef.current.postMessage({ type: 'STOP' });
      delete timerRef.current.expectedEndTime;
    }

    return () => {
      delete timerRef.current.beeped1;
      delete timerRef.current.beeped2;
      delete timerRef.current.beeped3;
    };
  }, [isRunning, isReady, phase, currentRound, isGuided, currentStepIdx, soundEnabled]);



  const handlePhaseTransition = () => {
    playBeep('long', !soundEnabled);
    delete timerRef.current.expectedEndTime;

    if (isGuided) {
      if (isReady && activeWorkout) {
        handleGuidedTransition();
      }
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
      if (phase === 'prep' && currentStep.type === 'timer') {
        setPhase('work');
        setTimeLeft(currentStep.duration);
      } else {
        advanceGuidedStep();
      }
    } else if (currentStep.type === 'interval') {
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

      if (isGuided) {
        setActiveWorkout({
          ...activeWorkout,
          timerStats: {
            actualDuration: statsTracker.current.actualDuration,
            plannedDuration: plannedDuration.current
          }
        });
      }
      if (setActiveTab) {
        setActiveTab('logger');
        try { fireLogNudge(activeWorkout.name); } catch (e) {}
      }
    } else {
      const nextStep = activeWorkout.steps[currentStepIdx + 1];
      setCurrentStepIdx(prev => prev + 1);
      prepareGuidedStep(nextStep);

      if (nextStep.type !== 'manual_timer' && nextStep.type !== 'sets' && nextStep.type !== 'text') {
        const stepPrep = getStepPrepTime(nextStep);
        setTimeout(() => {
          setPhase('prep');
          setTimeLeft(stepPrep > 0 ? stepPrep : 0);
          if (stepPrep === 0 && nextStep.type === 'timer') {
            setPhase('work');
            setTimeLeft(nextStep.duration);
          }
          setIsRunning(true);
        }, 50);
      }
    }
  };

  const getStepPrepTime = (step) => {
    if (step && step.prepTime !== undefined) return step.prepTime;
    return globalPrepTime;
  };

  const prepareGuidedStep = (step) => {
    setPhase('stopped');
    setIsRunning(false);
    setCurrentRound(1);
    delete timerRef.current.expectedEndTime;

    if (step.type === 'timer' || step.type === 'manual_timer') {
      setTimeLeft(step.duration);
    } else if (step.type === 'interval') {
      setTimeLeft(getStepPrepTime(step));
    } else if (step.type === 'sets') {
      setTimeLeft(0);
    }
  };

  const startTimer = () => {
    if (isGuided && currentStep) {
      if (currentStep.type !== 'sets') {
        if (phase === 'stopped') {
          const stepPrep = getStepPrepTime(currentStep);
          setPhase('prep');
          setTimeLeft(stepPrep);
          setIsRunning(true);
          playBeep('short', !soundEnabled);
          // if no prep time, jump straight in
          if (stepPrep === 0 && currentStep.type === 'timer') {
            setPhase('work');
            setTimeLeft(currentStep.duration);
          }
        } else {
          setIsRunning(true);
          playBeep('short', !soundEnabled);
        }
      }
    } else {
      if (phase === 'stopped') {
        const manualPrep = globalPrepTime > 0 ? globalPrepTime : 10;
        setPhase('prep');
        setTimeLeft(manualPrep);
        setCurrentRound(1);
      }
      setIsRunning(true);
      playBeep('short', !soundEnabled);
    }
  };

  const completeSet = () => {
    if (isGuided && currentStep && currentStep.type === 'sets') {
      setPhase('rest');
      setTimeLeft(currentStep.rest);
      setIsRunning(true);
      playBeep('long', !soundEnabled);
    }
  };

  const pauseTimer = () => setIsRunning(false);

  const stopTimer = () => {
    setIsRunning(false);
    setPhase('stopped');
    setTimeLeft(0);
    setCurrentRound(1);
    setCurrentStepIdx(0);
    if (isGuided && showConfirm) {
      const partialStats = {
        ...activeWorkout,
        timerStats: {
          actualDuration: statsTracker.current.actualDuration,
          plannedDuration: plannedDuration.current
        }
      };
      showConfirm(
        'Interrompi Workout',
        `Vuoi loggare l'attività parziale o annullare?`,
        () => { setActiveWorkout(partialStats); if (setActiveTab) setActiveTab('logger'); },
        () => { setActiveWorkout(null); }
      );
    }
  };

  const skipStep = () => {
    delete timerRef.current.expectedEndTime;
    if (!isGuided) {
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
      handleGuidedTransition();
    }
  };

  const previousStep = () => {
    delete timerRef.current.expectedEndTime;

    if (!isGuided) {
      // Manual timer: go back one phase
      if (phase === 'rest') {
        setPhase('work');
        setTimeLeft(work);
      } else if (phase === 'work' && currentRound > 1) {
        setPhase('rest');
        setTimeLeft(rest);
        setCurrentRound(r => r - 1);
      } else {
        setPhase('stopped');
        setIsRunning(false);
        setTimeLeft(work);
        setCurrentRound(1);
      }
      return;
    }

    // 2. Handle Phase granularity within the current step
    if (currentStep.type === 'interval') {
      if (phase === 'rest') {
        setPhase('work');
        setTimeLeft(currentStep.work);
        return;
      } else if (phase === 'work' && currentRound > 1) {
        setPhase('rest');
        setTimeLeft(currentStep.rest);
        setCurrentRound(r => r - 1);
        return;
      } else if (phase === 'work' && currentRound === 1) {
        // Go back to Prep phase if this is the start of the interval 
        const stepPrep = getStepPrepTime(currentStep);
        if (phase !== 'prep' && stepPrep > 0) {
          setPhase('prep');
          setTimeLeft(stepPrep);
          return;
        }
      }
    } else if (currentStep.type === 'timer' || currentStep.type === 'manual_timer') {
      const stepPrep = getStepPrepTime(currentStep);
      if (phase === 'work' && stepPrep > 0) {
        setPhase('prep');
        setTimeLeft(stepPrep);
        return;
      }
    }

    // 3. Move to the PREVIOUS Step (Exercise)
    if (currentStepIdx === 0) {
      // At the very first exercise, just reset it
      setPhase('stopped');
      setIsRunning(false);
      prepareGuidedStep(currentStep);
      return;
    }

    const prevStepIdx = currentStepIdx - 1;
    const prevStep = activeWorkout.steps[prevStepIdx];

    setCurrentStepIdx(prevStepIdx);
    delete timerRef.current.expectedEndTime;
    setIsRunning(false);

    // Jump into the END of the previous step
    if (prevStep.type === 'interval') {
      setCurrentRound(prevStep.rounds);
      setPhase('work');
      setTimeLeft(prevStep.work);
    } else if (prevStep.type === 'sets') {
      setCurrentRound(prevStep.sets);
      setPhase('stopped');
      setTimeLeft(0);
    } else {
      setCurrentRound(1);
      setPhase('work');
      setTimeLeft(prevStep.duration || 0);
    }
  };

  const getPhaseColor = () => {
    if (phase === 'work') return '#ef4444';
    if (phase === 'rest') return '#3b82f6';
    if (phase === 'prep') return '#f59e0b';
    return '#9ca3af';
  };

  const getPhaseLabel = () => {
    if (phase === 'stopped') return 'READY';
    if (phase === 'prep') return 'PREP';
    if (phase === 'work') return 'WORK';
    if (phase === 'rest') return 'REST';
    return '';
  };

  return (
    <TimerContext.Provider value={{
      // State
      soundEnabled, setSoundEnabled,
      work, setWork, rest, setRest, totalRounds, setTotalRounds,
      isRunning, phase, timeLeft, currentRound, currentStepIdx,
      isGuided, currentStep, activeWorkout,
      getPhaseColor, getPhaseLabel, getNoteTag,


      // Actions
      startTimer, pauseTimer, stopTimer, skipStep, previousStep, completeSet, advanceGuidedStep,

      // Global Settings
      globalPrepTime
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}
