import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Trash2 } from 'lucide-react';
import './stats.css';

export function StatsView({ logs, setLogs }) {
  // Compute session counts
  const typeCounts = logs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {});

  const totalSessions = logs.length;

  const getWeekDateRange = (wId) => {
    if (!wId) return '';
    try {
      const [y, w] = wId.split('-W');
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      const end = new Date(ISOweekStart);
      end.setDate(end.getDate() + 6);
      const format = (d) => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      return `${format(ISOweekStart)} - ${format(end)}`;
    } catch { return wId; }
  };

  // Prepare chart data (reverse to chronological, ignoring placeholder 0 energy logs)
  const chartData = [...logs].reverse().filter(l => l.energy > 0).map(log => ({
    date: log.date.substring(5), // mm-dd
    energy: log.energy,
    cardio: log.cardio,
    legs: log.legs,
  }));

  const handleDeleteLog = (id) => {
    if (confirm("Sei sicuro di voler eliminare questa sessione?")) {
      setLogs(logs.filter(l => l.id !== id));
    }
  };

  return (
    <div className="page-container stats-view">
      <h1 className="page-title">Statistics</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="stat-card boxing">
          <div className="stat-value">{typeCounts['Boxing'] || 0}</div>
          <div className="stat-label">Boxing</div>
        </div>
        <div className="stat-card running">
          <div className="stat-value">{typeCounts['Running'] || 0}</div>
          <div className="stat-label">Running</div>
        </div>
        <div className="stat-card strength">
          <div className="stat-value">{typeCounts['Strength'] || 0}</div>
          <div className="stat-label">Strength</div>
        </div>
      </div>

      <div className="chart-container card">
        <h3 className="section-title">Performance Trends</h3>
        {chartData.length < 2 ? (
          <div className="empty-state">Not enough full data to show trends. Log at least 2 sessions with Energy ratings.</div>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="var(--text-muted)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} name="Energy" />
                <Line type="monotone" dataKey="cardio" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} name="Cardio" />
                <Line type="monotone" dataKey="legs" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} name="Legs" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 className="section-title">Session History</h3>
        {logs.length === 0 ? (
          <div className="empty-state">No sessions logged yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.slice().reverse().map(log => (
               <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                 <div>
                   <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>[{log.type}] {log.name || 'Session'}</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                     {log.date} {log.weekId ? `(${getWeekDateRange(log.weekId)})` : ''} • E: {log.energy || '-'}, C: {log.cardio || '-'}
                   </div>
                 </div>
                 <button className="btn-icon danger" onClick={() => handleDeleteLog(log.id)} style={{ padding: '6px' }} title="Delete Log">
                   <Trash2 size={18} />
                 </button>
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
