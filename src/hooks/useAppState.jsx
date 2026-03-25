import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { get, set, keys } from 'idb-keyval';
import { getWeekId } from '../utils';
import { translations } from '../translations';

const APP_VERSION = 'v5'; // Update Presets

const initialProfile = {
  age: '20-25',
  weight: '75',
  height: '180',
  stance: 'Orthodox',
  restingHR: '65',
  vo2max: '40',
  experience: '6 months',
  style: 'all-around',
  primaryPunch: 'jab',
  prepTime: 60,
  voiceTriggerWord: 'nota',
  voiceNotesEnabled: true,
  levels: { cardio: 2, technique: 2, footwork: 2, defense: 2, jab: 2, reading: 2 },
  chronotype: 'inconsistent',
  wakeupRampMinutes: 60,
  jobLoad: 'variable',
  sleepConsistency: 'mostly',
  minSessionMinutes: 20,
  consecutiveDaysPreference: 'flexible',
  weatherThreshold: 'light_ok',
  travelTrainingStyle: null,
  mealBufferEnabled: false,
  locations: []
};

const initialTimerPresets = [
  { id: '1', name: 'Amateur Boxe (3m / 1m x 3)', work: 180, rest: 60, rounds: 3 },
  { id: '2', name: 'Pro Boxe (3m / 1m x 12)', work: 180, rest: 60, rounds: 12 },
  { id: '3', name: 'Sparring Condizionato (2m / 30s x 6)', work: 120, rest: 30, rounds: 6 },
  { id: '4', name: 'Sprints HIIT (30s max / 90s jog x 10)', work: 30, rest: 90, rounds: 10 },
  { id: '5', name: 'Tabata (20s work / 10s rest x 8)', work: 20, rest: 10, rounds: 8 },
  { id: '6', name: 'Forza Resistente (60s work / 2m rest x 3)', work: 60, rest: 120, rounds: 3 },
  { id: '7', name: 'Core Routine (45s work / 15s rest x 5)', work: 45, rest: 15, rounds: 5 },
  { id: '8', name: 'Sacco Pesante (3m / 30s x 5)', work: 180, rest: 30, rounds: 5 }
];

const initialSchedule = {
  monday: [
    {
      id: 'm1', type: 'Running', name: 'Roadwork Parco (45 min)', done: false, notes: '17:00 - Corsa leggera',
      steps: [
        { id: 's1', type: 'timer', duration: 600, name: 'Riscaldamento', instruction: 'Corsa molto lenta' },
        { id: 's2', type: 'timer', duration: 1800, name: 'Corsa Continua', instruction: 'Ritmo costante, respira regolarmente' },
        { id: 's3', type: 'manual_timer', duration: 300, name: 'Stretching Finale', instruction: 'Gambe e schiena' }
      ]
    }
  ],
  tuesday: [
    {
      id: 't1', type: 'Boxing', name: 'Palestra: Fondamentali', done: false, notes: 'Corso Tecnico (18:00)',
      steps: [{ id: 's1', type: 'text', name: 'Allenamento di Classe', instruction: 'Segui le istruzioni del maestro.' }]
    }
  ],
  wednesday: [
    {
      id: 'w1', type: 'Recovery', name: 'Mobilità Casa', done: false, notes: '20 min',
      steps: [
        { id: 's1', type: 'manual_timer', duration: 1200, name: 'Routine Mobilità', instruction: 'Rotazioni articolari e stretching dinamico.' }
      ]
    }
  ],
  thursday: [
    {
      id: 'th1', type: 'Boxing', name: 'Sacco & Shadow Palestra', done: false, notes: 'Focus: Jab e Distanza',
      steps: [
        { id: 's1', type: 'interval', work: 180, rest: 60, rounds: 3, name: 'Shadow Boxing', instruction: 'Focus su footwork e jab.' },
        { id: 's2', type: 'interval', work: 180, rest: 60, rounds: 4, name: 'Lavoro al Sacco', instruction: 'R1-2: Jab. R3-4: Combinazioni base.' }
      ]
    }
  ],
  friday: [
    {
      id: 'f1', type: 'Strength', name: 'Circuito Forza Casa', done: false, notes: 'Corpo libero',
      steps: [
        { id: 's1', type: 'sets', sets: 3, reps: '10', rest: 60, name: 'Pushups' },
        { id: 's2', type: 'sets', sets: 3, reps: '15', rest: 60, name: 'Squats' },
        { id: 's3', type: 'sets', sets: 3, reps: '30 sec', rest: 30, name: 'Plank' }
      ]
    }
  ],
  saturday: [
    {
      id: 's1', type: 'Boxing', name: 'Sessione Libera Palestra', done: false, notes: 'Ripasso tecnico e sacco',
      steps: [
        { id: 's1', type: 'text', name: 'Workout Libero', instruction: 'Lavora sui tuoi punti deboli.' }
      ]
    }
  ],
  sunday: [
    { id: 'su1', type: 'Recovery', name: 'Riposo Totale', done: false, notes: '', steps: [] }
  ]
};

const AppStateStoreContext = createContext(null);

