import React, { useState } from 'react';
import './index.css';
import './nav.css';
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

  const renderView = () => {
    switch (activeTab) {
      case 'schedule': return <ScheduleView schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} setLogs={appState.setLogs} />;
      case 'timer': return <TimerView presets={appState.timerPresets} setPresets={appState.setTimerPresets} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} />;
      case 'logger': return <LoggerView logs={appState.logs} setLogs={appState.setLogs} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} />;
      case 'stats': return <StatsView logs={appState.logs} setLogs={appState.setLogs} />;
      case 'profile': return <ProfileView profile={appState.profile} setProfile={appState.setProfile} />;
      default: return <ScheduleView schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} setLogs={appState.setLogs} />;
    }
  };

  return (
    <div className="app-container">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        {renderView()}
      </div>
    </div>
  );
}

export default App;
