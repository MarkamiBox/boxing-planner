import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import { Trash2, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { getWeekId } from '../utils';
import { useDialog } from '../components/DialogContext';
import './stats.css';

function parseMins(log) {
  if (!log.duration) return 0;
  if (typeof log.duration === 'number') return log.duration;
  return parseInt(log.duration.replace(/[^0-9]/g, '')) || 0;
}

const TYPE_COLORS = { Boxing: '#ef4444', Running: '#3b82f6', Strength: '#f59e0b', Recovery: '#10b981' };

export function StatsView({ logs, setLogs }) {
  const { showAlert, showConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllHistory, setShowAllHistory] = useState(false);

  // ─── KPI Computations ────────────────────────────────────────────────────────
  const typeCounts = logs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {});
  const totalSessions = logs.length;
  const totalMinutes = logs.reduce((acc, l) => acc + parseMins(l), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // ─── Performance Trend (per-session) ─────────────────────────────────────────
  const trendData = [...logs].reverse().filter(l => l.energy > 0).map(log => ({
    date: log.date.substring(5),
    energy: log.energy,
    cardio: log.cardio,
    legs: log.legs,
    intensity: log.intensity || 0,
    focus: log.focus || 0,
  }));

  // ─── Weekly Load Bar Chart ───────────────────────────────────────────────────
  const weeklyMap = {};
  logs.forEach(log => {
    const wId = log.weekId || (log.date ? getWeekId(new Date(log.date)) : null);
    if (!wId) return;
    if (!weeklyMap[wId]) weeklyMap[wId] = { wId, mins: 0, sessions: 0 };
    weeklyMap[wId].mins += parseMins(log);
    weeklyMap[wId].sessions += 1;
  });
  const weeklyData = Object.values(weeklyMap)
    .sort((a, b) => a.wId.localeCompare(b.wId))
    .slice(-12)
    .map(w => ({ week: w.wId.split('-W')[1], hours: +(w.mins / 60).toFixed(1), sessions: w.sessions }));

  // ─── Per-type Boxscore ───────────────────────────────────────────────────────
  const typeStats = {};
  logs.filter(l => l.energy > 0).forEach(log => {
    if (!typeStats[log.type]) typeStats[log.type] = { count: 0, energy: 0, cardio: 0, intensity: 0, focus: 0 };
    const t = typeStats[log.type];
    t.count++;
    t.energy += log.energy || 0;
    t.cardio += log.cardio || 0;
    t.intensity += log.intensity || 0;
    t.focus += log.focus || 0;
  });
  const boxscoreData = Object.entries(typeStats).map(([type, s]) => ({
    type,
    Energy: +(s.energy / s.count).toFixed(1),
    Cardio: +(s.cardio / s.count).toFixed(1),
    Intensity: +(s.intensity / s.count).toFixed(1),
    Focus: +(s.focus / s.count).toFixed(1),
    sessions: s.count,
  }));

  // ─── Personal Records ────────────────────────────────────────────────────────
  const validLogs = logs.filter(l => l.energy > 0);
  const pr = {
    bestEnergy: validLogs.reduce((best, l) => l.energy > (best?.energy || 0) ? l : best, null),
    bestCardio: validLogs.reduce((best, l) => l.cardio > (best?.cardio || 0) ? l : best, null),
    bestFocus: validLogs.reduce((best, l) => (l.focus || 0) > ((best?.focus) || 0) ? l : best, null),
    mostRounds: logs.filter(l => l.sparringRounds > 0).reduce((best, l) => l.sparringRounds > (best?.sparringRounds || 0) ? l : best, null),
  };

  // ─── Heatmap ─────────────────────────────────────────────────────────────────
  const today = new Date();
  const heatmapDays = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const logsOnDay = logs.filter(l => l.date === key);
    heatmapDays.push({
      date: key,
      count: logsOnDay.length,
      types: [...new Set(logsOnDay.map(l => l.type))],
    });
  }

  const handleDeleteLog = (id) => {
    showConfirm('Elimina Sessione', 'Sei sicuro di voler eliminare questa sessione?', () => {
      setLogs(logs.filter(l => l.id !== id));
    });
  };

  const getHeatColor = (count) => {
    if (count === 0) return 'var(--surface-hover)';
    if (count === 1) return 'rgba(185, 28, 28, 0.35)';
    if (count === 2) return 'rgba(185, 28, 28, 0.65)';
    return '#b91c1c';
  };

  const displayedHistory = showAllHistory ? logs : logs.slice(0, 8);

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '6px',
        background: activeTab === id ? 'var(--primary)' : 'var(--surface-hover)',
        color: activeTab === id ? 'white' : 'var(--text-muted)',
        border: activeTab === id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >{label}</button>
  );

  return (
    <div className="page-container stats-view">
      <h1 className="page-title">Statistics</h1>

      {/* KPI Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalSessions}</div>
          <div className="stat-label">Sessions</div>
        </div>
        <div className="stat-card" style={{ borderBottom: '4px solid #8b5cf6' }}>
          <div className="stat-value">{totalHours}h</div>
          <div className="stat-label">Total Time</div>
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
        <div className="stat-card" style={{ borderBottom: '4px solid #10b981' }}>
          <div className="stat-value">{typeCounts['Recovery'] || 0}</div>
          <div className="stat-label">Recovery</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <TabBtn id="overview" label="Overview" />
        <TabBtn id="load" label="Weekly Load" />
        <TabBtn id="boxscore" label="By Type" />
        <TabBtn id="records" label="Records 🏆" />
        <TabBtn id="heatmap" label="Heatmap" />
        <TabBtn id="history" label="History" />
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <>
          <div className="chart-container card">
            <h3 className="section-title">Performance Trends (Energy / Cardio / Legs)</h3>
            {trendData.length < 2 ? (
              <div className="empty-state">Log at least 2 sessions with Energy ratings to see trends.</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis domain={[0, 10]} stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Energy" />
                    <Line type="monotone" dataKey="cardio" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Cardio" />
                    <Line type="monotone" dataKey="legs" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Legs" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="chart-container card" style={{ marginTop: '1rem' }}>
            <h3 className="section-title">Intensity & Focus</h3>
            {trendData.filter(d => d.intensity > 0).length < 2 ? (
              <div className="empty-state">Not enough data. Log sessions with Intensity ratings.</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis domain={[0, 10]} stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="intensity" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Intensity" />
                    <Line type="monotone" dataKey="focus" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Focus" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Weekly Load ── */}
      {activeTab === 'load' && (
        <div className="chart-container card">
          <h3 className="section-title">Weekly Training Load (last 12 weeks)</h3>
          {weeklyData.length < 2 ? (
            <div className="empty-state">Not enough data yet. Keep logging sessions!</div>
          ) : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `W${v}`} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    formatter={(v, name) => name === 'Hours' ? `${v}h` : `${v} sessions`}
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                  <Legend />
                  <Bar dataKey="hours" name="Hours" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sessions" name="Sessions" fill="#374151" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── By Type Boxscore ── */}
      {activeTab === 'boxscore' && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>Average Scores Per Session Type</h3>
          {boxscoreData.length === 0 ? (
            <div className="empty-state">No data yet. Log sessions with ratings.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {boxscoreData.map(row => (
                <div key={row.type} style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '1rem', border: `1px solid ${TYPE_COLORS[row.type] || 'var(--border-color)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <strong style={{ color: TYPE_COLORS[row.type] || 'var(--text-main)', fontSize: '1rem' }}>{row.type}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.sessions} sessions</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {['Energy', 'Cardio', 'Intensity', 'Focus'].map(metric => (
                      <div key={metric} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{row[metric] || '-'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{metric}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Personal Records ── */}
      {activeTab === 'records' && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>🏆 Personal Records</h3>
          {validLogs.length === 0 ? (
            <div className="empty-state">No rated sessions yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Best Energy', icon: '⚡', log: pr.bestEnergy, value: pr.bestEnergy?.energy },
                { label: 'Best Cardio', icon: '💨', log: pr.bestCardio, value: pr.bestCardio?.cardio },
                { label: 'Best Focus', icon: '🎯', log: pr.bestFocus, value: pr.bestFocus?.focus },
                { label: 'Most Sparring Rounds', icon: '🥊', log: pr.mostRounds, value: pr.mostRounds?.sparringRounds },
              ].map(({ label, icon, log, value }) => log && (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-color)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '1.75rem' }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{log.name || log.type} — {log.date}</div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{value}<span style={{ fontSize: '1rem' }}>/10</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Heatmap ── */}
      {activeTab === 'heatmap' && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>Training Heatmap — Last 90 Days</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '3px' }}>
            {heatmapDays.map(day => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} session(s)${day.types.length ? ' · ' + day.types.join(', ') : ''}`}
                style={{ width: '100%', aspectRatio: '1', borderRadius: '3px', backgroundColor: getHeatColor(day.count), cursor: day.count > 0 ? 'pointer' : 'default', transition: 'transform 0.1s' }}
                onMouseEnter={e => { if (day.count > 0) e.target.style.transform = 'scale(1.2)'; }}
                onMouseLeave={e => { e.target.style.transform = 'scale(1)'; }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Less</span>
            {[0, 1, 2, 3].map(n => (
              <div key={n} style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: getHeatColor(n) }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {activeTab === 'history' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Session History ({logs.length})</h3>
            {logs.length > 8 && (
              <button
                style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setShowAllHistory(v => !v)}
              >
                {showAllHistory ? <><ChevronUp size={14} /> Less</> : <><ChevronDown size={14} /> All</>}
              </button>
            )}
          </div>
          {logs.length === 0 ? (
            <div className="empty-state">No sessions logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {displayedHistory.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)', borderLeft: `3px solid ${TYPE_COLORS[log.type] || 'var(--border-color)'}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: TYPE_COLORS[log.type] || 'var(--text-main)' }}>{log.type}</span>
                      {log.name && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.85rem' }}>– {log.name}</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>{log.date}{log.timeOfDay ? ` @ ${log.timeOfDay}` : ''}</span>
                      {log.duration && <span>· {log.duration}</span>}
                      <span>· ⚡{log.energy || '-'} 💨{log.cardio || '-'} 🔥{log.intensity || '-'} 🎯{log.focus || '-'}</span>
                    </div>
                  </div>
                  <button className="btn-icon danger" onClick={() => handleDeleteLog(log.id)} style={{ padding: '6px', flexShrink: 0 }} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
