import React from 'react';
import { Play, Pause, Square, ExternalLink } from 'lucide-react';
import { useTimer } from './TimerContext';
import { pipRenderer } from '../utils/pipTimer';
import { formatTime } from '../utils';

export function GlobalTimerBar({ activeTab, setActiveTab }) {
  const {
    isRunning,
    phase,
    timeLeft,
    getPhaseColor,
    getPhaseLabel,
    startTimer,
    pauseTimer,
    stopTimer,
    isGuided,
    currentRound,
    totalRounds,
    currentStep
  } = useTimer();

  // Hide the global bar if we are on the Timer tab itself
  if (activeTab === 'timer') return null;
  // Or hide if fully stopped and not in guided mode
  if (phase === 'stopped' && !isGuided) return null;
  // If guided but stopped at the very beginning, maybe show minimal or hide
  if (phase === 'stopped' && isGuided && currentStep && currentStep.type === 'text') return null;

  const bg = getPhaseColor();

  const handlePiP = async () => {
    await pipRenderer.requestPiP();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '60px', /* Above the navigation bar which is usually fixed at bottom or top */
      left: '10px',
      right: '10px',
      backgroundColor: 'var(--surface)',
      border: `2px solid ${bg}`,
      borderRadius: '8px',
      padding: '0.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      zIndex: 100,
      cursor: 'pointer'
    }} onClick={(e) => {
      // If they click the bar itself (not buttons), go to Timer tab
      if (e.target === e.currentTarget) {
         setActiveTab('timer');
      }
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        <span style={{ fontSize: '0.75rem', color: bg, fontWeight: 'bold' }}>
          {getPhaseLabel()} {phase !== 'stopped' && phase !== 'prep' && (
            (!isGuided && `- RND ${currentRound}/${totalRounds}`) ||
            (isGuided && currentStep?.type === 'interval' && `- RND ${currentRound}/${currentStep.rounds}`)
          )}
        </span>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
          {formatTime(timeLeft)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handlePiP(); }} style={{ padding: '6px', color: 'var(--text-muted)' }} title="Picture-in-Picture">
          <ExternalLink size={20} />
        </button>
        {!isRunning ? (
          <button className="btn-icon" onClick={(e) => { e.stopPropagation(); startTimer(); }} style={{ padding: '6px', backgroundColor: 'var(--primary)', color: 'white', border: 'none' }}>
            <Play size={20} fill="white" />
          </button>
        ) : (
          <button className="btn-icon" onClick={(e) => { e.stopPropagation(); pauseTimer(); }} style={{ padding: '6px', backgroundColor: 'var(--surface-hover)' }}>
            <Pause size={20} />
          </button>
        )}
        <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); stopTimer(); }} style={{ padding: '6px' }}>
          <Square size={20} />
        </button>
      </div>
    </div>
  );
}
