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
import { useAppState, AppStateProvider, useIdbStorage } from './hooks/useAppState';
import { TimerProvider } from './components/TimerContext';
import { GlobalTimerBar } from './components/GlobalTimerBar';

function AppContent() {
  const [activeTab, setActiveTab] = useIdbStorage('bxng_active_tab', 'schedule');
  const appState = useAppState();
  const [sessionNotes, setSessionNotes] = useState([]);

  const addSessionNote = (note) => {
    setSessionNotes(prev => [note, ...prev]);
  };
  const clearSessionNotes = () => setSessionNotes([]);

  const renderView = () => {
    switch (activeTab) {
      case 'schedule': return <ScheduleView profile={appState.profile} schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} logs={appState.logs} setLogs={appState.setLogs} />;
      case 'timer': return <TimerView presets={appState.timerPresets} setPresets={appState.setTimerPresets} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} sessionNotes={sessionNotes} addSessionNote={addSessionNote} />;
      case 'logger': return <LoggerView logs={appState.logs} setLogs={appState.setLogs} activeWorkout={appState.activeWorkout} setActiveWorkout={appState.setActiveWorkout} schedule={appState.schedule} setSchedule={appState.setSchedule} setActiveTab={setActiveTab} setPendingCoachContext={appState.setPendingCoachContext} sessionNotes={sessionNotes} clearSessionNotes={clearSessionNotes} />;
      case 'coach': return <CoachView profile={appState.profile} setProfile={appState.setProfile} schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} logs={appState.logs} goals={appState.goals} setGoals={appState.setGoals} coachMemory={appState.coachMemory} setCoachMemory={appState.setCoachMemory} coachSettings={appState.coachSettings} setCoachSettings={appState.setCoachSettings} coachConversations={appState.coachConversations} setCoachConversations={appState.setCoachConversations} pendingCoachContext={appState.pendingCoachContext} setPendingCoachContext={appState.setPendingCoachContext} pendingTools={appState.pendingTools} setPendingTools={appState.setPendingTools} pendingWeekProposal={appState.pendingWeekProposal} setPendingWeekProposal={appState.setPendingWeekProposal} availability={appState.availability} setAvailability={appState.setAvailability} availabilityTemplate={appState.availabilityTemplate} setAvailabilityTemplate={appState.setAvailabilityTemplate} />;
      case 'stats': return <StatsView logs={appState.logs} setLogs={appState.setLogs} />;
      case 'profile': return <ProfileView profile={appState.profile} setProfile={appState.setProfile} logs={appState.logs} setLogs={appState.logs} goals={appState.goals} setGoals={appState.setGoals} availability={appState.availability} setAvailability={appState.setAvailability} availabilityTemplate={appState.availabilityTemplate} setAvailabilityTemplate={appState.setAvailabilityTemplate} />;
      default: return <ScheduleView profile={appState.profile} schedule={appState.schedule} setSchedule={appState.setSchedule} weeks={appState.weeks} setWeeks={appState.setWeeks} currentWeekId={appState.currentWeekId} setCurrentWeekId={appState.setCurrentWeekId} setActiveWorkout={appState.setActiveWorkout} setActiveTab={setActiveTab} logs={appState.logs} setLogs={appState.setLogs} />;
    }
  };

  return (
    <TimerProvider
      activeWorkout={appState.activeWorkout}
      setActiveWorkout={appState.setActiveWorkout}
      setActiveTab={setActiveTab}
      globalPrepTime={appState.profile?.prepTime !== undefined ? appState.profile.prepTime : 60}
      profile={appState.profile}
      addSessionNote={addSessionNote}
    >
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
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </DialogProvider>
  );
}

export default App;