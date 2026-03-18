import React, { useState } from 'react';
import './index.css';
import './nav.css';
import { DialogProvider } from './components/DialogContext';
import { Navigation } from './components/Navigation';
import { ScheduleView } from './views/ScheduleView';
import { TimerView } from './views/TimerView';
import { LoggerView } from './views/LoggerView';
import { StatsView } from './views/StatsView';
import { ProfileView } from './views/ProfileView';
import { useAppState, useLocalStorage } from './hooks/useAppState';
import { TimerProvider } from './components/TimerContext';
import { GlobalTimerBar } from './components/GlobalTimerBar';

function AppContent() {
  const [activeTab, setActiveTab] = useLocalStorage('bxng_active_tab', 'schedule');
  const appState = useAppState();

  const renderView = () => {
    switch (activeTab) {
      case 'schedule': return <ScheduleView schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} setLogs={appState.setLogs} />;
      case 'timer': return <TimerView presets={appState.timerPresets} setPresets={appState.setTimerPresets} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} />;
      case 'logger': return <LoggerView logs={appState.logs} setLogs={appState.setLogs} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} schedule={appState.schedule} setSchedule={appState.setSchedule} />;
      case 'stats': return <StatsView logs={appState.logs} setLogs={appState.setLogs} />;
      case 'profile': return <ProfileView profile={appState.profile} setProfile={appState.setProfile} logs={appState.logs} setLogs={appState.setLogs} />;
      default: return <ScheduleView schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} setLogs={appState.setLogs} />;
    }
  };

  return (
    <TimerProvider activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} globalPrepTime={appState.profile?.prepTime !== undefined ? appState.profile.prepTime : 10}>
      <div className="app-container">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="main-content">
          {renderView()}
        </div>
        <GlobalTimerBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </TimerProvider>
  );
}

function App() {
  return (
    <DialogProvider>
      <AppContent />
    </DialogProvider>
  );
}

export default App;
