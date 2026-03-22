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
import { CoachView } from './views/CoachView';
import { useAppState, useLocalStorage } from './hooks/useAppState';
import { TimerProvider } from './components/TimerContext';
import { GlobalTimerBar } from './components/GlobalTimerBar';

function AppContent() {
  const [activeTab, setActiveTab] = useLocalStorage('bxng_active_tab', 'schedule');
  const appState = useAppState();

  const renderView = () => {
    switch (activeTab) {
      case 'schedule': return <ScheduleView schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} logs={appState.logs} setLogs={appState.setLogs} />;
      case 'timer': return <TimerView presets={appState.timerPresets} setPresets={appState.setTimerPresets} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} />;
      case 'logger': return <LoggerView logs={appState.logs} setLogs={appState.setLogs} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} schedule={appState.schedule} setSchedule={appState.setSchedule} setActiveTab={setActiveTab} setPendingCoachContext={appState.setPendingCoachContext} />;
      case 'coach': return <CoachView profile={appState.profile} setProfile={appState.setProfile} schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} logs={appState.logs} goals={appState.goals} setGoals={appState.setGoals} coachMemory={appState.coachMemory} setCoachMemory={appState.setCoachMemory} coachSettings={appState.coachSettings} setCoachSettings={appState.setCoachSettings} coachConversations={appState.coachConversations} setCoachConversations={appState.setCoachConversations} pendingCoachContext={appState.pendingCoachContext} setPendingCoachContext={appState.setPendingCoachContext} />;
      case 'stats': return <StatsView logs={appState.logs} setLogs={appState.setLogs} />;
      case 'profile': return <ProfileView profile={appState.profile} setProfile={appState.setProfile} logs={appState.logs} setLogs={appState.setLogs} goals={appState.goals} setGoals={appState.setGoals} />;
      default: return <ScheduleView schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} logs={appState.logs} setLogs={appState.setLogs} />;
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
