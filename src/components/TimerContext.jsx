import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { pipRenderer } from '../utils/pipTimer';
import { formatTime } from '../utils';
import { useDialog } from './DialogContext';

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

export function TimerProvider({ children, activeWorkout, setActiveWorkout, setActiveTab, globalPrepTime = 10 }) {
  const { showConfirm } = useDialog();
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
  const statsTracker = useRef({ actualDuration: 0, skippedSteps: 0, lastActive: null });
  const plannedDuration = useRef(0);

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
  }, [phase, isRunning, currentRound, currentStepIdx, timeLeft, isGuided]);

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
  }, [activeWorkout, isGuided, phase, currentStepIdx]);

  // Robust background-proof timer execution
  useEffect(() => {
    if (isRunning) {
      if (!timerRef.current.expectedEndTime) {
        timerRef.current.expectedEndTime = Date.now() + (timeLeft * 1000);
      }

      timerRef.current.interval = setInterval(() => {
        const now = Date.now();
        
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
      }, 250);
    } else {
      statsTracker.current.lastActive = null;
      if (timerRef.current?.interval) clearInterval(timerRef.current.interval);
      delete timerRef.current.expectedEndTime; 
    }
    
    return () => {
       if (timerRef.current?.interval) clearInterval(timerRef.current.interval);
       delete timerRef.current.beeped1;
       delete timerRef.current.beeped2;
       delete timerRef.current.beeped3;
    };
  }, [isRunning, phase, currentRound, isGuided, currentStepIdx, timeLeft, soundEnabled]);

  const handlePhaseTransition = () => {
    playBeep('long', !soundEnabled);
    delete timerRef.current.expectedEndTime;

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
      advanceGuidedStep();
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
            plannedDuration: plannedDuration.current,
            skippedSteps: statsTracker.current.skippedSteps
          }
        });
      }
      if (setActiveTab) setActiveTab('logger');
    } else {
      const nextStep = activeWorkout.steps[currentStepIdx + 1];
      setCurrentStepIdx(prev => prev + 1);
      prepareGuidedStep(nextStep);
      
      if (nextStep.type !== 'manual_timer' && nextStep.type !== 'sets' && nextStep.type !== 'text') {
        setTimeout(() => {
          setPhase('prep');
          setTimeLeft(globalPrepTime > 0 ? globalPrepTime : 0);
          if (globalPrepTime === 0 && nextStep.type === 'timer') {
             setPhase('work');
             setTimeLeft(nextStep.duration);
          }
          setIsRunning(true);
        }, 50);
      }
    }
  };

  const getStepPrepTime = () => globalPrepTime;

  const prepareGuidedStep = (step) => {
    setPhase('stopped');
    setIsRunning(false);
    setCurrentRound(1);
    delete timerRef.current.expectedEndTime;

    if (step.type === 'timer' || step.type === 'manual_timer') {
      setTimeLeft(step.duration);
    } else if (step.type === 'interval') {
      setTimeLeft(getStepPrepTime());
    } else if (step.type === 'sets') {
      setTimeLeft(0);
    }
  };

  const startTimer = () => {
    if (isGuided && currentStep) {
      if (currentStep.type !== 'sets') {
        if (phase === 'stopped') {
           setPhase('prep');
           setTimeLeft(getStepPrepTime());
           setIsRunning(true);
           playBeep('short', !soundEnabled);
           // if no prep time, jump straight in
           if (getStepPrepTime() === 0 && currentStep.type === 'timer') {
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
        setPhase('prep');
        setTimeLeft(getStepPrepTime() > 0 ? getStepPrepTime() : 10);
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
          plannedDuration: plannedDuration.current,
          skippedSteps: statsTracker.current.skippedSteps
        }
      };
      showConfirm(
        'Interrompi Workout',
        `Vuoi loggare l'attività parziale o annullare?`,
        () => { setActiveWorkout(partialStats); if(setActiveTab) setActiveTab('logger'); },
        () => { setActiveWorkout(null); }
      );
    }
  };

  const skipStep = () => {
    statsTracker.current.skippedSteps += 1;
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
      advanceGuidedStep();
    }
  };

  const previousStep = () => {
    if (!isGuided || currentStepIdx === 0) return;
    statsTracker.current.skippedSteps = Math.max(0, statsTracker.current.skippedSteps - 1);
    const prevStep = activeWorkout.steps[currentStepIdx - 1];
    setCurrentStepIdx(prev => prev - 1);
    prepareGuidedStep(prevStep);
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

  // Sync to PiP renderer
  useEffect(() => {
    const dsc = isGuided ? (currentStep ? currentStep.name : '') : 'Manual Boxe Timer';
    pipRenderer.updateState(getPhaseLabel(), timeLeft, dsc, isRunning, getPhaseColor());
  }, [phase, timeLeft, isRunning, isGuided, currentStepIdx, activeWorkout]);

  // Hook up Media Session callbacks
  useEffect(() => {
    pipRenderer.setCallbacks(
      () => { if (isRunning) pauseTimer(); else startTimer(); },
      () => { skipStep(); },
      () => { previousStep(); }
    );
  }, [isRunning, phase, currentStepIdx]);

  return (
    <TimerContext.Provider value={{
      // State
      soundEnabled, setSoundEnabled,
      work, setWork, rest, setRest, totalRounds, setTotalRounds,
      isRunning, phase, timeLeft, currentRound, currentStepIdx,
      isGuided, currentStep,
      getPhaseColor, getPhaseLabel,
      
      // Actions
      startTimer, pauseTimer, stopTimer, skipStep, previousStep, completeSet,
      
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
