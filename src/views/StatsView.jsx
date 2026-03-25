import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import { Trash2, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { getWeekId } from '../utils';
import { useDialog } from '../components/DialogContext';
import { BodyDummy, getWeightedIntensity, getSorenessColor } from '../components/BodyDummy';
import './stats.css';

function parseMins(log) {
  if (!log.duration) return 0;
  if (typeof log.duration === 'number') return log.duration;
  return parseInt(log.duration.replace(/[^0-9]/g, '')) || 0;
}

const TYPE_COLORS = { Boxing: '#ef4444', Running: '#3b82f6', Strength: '#f59e0b', Recovery: '#10b981' };

function parsePaceToMins(paceStr) {
  if (!paceStr || typeof paceStr !== 'string') return null;
  const parts = paceStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
  }
  return parseFloat(paceStr) || null;
}

function parseDistance(distStr) {
  if (!distStr) return null;
  return parseFloat(String(distStr).replace(',', '.')) || null;
}

function formatPace(mins) {
  if (!mins) return '-';
  const m = Math.floor(mins);
  const s = Math.round((mins - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StatsView({ logs, setLogs }) {
  const { showAlert, showConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [bodyMapRange, setBodyMapRange] = useState(30);

  // ─── KPI Computations ────────────────────────────────────────────────────────
  const typeCounts = useMemo(() => logs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {}), [logs]);

  const totalSessions = logs.length;

  const totalMinutes = useMemo(() => logs.reduce((acc, l) => acc + parseMins(l), 0), [logs]);

  const totalHours = (totalMinutes / 60).toFixed(1);

  // ─── Performance Trend (per-session) ─────────────────────────────────────────
  const trendData = useMemo(() => [...logs].reverse().filter(l => l.energy > 0).map(log => ({
    date: log.date.substring(5),
    energy: log.energy,
    cardio: log.cardio,
    legs: log.legs,
    intensity: log.intensity || 0,
    focus: log.focus || 0,
  })), [logs]);

  // ─── Body & Recovery Trend ───────────────────────────────────────────────────
  const bodyData = useMemo(() => [...logs]
    .reverse()
    .filter(l => l.bodyWeight || l.sleepHours || l.sleepQuality)
    .map(log => ({
      date: log.date.substring(5),
      weight: log.bodyWeight || null,
      sleep: log.sleepHours || null,
      quality: log.sleepQuality || null,
    })), [logs]);

  // ─── Weekly Load Bar Chart ───────────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    const weeklyMap = {};
    logs.forEach(log => {
      const wId = log.weekId || (log.date ? getWeekId(new Date(log.date)) : null);
      if (!wId) return;
      if (!weeklyMap[wId]) weeklyMap[wId] = { wId, mins: 0, sessions: 0 };
      weeklyMap[wId].mins += parseMins(log);
      weeklyMap[wId].sessions += 1;
    });
    return Object.values(weeklyMap)
      .sort((a, b) => a.wId.localeCompare(b.wId))
      .slice(-12)
      .map(w => ({ week: w.wId.split('-W')[1], hours: +(w.mins / 60).toFixed(1), sessions: w.sessions }));
  }, [logs]);

  // ─── Per-type Boxscore ───────────────────────────────────────────────────────
  const boxscoreData = useMemo(() => {
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
    return Object.entries(typeStats).map(([type, s]) => ({
      type,
      Energy: +(s.energy / s.count).toFixed(1),
      Cardio: +(s.cardio / s.count).toFixed(1),
      Intensity: +(s.intensity / s.count).toFixed(1),
      Focus: +(s.focus / s.count).toFixed(1),
      sessions: s.count,
    }));
  }, [logs]);

  // ─── Personal Records ────────────────────────────────────────────────────────
  const validLogs = logs.filter(l => l.energy > 0);
  const pr = {
    bestEnergy: validLogs.reduce((best, l) => l.energy > (best?.energy || 0) ? l : best, null),
    bestCardio: validLogs.reduce((best, l) => l.cardio > (best?.cardio || 0) ? l : best, null),
    bestFocus: validLogs.reduce((best, l) => (l.focus || 0) > ((best?.focus) || 0) ? l : best, null),
    mostRounds: logs.filter(l => l.sparringRounds > 0).reduce((best, l) => l.sparringRounds > (best?.sparringRounds || 0) ? l : best, null),
  };

  // ─── Heatmap ─────────────────────────────────────────────────────────────────
  const heatmapDays = useMemo(() => {
    const today = new Date();
    const arr = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const logsOnDay = logs.filter(l => l.date === key);
      arr.push({
        date: key,
        count: logsOnDay.length,
        types: [...new Set(logsOnDay.map(l => l.type))],
      });
    }
    return arr;
  }, [logs]);

  // ─── Running Analytics ───────────────────────────────────────────────────────
  const runningData = useMemo(() => {
    const runningLogsList = logs
      .filter(l => l.type === 'Running' && (l.distance || l.pace))
      .sort((a, b) => a.date.localeCompare(b.date));

    return runningLogsList.map(log => ({
      date: log.date.substring(5),
      distance: parseDistance(log.distance),
      pace: parsePaceToMins(log.pace),
      displayPace: log.pace
    }));
  }, [logs]);

  // --- Ranked Zones (Body Map) ---
  const ranked = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (bodyMapRange === 0 ? 99999 : bodyMapRange));
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const rangeLogs = logs.filter(l => l.bodyMap && (bodyMapRange === 0 || l.date >= cutoffStr));
    const totalSess = rangeLogs.length;

    const zoneAgg = {};
    rangeLogs.forEach(log => {
      const maxR = log.plannedDuration || 0;
      Object.entries(log.bodyMap).forEach(([zoneId, entry]) => {
        if (zoneId.startsWith('custom_')) return;
        const wi = getWeightedIntensity(entry.intensity, entry.roundLogged, maxR);
        if (!zoneAgg[zoneId]) zoneAgg[zoneId] = { sum: 0, count: 0, sessions: new Set() };
        zoneAgg[zoneId].sum += wi;
        zoneAgg[zoneId].count += 1;
        zoneAgg[zoneId].sessions.add(log.id);
      });
    });

    return Object.entries(zoneAgg)
      .map(([zoneId, agg]) => ({
        zoneId,
        avgWI: agg.sum / agg.count,
        sessions: agg.sessions.size,
        freqMult: agg.sessions.size / (totalSess || 1),
      }))
      .sort((a, b) => (b.avgWI * b.freqMult) - (a.avgWI * a.freqMult))
      .slice(0, 5);
  }, [logs, bodyMapRange]);

  // --- Cumulative Body Map ---
  const cumulativeBodyMap = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (bodyMapRange === 0 ? 99999 : bodyMapRange));
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const rangeLogs = logs.filter(l => l.bodyMap && (bodyMapRange === 0 || l.date >= cutoffStr));
    const totalSess = rangeLogs.length;

    const zoneAgg = {};
    rangeLogs.forEach(log => {
      const maxR = log.plannedDuration || 0;
      Object.entries(log.bodyMap).forEach(([zoneId, entry]) => {
        if (zoneId.startsWith('custom_')) return;
        const wi = getWeightedIntensity(entry.intensity, entry.roundLogged, maxR);
        if (!zoneAgg[zoneId]) zoneAgg[zoneId] = { sum: 0, count: 0, sessions: new Set() };
        zoneAgg[zoneId].sum += wi;
        zoneAgg[zoneId].count += 1;
        zoneAgg[zoneId].sessions.add(log.id);
      });
    });

    const map = {};
    Object.entries(zoneAgg).forEach(([zoneId, agg]) => {
      const avgWI = agg.sum / agg.count;
      const freqMult = agg.sessions.size / (totalSess || 1);
      const display = Math.min(5, avgWI * freqMult * 2);
      map[zoneId] = { intensity: display, roundLogged: 0 };
    });
    return map;
  }, [logs, bodyMapRange]);

  // --- Streak Warnings ---
  const streakWarnings = useMemo(() => {
    const sortedLogs = [...logs].filter(l => l.bodyMap).sort((a, b) => a.date.localeCompare(b.date));
    const warnings = [];
    const allZoneIds = [...new Set(sortedLogs.flatMap(l => Object.keys(l.bodyMap).filter(k => !k.startsWith('custom_'))))];
    allZoneIds.forEach(zoneId => {
      let streak = 0;
      let maxStreak = 0;
      sortedLogs.forEach(log => {
        if (log.bodyMap[zoneId]) { streak++; maxStreak = Math.max(maxStreak, streak); }
        else streak = 0;
      });
      if (maxStreak >= 3) warnings.push({ zoneId, streak: maxStreak });
    });
    return warnings;
  }, [logs]);

  const totalRunningDist = runningData.reduce((acc, d) => acc + (d.distance || 0), 0).toFixed(1);
  const runsWithPace = runningData.filter(d => d.pace);
  const avgRunningPaceRaw = runsWithPace.length > 0 ? runsWithPace.reduce((acc, d) => acc + d.pace, 0) / runsWithPace.length : 0;
  const avgRunningPace = formatPace(avgRunningPaceRaw);

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
        <TabBtn id="running" label="Running 🏃" />
        <TabBtn id="boxscore" label="By Type" />
        <TabBtn id="records" label="Records 🏆" />
        <TabBtn id="heatmap" label="Heatmap" />
        <TabBtn id="bodymap" label="Body Map 🗺" />
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

          {/* Body and Recovery Charts */}
          <div className="chart-container card" style={{ marginTop: '1rem' }}>
            <h3 className="section-title">Body Weight Trend</h3>
            {bodyData.filter(d => d.weight).length < 2 ? (
              <div className="empty-state">Log your body weight in at least 2 sessions.</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyData.filter(d => d.weight)} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="Weight (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="chart-container card" style={{ marginTop: '1rem' }}>
            <h3 className="section-title">Sleep (Hours & Quality)</h3>
            {bodyData.filter(d => d.sleep || d.quality).length < 2 ? (
              <div className="empty-state">Log your sleep in at least 2 sessions.</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyData.filter(d => d.sleep || d.quality)} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis yAxisId="left" domain={[0, 12]} stroke="var(--text-muted)" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 10]} stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Hours" />
                    <Line yAxisId="right" type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Quality (1-10)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Running Analytics ── */}
      {activeTab === 'running' && (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card running">
              <div className="stat-value">{totalRunningDist}km</div>
              <div className="stat-label">Total Distance</div>
            </div>
            <div className="stat-card running" style={{ borderBottom: '4px solid #3b82f6' }}>
              <div className="stat-value">{avgRunningPace}</div>
              <div className="stat-label">Avg Pace (min/km)</div>
            </div>
            <div className="stat-card running">
              <div className="stat-value">{runningLogs.length}</div>
              <div className="stat-label">Runs</div>
            </div>
          </div>

          <div className="chart-container card">
            <h3 className="section-title">Distance Trend (km)</h3>
            {runningData.filter(d => d.distance).length < 2 ? (
              <div className="empty-state">Log at least 2 runs with distance data.</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runningData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    <Bar dataKey="distance" name="Distance (km)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="chart-container card" style={{ marginTop: '1rem' }}>
            <h3 className="section-title">Pace Trend (min/km)</h3>
            {runningData.filter(d => d.pace).length < 2 ? (
              <div className="empty-state">Log at least 2 runs with pace data (M:SS).</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={runningData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis reversed domain={['auto', 'auto']} stroke="var(--text-muted)" fontSize={11} tickFormatter={formatPace} />
                    <Tooltip 
                      formatter={(v) => formatPace(v)}
                      contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
                    />
                    <Legend />
                    <Line type="monotone" dataKey="pace" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Pace" />
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

      {/* ── Body Map ── */}
      {activeTab === 'bodymap' && (() => {
        // Pre-calculating totalSess for the UI logic
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (bodyMapRange === 0 ? 99999 : bodyMapRange));
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const rangeLogs = logs.filter(l => l.bodyMap && (bodyMapRange === 0 || l.date >= cutoffStr));
        const totalSess = rangeLogs.length;

        // Zone label helper
        const ZONE_LABELS = {
          head: 'Head', shoulders: 'Shoulders', chest: 'Chest', arms: 'Arms',
          hands: 'Hands', core: 'Core', hips: 'Hips', quads: 'Quads',
          neck_back: 'Neck/Trap', lower_back: 'Lower Back', glutes: 'Glutes', calves: 'Calves',
        };

        const intensityEmoji = (wi) => {
          if (wi >= 4) return '🔴';
          if (wi >= 3) return '🟠';
          if (wi >= 2) return '🟡';
          return '🟢';
        };

        return (
          <>
            {/* Range selector */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[{ label: 'Last 7 days', val: 7 }, { label: 'Last 30 days', val: 30 }, { label: 'All time', val: 0 }].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setBodyMapRange(opt.val)}
                  style={{
                    padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '6px',
                    background: bodyMapRange === opt.val ? 'var(--primary)' : 'var(--surface-hover)',
                    color: bodyMapRange === opt.val ? '#fff' : 'var(--text-muted)',
                    border: bodyMapRange === opt.val ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                  }}
                >{opt.label}</button>
              ))}
            </div>

            {/* Streak warnings */}
            {streakWarnings.map(({ zoneId, streak }) => (
              <div key={zoneId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.4)', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                ⚠️ <strong>{ZONE_LABELS[zoneId] || zoneId}</strong> has been sore for {streak} sessions in a row — consider a recovery day.
              </div>
            ))}

            {totalSess === 0 ? (
              <div className="card"><div className="empty-state">No body map data in this range. Start logging soreness zones!</div></div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Cumulative Soreness ({totalSess} sessions)</h3>
                  <BodyDummy bodyMap={cumulativeBodyMap} maxRounds={0} readonly showLegend />
                </div>

                {ranked.length > 0 && (
                  <div className="card">
                    <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Most Stressed Zones</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {ranked.map(({ zoneId, avgWI, sessions: sess }) => (
                        <div key={zoneId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ width: '1.2rem', textAlign: 'center' }}>{intensityEmoji(avgWI)}</span>
                          <span style={{ width: '7rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{ZONE_LABELS[zoneId] || zoneId}</span>
                          <div style={{ flex: 1, height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (avgWI / 5) * 100)}%`, height: '100%', background: getSorenessColor(avgWI), borderRadius: '4px', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '6rem', textAlign: 'right' }}>{avgWI.toFixed(1)} avg · {sess} session{sess !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        );
      })()}

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
                      {log.bodyWeight && <span>· ⚖️{log.bodyWeight}kg</span>}
                      {log.sleepHours && <span>· 🛏️{log.sleepHours}h</span>}
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
