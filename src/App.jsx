import React, { useState } from 'react';
import './index.css';
import './nav.css';
import { CustomDialog } from './components/CustomDialog';
import { Navigation } from './components/Navigation';
import { ScheduleView } from './views/ScheduleView';
import { TimerView } from './views/TimerView';
import { LoggerView } from './views/LoggerView';
import { StatsView } from './views/StatsView';
import { ProfileView } from './views/ProfileView';
import { useAppState } from './hooks/useAppState';

function App() {
  const [activeTab, setActiveTab] = useState('schedule');
  const appState = useAppState();

  const [dialogState, setDialogState] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null, onCancel: null });

  const showAlert = (title, message) => {
    setDialogState({ isOpen: true, title, message, type: 'alert', onConfirm: () => setDialogState(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title, message, onConfirm, onCancel) => {
    setDialogState({ 
      isOpen: true, title, message, type: 'confirm', 
      onConfirm: () => { setDialogState(prev => ({ ...prev, isOpen: false })); if(onConfirm) onConfirm(); },
      onCancel: () => { setDialogState(prev => ({ ...prev, isOpen: false })); if(onCancel) onCancel(); }
    });
  };

  const renderView = () => {
    switch (activeTab) {
      case 'schedule': return <ScheduleView schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} setLogs={appState.setLogs} showAlert={showAlert} showConfirm={showConfirm} />;
      case 'timer': return <TimerView presets={appState.timerPresets} setPresets={appState.setTimerPresets} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} />;
      case 'logger': return <LoggerView logs={appState.logs} setLogs={appState.setLogs} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} />;
      case 'stats': return <StatsView logs={appState.logs} setLogs={appState.setLogs} showAlert={showAlert} showConfirm={showConfirm} />;
      case 'profile': return <ProfileView profile={appState.profile} setProfile={appState.setProfile} logs={appState.logs} setLogs={appState.setLogs} showAlert={showAlert} showConfirm={showConfirm} />;
      default: return <ScheduleView schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} setLogs={appState.setLogs} showAlert={showAlert} showConfirm={showConfirm} />;
    }
  };

  return (
    <div className="app-container">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        {renderView()}
      </div>
      <CustomDialog state={dialogState} />
    </div>
  );
}

export default App;
