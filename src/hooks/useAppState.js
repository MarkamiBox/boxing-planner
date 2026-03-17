import { useState, useEffect } from 'react';

const APP_VERSION = 'v5'; // Update Presets

const initialProfile = {
  age: '16-20',
  weight: '70',
  height: '175',
  stance: 'Orthodox',
  restingHR: '67',
  vo2max: '42',
  experience: '1.5 years',
  style: 'out-boxer counter-puncher',
  primaryPunch: 'jab',
  levels: { cardio: 3, technique: 3, footwork: 3, defense: 3, jab: 4, reading: 3 }
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

/* 
Step Schema:
type: 'timer' (continuous countdown) | 'interval' (rounds of work/rest) | 'sets' (reps + manual done -> auto rest countdown) | 'text' (manual instruction block) | 'manual_timer' (waits for play button)
*/
const initialSchedule = {
  monday: [
    { 
      id: 'm1', type: 'Running', name: 'Full Roadwork (75 min)', done: false, notes: 'Esci 16:30',
      steps: [
        { id: 's1', type: 'timer', duration: 1200, name: 'Jogging verso il lungomare', instruction: 'Ritmo 6-7 km/h - riscaldamento naturale' },
        { id: 's2', type: 'interval', work: 30, rest: 90, rounds: 10, name: 'Sprint sul lungomare', instruction: '30s sprint massimale + 90s jogging 6 km/h' },
        { id: 's3', type: 'timer', duration: 300, name: 'Corsa continua', instruction: '5 min coda sprint, 7-8 km/h' },
        { id: 's4', type: 'timer', duration: 1200, name: 'Camminata di ritorno', instruction: 'Defaticamento naturale' },
        { id: 's5', type: 'manual_timer', duration: 600, name: 'Stretching a casa', instruction: 'Ileopsoas (45s), Quadricipiti (45s), Adduttori (45s), Polpacci (45s x lato), Spalle (30s), Busto (30s).' }
      ]
    }
  ],
  tuesday: [
    { 
      id: 't1', type: 'Boxing', name: 'iGym: Circuito ai Sacchi', done: false, notes: 'Corso (15:15-16:15)',
      steps: [{ id: 's1', type: 'text', name: 'Corso iGym', instruction: 'Segui il corso in palestra.' }]
    },
    { 
      id: 't2', type: 'Strength', name: 'Forza Esplosiva Casa', done: false, notes: '60 min (16:30-17:30)',
      steps: [
        { id: 's1', type: 'sets', sets: 3, reps: '5 reps', rest: 120, name: 'Flessioni esplosive con clap', instruction: 'Scendi lento, spingi esplosivo staccando le mani.' },
        { id: 's2', type: 'sets', sets: 3, reps: '5 reps', rest: 120, name: 'Squat jump manubri 4-6kg', instruction: 'Scendi a 90°, sali esplosivo.' },
        { id: 's3', type: 'sets', sets: 3, reps: '8 reps', rest: 90, name: 'Military press manubri', instruction: 'Seduto, spingi sopra la testa.' },
        { id: 's4', type: 'sets', sets: 3, reps: '8 reps', rest: 90, name: 'Rowing per braccio', instruction: 'Ginocchio sul banco, schiena piatta.' },
        { id: 's5', type: 'sets', sets: 3, reps: '10 reps', rest: 60, name: 'Shadow lento con manubri 1kg', instruction: 'Solo jab/dir, focus rotazione.' },
        { id: 's6', type: 'sets', sets: 3, reps: '30 sec', rest: 30, name: 'Plank', instruction: 'Tenuta isometrica.' },
        { id: 's7', type: 'sets', sets: 3, reps: '20 reps', rest: 60, name: 'Russian twist', instruction: 'Rotazione completa con manubrio.' },
        { id: 's8', type: 'manual_timer', duration: 600, name: 'Stretching', instruction: 'Stretching completo 10 min.' }
      ]
    }
  ],
  wednesday: [
    { id: 'w1', type: 'Strength', name: 'Core Leggero', done: false, notes: 'Mattina (30 min) se hai tempo',
      steps: [
        { id: 's1', type: 'sets', sets: 3, reps: '30 sec', rest: 30, name: 'Plank' },
        { id: 's2', type: 'sets', sets: 3, reps: '15 reps', rest: 45, name: 'Leg raise lento' },
        { id: 's3', type: 'sets', sets: 3, reps: '20 reps', rest: 45, name: 'Crunch obliqui' },
        { id: 's4', type: 'manual_timer', duration: 600, name: 'Stretching leggero', instruction: '10 min' }
      ]
    },
    { id: 'w2', type: 'Running', name: 'Tapirulan', done: false, notes: '45 min (16:30 - 18:30)',
      steps: [
        { id: 's1', type: 'timer', duration: 300, name: 'Riscaldamento Tapirulan', instruction: '4 km/h' },
        { id: 's2', type: 'timer', duration: 2100, name: 'Corsa sul Tapirulan', instruction: '5.5-6 km/h (fatica a parlare)' },
        { id: 's3', type: 'timer', duration: 300, name: 'Defaticamento Tapirulan', instruction: '4 km/h' }
      ]
    },
    { id: 'w3', type: 'Boxing', name: 'Shadow Tecnico', done: false, notes: '24 min',
      steps: [
        { id: 's1', type: 'interval', work: 180, rest: 60, rounds: 4, name: 'Shadow Tecnico Rounds', instruction: 'R1: Solo jab. R2: Jab+Dir in/out. R3: Footwork puro. R4: Tutto insieme.' },
        { id: 's2', type: 'manual_timer', duration: 600, name: 'Stretching', instruction: '10 min.' }
      ]
    }
  ],
  thursday: [
    { id: 'th1', type: 'Recovery', name: 'Riscaldamento Corda', done: false, notes: '',
      steps: [
        { id: 's1', type: 'interval', work: 180, rest: 60, rounds: 3, name: 'Corda Rounds', instruction: 'R1: base. R2: 30s vel/30s norm. R3: sostenuto continuo.' }
      ]
    },
    { id: 'th2', type: 'Boxing', name: 'Shadow Sessione Libera', done: false, notes: '',
      steps: [
        { id: 's1', type: 'interval', work: 180, rest: 60, rounds: 4, name: 'Shadow Rounds', instruction: 'R1: jab laterale. R2: counter+head mov. R3: combo lente. R4: sparring leggero.' }
      ]
    },
    { id: 'th3', type: 'Boxing', name: 'Sacco', done: false, notes: 'Oberdan (16:30-18:30)',
      steps: [
        { id: 's1', type: 'interval', work: 180, rest: 60, rounds: 5, name: 'Sacco Rounds', instruction: 'R1: jab vel. R2: combo 2 colpi. R3: body shots. R4: potenza. R5: massimale libero.' }
      ]
    },
    { id: 'th4', type: 'Strength', name: 'Core Finale', done: false, notes: '15 min + stretch',
      steps: [
        { id: 's1', type: 'sets', sets: 3, reps: '30 sec', rest: 30, name: 'Plank' },
        { id: 's2', type: 'sets', sets: 3, reps: '20 reps', rest: 45, name: 'Russian twist' },
        { id: 's3', type: 'sets', sets: 3, reps: '15 reps', rest: 45, name: 'Leg raise' },
        { id: 's4', type: 'sets', sets: 3, reps: '20 reps', rest: 45, name: 'Crunch obliqui' },
        { id: 's5', type: 'manual_timer', duration: 600, name: 'Stretching 10 min' }
      ]
    }
  ],
  friday: [
    { id: 'f1', type: 'Recovery', name: 'Mobilità Leggera', done: false, notes: 'Mattina (20 min)',
      steps: [
        { id: 's1', type: 'manual_timer', duration: 1200, name: 'Mobilità & Stretching Gambe', instruction: 'Rotazioni anche, caviglie, spalle. Per mantenere le gambe sciolte per sabato.' }
      ]
    }
  ],
  saturday: [
    { id: 's1', type: 'Boxing', name: 'Palestra Completa iGym', done: false, notes: '5h+\nSpeedball, sacco, shadow, sparring',
      steps: [
        { id: 's1', type: 'text', name: 'Workout in Palestra', instruction: 'Gestisci tempo e pause autonomamente in palestra.' },
        { id: 's2', type: 'manual_timer', duration: 900, name: 'Stretching Finale', instruction: '15 min a fine allenamento.' }
      ]
    }
  ],
  sunday: [
    { id: 'su1', type: 'Recovery', name: 'Riposo Totale', done: false, notes: '', steps: [] }
  ]
};


export function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export function useAppState() {
  const [appVersion, setAppVersion] = useLocalStorage('bxng_app_version', '');
  const [profile, setProfile, resetProfile] = useLocalStorageWithReset('bxng_profile', initialProfile);
  
  const [weeks, setWeeks] = useLocalStorage('bxng_weeks', null);
  const [currentWeekId, setCurrentWeekId] = useLocalStorage('bxng_current_week', null);
  
  const [timerPresets, setTimerPresets, resetTimerPresets] = useLocalStorageWithReset('bxng_timer_presets', initialTimerPresets);
  const [logs, setLogs] = useLocalStorage('bxng_logs', []);
  const [activeWorkout, setActiveWorkout] = useState(null);

  useEffect(() => {
    const todayWeekId = getWeekId();
    
    // Migration from old single schedule or first load
    if (!weeks) {
       const oldScheduleRaw = window.localStorage.getItem('bxng_schedule');
       let starterSchedule = initialSchedule;
       if (oldScheduleRaw) {
         try { starterSchedule = JSON.parse(oldScheduleRaw); } catch(e){}
       }
       setWeeks({ [todayWeekId]: starterSchedule });
       setCurrentWeekId(todayWeekId);
    } else if (!currentWeekId) {
       setCurrentWeekId(todayWeekId);
    }

    if (appVersion !== 'v4') {
      // Force rewrite to ensure new schema
      setWeeks({ [todayWeekId]: initialSchedule });
      setCurrentWeekId(todayWeekId);
      resetTimerPresets();
      setAppVersion('v4');
    }
  }, [appVersion, weeks, currentWeekId, setWeeks, setCurrentWeekId, resetTimerPresets, setAppVersion]);

  // Alias for backward compatibility with views
  const schedule = weeks && currentWeekId && weeks[currentWeekId] ? weeks[currentWeekId] : initialSchedule;
  
  const setSchedule = (newSchedule) => {
    if (!currentWeekId) return;
    setWeeks(prev => ({ ...prev, [currentWeekId]: newSchedule }));
  };

  return {
    profile, setProfile,
    weeks, setWeeks,
    currentWeekId, setCurrentWeekId,
    schedule, setSchedule,
    timerPresets, setTimerPresets,
    logs, setLogs,
    activeWorkout, setActiveWorkout
  };
}

// Same useLocalStorage functions below normally...
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) { console.warn(error); }
  };
  return [storedValue, setValue];
}

function useLocalStorageWithReset(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {}
  };

  const resetValue = () => {
    setStoredValue(initialValue);
    window.localStorage.setItem(key, JSON.stringify(initialValue));
  };
  return [storedValue, setValue, resetValue];
}
