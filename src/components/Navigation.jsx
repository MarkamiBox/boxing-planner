import React from 'react';
import { Calendar, TimerReset, PlusCircle, Activity, User, Brain } from 'lucide-react';

export const tabs = [
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'timer', label: 'Timer', icon: TimerReset },
  { id: 'logger', label: 'Log', icon: PlusCircle },
  { id: 'coach', label: 'Coach', icon: Brain },
  { id: 'stats', label: 'Stats', icon: Activity },
  { id: 'profile', label: 'Profile', icon: User },
];

export function Navigation({ activeTab, setActiveTab }) {
  return (
    <>
      {/* Mobile Bottom Bar */}
      <nav className="mobile-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div className="sidebar-header">
          <h2 className="logo">BXNG<span className="dot">.</span></h2>
        </div>
        <div className="sidebar-menu">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`sidebar-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