export function AppStateProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [store, setStore] = useState({});
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    async function init() {
      let migrated = window.localStorage.getItem('bxng_migrated_idb');
      if (!migrated) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('bxng_')) {
            try { await set(key, JSON.parse(window.localStorage.getItem(key))); } catch (e) { }
          }
        }
        window.localStorage.setItem('bxng_migrated_idb', 'true');
      }

      try {
        const dbKeys = await keys();
        const loaded = {};
        for (const key of dbKeys) {
          if (key.startsWith('bxng_')) {
            try {
              loaded[key] = await get(key);
            } catch (e) {
              console.error("IDB Get Error", e);
              setStorageError(e.message || "Error reading from database");
            }
          }
        }
        setStore(loaded);
        setIsLoaded(true);
      } catch (e) {
        console.error("IDB Init Error", e);
        setStorageError(e.message || "Database connection failed");
        setIsLoaded(true); // Still load with empty store
      }
    }
    init();
  }, []);

  if (!isLoaded) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🥊</div>
        <div>Loading AI Database...</div>
      </div>
    );
  }

  return (
    <AppStateStoreContext.Provider value={{ store, setStore, storageError, setStorageError }}>
      {children}
    </AppStateStoreContext.Provider>
  );
}

export function useIdbStorage(key, initialValue) {
  const ctx = useContext(AppStateStoreContext);
  if (!ctx) throw new Error("useIdbStorage must be used within AppStateProvider");
  const { store, setStore, storageError, setStorageError } = ctx;

  const storedValue = store[key] !== undefined ? store[key] : initialValue;

  const setValue = (value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStore(prev => ({ ...prev, [key]: valueToStore }));
    set(key, valueToStore).catch(err => {
      console.error("IDB Save Error", err);
      setStorageError(err.message || String(err));
    });
  };

  const resetValue = () => {
    setStore(prev => ({ ...prev, [key]: initialValue }));
    set(key, initialValue).catch(err => {
      setStorageError(err.message || String(err));
    });
  };

  return [storedValue, setValue, resetValue, storageError, setStorageError];
}

export function useAppState() {
  const { storageError, setStorageError } = useContext(AppStateStoreContext);
  const [appVersion, setAppVersion] = useIdbStorage('bxng_app_version', '');
  const [profile, setProfile] = useIdbStorage('bxng_profile', initialProfile);
  const [weeks, setWeeks] = useIdbStorage('bxng_weeks', null);
  const [currentWeekId, setCurrentWeekId] = useIdbStorage('bxng_current_week', null);
  const [timerPresets, setTimerPresets, resetTimerPresets] = useIdbStorage('bxng_timer_presets', initialTimerPresets);
  const [logs, setLogs] = useIdbStorage('bxng_logs', []);
  const [activeWorkout, setActiveWorkout] = useIdbStorage('bxng_active_workout', null);
  const [goals, setGoals] = useIdbStorage('bxng_goals', []);
  const [coachConversations, setCoachConversations] = useIdbStorage('bxng_coach_conversations', []);
  const [coachMemory, setCoachMemory] = useIdbStorage('bxng_coach_memory', {
    preferences: [], observations: [], decisions: [], injuries: [], patterns: [], progress_notes: []
  });
  const [coachSettings, setCoachSettings] = useIdbStorage('bxng_coach_settings', {
    apiKey: '', model: 'claude-sonnet-4-20250514', anthropicKey: '', openrouterKey: '', googleKey: '', activeProvider: 'anthropic'
  });
  const [pendingWeekProposal, setPendingWeekProposal] = useIdbStorage('bxng_pending_week_proposal', null);
  const [availability, setAvailability] = useIdbStorage('bxng_availability', {});
  const [availabilityTemplate, setAvailabilityTemplate] = useIdbStorage('bxng_availability_template', {});
  const [pendingCoachContext, setPendingCoachContext] = useState(null);
  const [pendingTools, setPendingTools] = useState(null);
  const [sessionNotes, setSessionNotes] = useIdbStorage('bxng_session_notes', []);
  const [language, setLanguage] = useIdbStorage('bxng_language', 'en');

  const t = (key) => {
    const keys = key.split('.');
    let val = translations[language] || translations['en'];
    for(const k of keys) {
      if (val[k] !== undefined) val = val[k];
      else return key;
    }
    return val;
  };

  useEffect(() => {
    const todayWeekId = getWeekId();
    
    // Initial data setup for new users
    if (!weeks) {
      setWeeks({ [todayWeekId]: initialSchedule });
      setCurrentWeekId(todayWeekId);
    } else if (!currentWeekId) {
      // Fallback if currentWeekId is missing but weeks exist
      setCurrentWeekId(todayWeekId);
    }

    // Update app version tracking without wiping user data
    if (appVersion !== APP_VERSION) {
      setAppVersion(APP_VERSION);
    }
  }, [appVersion, weeks, currentWeekId, setWeeks, setCurrentWeekId, setAppVersion]);

  const schedule = useMemo(() => {
    return weeks && currentWeekId && weeks[currentWeekId] ? weeks[currentWeekId] : initialSchedule;
  }, [weeks, currentWeekId]);

  const setSchedule = useCallback((newSchedule) => {
    if (!currentWeekId) return;
    setWeeks(prev => ({ ...(prev || {}), [currentWeekId]: newSchedule }));
  }, [setWeeks, currentWeekId]);

  return {
    profile, setProfile,
    weeks, setWeeks,
    currentWeekId, setCurrentWeekId,
    schedule, setSchedule,
    timerPresets, setTimerPresets,
    logs, setLogs,
    activeWorkout, setActiveWorkout,
    goals, setGoals,
    coachConversations, setCoachConversations,
    coachMemory, setCoachMemory,
    coachSettings, setCoachSettings,
    pendingWeekProposal, setPendingWeekProposal,
    pendingCoachContext, setPendingCoachContext,
    pendingTools, setPendingTools,
    availability, setAvailability,
    availabilityTemplate, setAvailabilityTemplate,
    sessionNotes, setSessionNotes,
    storageError, setStorageError,
    language, setLanguage, t
  };
}