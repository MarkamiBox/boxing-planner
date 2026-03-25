import React, { useState, useRef } from 'react';
import { Copy, Save, Check, Download, Upload, Plus, Trash2, Target, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { get, set, keys as idbKeys } from 'idb-keyval';
import './profile.css';
import { useAppState } from '../hooks/useAppState';
import { useDialog } from '../components/DialogContext';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';

export function ProfileView({ profile, setProfile, logs, setLogs, goals, setGoals, availability, setAvailability, availabilityTemplate, setAvailabilityTemplate }) {
  // Hook usage moved down to line 16 for additional features

  const [localProfile, setLocalProfile] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedLocs, setExpandedLocs] = useState({});

  const toggleLoc = (idx) => setExpandedLocs(p => ({ ...p, [idx]: !p[idx] }));

  const { schedule, setSchedule } = useAppState();
  const { showAlert, showConfirm, showChoice, showPrompt } = useDialog();

  const handleChange = (field, value) => {
    setLocalProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleLevelChange = (field, value) => {
    setLocalProfile(prev => ({
      ...prev,
      levels: { ...prev.levels, [field]: value }
    }));
  };

  const addLocation = () => {
    setLocalProfile(prev => ({
      ...prev,
      locations: [...(prev.locations || []), {
        name: '',
        equipment: '',
        travelMinutes: 0,
        showerAvailable: false,
        lockerAvailable: false
      }]
    }));
  };

  const removeLocation = (idx) => {
    setLocalProfile(prev => ({
      ...prev,
      locations: (prev.locations || []).filter((_, i) => i !== idx)
    }));
  };

  const handleLocationChange = (idx, field, value) => {
    setLocalProfile(prev => {
      const newLocs = [...(prev.locations || [])];
      newLocs[idx][field] = value;
      return { ...prev, locations: newLocs };
    });
  };

  const handleExportAvailability = () => {
    const data = JSON.stringify(availability, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boxing_availability_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const normalizeAvailability = (data) => {
    if (!data || typeof data !== 'object') return {};
    const normalized = {};
    Object.keys(data).forEach(day => {
      if (!Array.isArray(data[day])) {
          normalized[day] = [];
          return;
      }
      normalized[day] = data[day].map(slot => {
          if (slot.reason) return slot; // already correct format
          return {
            id: slot.id || Math.random().toString(36).substr(2, 9),
            start: slot.start || '09:00',
            end: slot.end || '10:00',
            reason: 'other',
            customReason: slot.title || 'Other',
            importance: slot.isHard ? 'hard' : 'soft',
            energyAfter: 'neutral',
            isRecurring: false
          };
      });
    });
    return normalized;
  };

  const handleImportAvailability = () => {
    showChoice("Import Availability", "How would you like to import your weekly availability?", [
      {
        label: "Upload JSON File",
        onClick: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const data = JSON.parse(ev.target.result);
                setAvailability(normalizeAvailability(data));
                showAlert("Success", "Availability imported successfully!");
              } catch (err) {
                showAlert("Error", "Invalid JSON file.");
              }
            };
            reader.readAsText(file);
          };
          input.click();
        }
      },
      {
        label: "Paste JSON Text",
        onClick: () => {
          const initial = availability ? JSON.stringify(availability, null, 2) : '';
          showPrompt("Paste Availability", "Paste your availability JSON object here:", initial, (text) => {
            if (!text) return;
            try {
              const data = JSON.parse(text);
              setAvailability(normalizeAvailability(data));
              showAlert("Success", "Availability updated!");
            } catch (err) {
              showAlert("Error", "Invalid JSON text.");
            }
          });
        }
      }
    ]);
  };

  const handleAttachLocationSchedule = (idx) => {
    const processScheduleData = (data) => {
      if (!Array.isArray(data)) return data;
      return data.map(item => ({
        ...item,
        courseId: item.courseId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9))
      }));
    };

    showChoice("Update Courses", "How would you like to provide the courses schedule for this location?", [
      {
        label: "Upload JSON File",
        onClick: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                let scheduleData = JSON.parse(event.target.result);
                scheduleData = processScheduleData(scheduleData);
                handleLocationChange(idx, 'schedule', scheduleData);
                showAlert("Success", "Courses schedule uploaded for location! Don't forget to push Save Profile Changes.");
              } catch (err) {
                showAlert("Error", "Invalid JSON format.");
              }
            };
            reader.readAsText(file);
          };
          input.click();
        }
      },
      {
        label: "Paste JSON Text",
        onClick: () => {
          const currentData = localProfile.locations[idx].schedule;
          const initial = currentData ? JSON.stringify(currentData, null, 2) : '';
          showPrompt("Paste Schedule", "Paste your courses JSON array here:", initial, (text) => {
            if (!text) return;
            try {
              let scheduleData = JSON.parse(text);
              scheduleData = processScheduleData(scheduleData);
              handleLocationChange(idx, 'schedule', scheduleData);
              showAlert("Success", "Courses schedule updated! Don't forget to push Save Profile Changes.");
            } catch (err) {
              showAlert("Error", "Invalid JSON format. Please ensure it is a valid JSON array.");
            }
          });
        }
      },
      { label: "Cancel", className: "btn-secondary" }
    ]);
  };

  const handleSave = () => {
    setProfile(localProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportWithChoice = (title, dataObj, filenameBase) => {
    showChoice(title, "How would you like to export?", [
      {
        label: "Download JSON File",
        onClick: () => {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
          const a = document.createElement('a');
          a.href = dataStr;
          a.download = `${filenameBase}_${new Date().toISOString().split('T')[0]}.json`;
          a.click();
        }
      },
      {
        label: "Copy to Clipboard",
        onClick: () => {
          const text = JSON.stringify(dataObj, null, 2);
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
              .then(() => showAlert("Success", `${title} copied to clipboard!`))
              .catch(() => showAlert("Error", "Copia fallita, il tuo browser non lo supporta. Usa la funzione di Download JSON"));
          } else {
            showAlert("Error", "Copia fallita, il tuo browser non lo supporta. Usa la funzione di Download JSON");
          }
        }
      },
      { label: "Cancel", className: "btn-secondary" }
    ]);
  };

  const handleExportJSON = () => handleExportWithChoice("Schedule", schedule, "boxing_schedule");
  const handleExportLogs = () => handleExportWithChoice("Logs", logs, "boxing_logs");

  const handleImportWithChoice = (title, onFile, onText) => {
    showChoice(title, "How would you like to import?", [
      {
        label: "Upload JSON File",
        onClick: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => onFile(event.target.result);
            reader.readAsText(file);
          };
          input.click();
        }
      },
      {
        label: "Paste JSON Text",
        onClick: () => {
          showPrompt(title, "Paste your JSON data here:", "", (text) => {
            if (text) onText(text);
          });
        }
      },
      { label: "Cancel", className: "btn-secondary" }
    ]);
  };

  const handleImportLogs = (text) => {
    try {
      const importedLogs = JSON.parse(text);
      if (Array.isArray(importedLogs)) {
        setLogs(importedLogs);
        showAlert("Success", "Logs imported successfully!");
      } else {
        showAlert("Error", "Invalid JSON structure for logs.");
      }
    } catch (err) {
      showAlert("Error", "Error parsing JSON.");
    }
  };

  const handleImportJSON = (text) => {
    try {
      const importedSchedule = JSON.parse(text);
      if (importedSchedule.monday && importedSchedule.sunday) {
        setSchedule(importedSchedule);
        showAlert("Success", "Schedule imported into the current week successfully!");
      } else {
        showAlert("Error", "Invalid JSON structure for schedule.");
      }
    } catch (err) {
      showAlert("Error", "Error parsing JSON.");
    }
  };

  const handleExportAccount = async () => {
    const data = {};
    const allKeys = await idbKeys();
    for (const key of allKeys) {
      if (key && key.startsWith('bxng_')) {
        try {
          data[key] = await get(key);
        } catch (e) { }
      }
    }
    handleExportWithChoice("Full Account", data, "boxing_planner_backup");
  };

  const handleImportAccount = (text) => {
    try {
      const data = JSON.parse(text);
      if (!data.bxng_profile) throw new Error("Invalid format");
      showConfirm("Restore Account", "This will overwrite your ENTIRE account data (logs, schedule, profile). Are you sure?", async () => {
        const promises = [];
        Object.keys(data).forEach(key => {
          if (key.startsWith('bxng_')) {
            promises.push(set(key, data[key]));
          }
        });
        await Promise.all(promises);
        window.location.reload();
      });
    } catch (e) {
      showAlert("Error", "Invalid account backup JSON.");
    }
  };

  const handleExport = () => {
    const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayISO = new Date().toISOString().split('T')[0];
    const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const recentFull = logs.filter(l => l.energy > 0).slice(0, 15);
    const lastBoxing = logs.find(l => l.type === 'Boxing');
    const lastRunning = logs.find(l => l.type === 'Running');
    const withWeight = logs.filter(l => l.bodyWeight);
    const withSleep = logs.filter(l => l.sleepHours);

    // Compute trends
    const avgEnergy = recentFull.length > 0
      ? (recentFull.reduce((a, l) => a + l.energy, 0) / recentFull.length).toFixed(1)
      : '-';
    const avgCardio = recentFull.length > 0
      ? (recentFull.reduce((a, l) => a + (l.cardio || 0), 0) / recentFull.length).toFixed(1)
      : '-';
    const avgFocus = recentFull.filter(l => l.focus > 0).length > 0
      ? (recentFull.filter(l => l.focus > 0).reduce((a, l) => a + l.focus, 0) / recentFull.filter(l => l.focus > 0).length).toFixed(1)
      : '-';
    const avgSleep = withSleep.length > 0
      ? (withSleep.slice(0, 7).reduce((a, l) => a + l.sleepHours, 0) / Math.min(withSleep.length, 7)).toFixed(1)
      : null;
    const lastWeight = withWeight.length > 0 ? withWeight[0].bodyWeight : null;
    const lastSoreness = recentFull.length > 0 && recentFull[0].musclesSoreness
      ? recentFull[0].musclesSoreness
      : null;

    // Days since last session
    const lastSessionDate = recentFull.length > 0 ? recentFull[0].date : null;
    const daysSinceLast = lastSessionDate
      ? Math.round((new Date(todayISO) - new Date(lastSessionDate)) / 86400000)
      : null;

    // Skipped steps in recent sessions
    const totalSkipped = recentFull.reduce((a, l) => a + (l.skippedSteps || 0), 0);

    let text = `Boxing Planner — athlete data export (${today})\n\n`;

    // ── ATHLETE PROFILE ──────────────────────────────────────────────────────────
    text += `═══════════════════════════════════════\n`;
    text += `🥊 ATHLETE PROFILE\n`;
    text += `═══════════════════════════════════════\n`;
    text += `Today's date: ${today}\n`;
    text += `Age range: ${localProfile.age}\n`;
    text += `Body weight: ${lastWeight ? lastWeight + 'kg' : localProfile.weight + 'kg (from profile)'}\n`;
    text += `Height: ${localProfile.height || '-'}cm\n`;
    text += `Stance: ${localProfile.stance || 'Orthodox'}\n`;
    text += `Boxing experience: ${localProfile.experience}\n`;
    text += `Style: ${localProfile.style}\n`;
    text += `Primary weapon: ${localProfile.primaryPunch}\n`;
    text += `Resting HR: ${localProfile.restingHR}bpm\n`;
    text += `Est. VO2max: ${localProfile.vo2max}\n\n`;

    // ── TECHNICAL LEVELS ─────────────────────────────────────────────────────────
    text += `📊 TECHNICAL LEVELS (1=beginner, 5=advanced)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    const lvl = localProfile.levels;
    text += `Cardio/Conditioning:  ${'█'.repeat(lvl.cardio)}${'░'.repeat(5 - lvl.cardio)} ${lvl.cardio}/5\n`;
    text += `Technique/Craft:      ${'█'.repeat(lvl.technique)}${'░'.repeat(5 - lvl.technique)} ${lvl.technique}/5\n`;
    text += `Footwork/Movement:    ${'█'.repeat(lvl.footwork)}${'░'.repeat(5 - lvl.footwork)} ${lvl.footwork}/5\n`;
    text += `Defense/Head movement:${'█'.repeat(lvl.defense)}${'░'.repeat(5 - lvl.defense)} ${lvl.defense}/5\n`;
    text += `Jab/Combo speed:      ${'█'.repeat(lvl.jab)}${'░'.repeat(5 - lvl.jab)} ${lvl.jab}/5\n`;
    text += `Ring IQ/Reading:      ${'█'.repeat(lvl.reading)}${'░'.repeat(5 - lvl.reading)} ${lvl.reading}/5\n\n`;

    // ── CURRENT STATE ─────────────────────────────────────────────────────────────
    text += `⚡ CURRENT STATE\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    if (daysSinceLast !== null) text += `Days since last session: ${daysSinceLast}\n`;
    if (lastSoreness !== null) text += `Muscle soreness last logged: ${lastSoreness}/10 ${lastSoreness >= 7 ? '⚠️ HIGH' : lastSoreness >= 4 ? '⚡ MODERATE' : '✅ LOW'}\n`;
    if (avgSleep) text += `Avg sleep (last 7 sessions): ${avgSleep}h/night ${Number(avgSleep) < 6.5 ? '⚠️ LOW — recovery may be compromised' : '✅'}\n`;
    if (lastWeight) text += `Last weighed: ${lastWeight}kg (${withWeight[0].date})\n`;
    text += `\nRecent avg performance (last ${recentFull.length} rated sessions):\n`;
    text += `  Energy:    ${avgEnergy}/10\n`;
    text += `  Cardio:    ${avgCardio}/10\n`;
    text += `  Focus:     ${avgFocus}/10\n`;
    if (totalSkipped > 0) text += `  Guided steps skipped in recent sessions: ${totalSkipped} (indicates fatigue or time constraints)\n`;
    text += '\n';

    // ── BOXING DETAILS ────────────────────────────────────────────────────────────
    if (lastBoxing) {
      text += `🥊 LAST BOXING SESSION (${lastBoxing.date})\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Name: ${lastBoxing.name || 'General Boxing'}\n`;
      text += `Duration: ${lastBoxing.duration || '-'}\n`;
      text += `Sparring rounds: ${lastBoxing.sparringRounds || 0}\n`;
      if (lastBoxing.sparringRounds > 0) text += `End-of-session performance drop: ${lastBoxing.lastRoundDrop}/10 ${lastBoxing.lastRoundDrop < 5 ? '(significant gas tank issue)' : ''}\n`;
      text += `Energy: ${lastBoxing.energy}/10 | Cardio: ${lastBoxing.cardio}/10 | Focus: ${lastBoxing.focus || '-'}/10 | Intensity: ${lastBoxing.intensity || '-'}/10\n`;
      if (lastBoxing.notes) text += `Notes: "${lastBoxing.notes}"\n`;
      text += '\n';
    }

    if (lastRunning) {
      text += `🏃 LAST RUNNING SESSION (${lastRunning.date})\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Distance: ${lastRunning.distance || '-'} | Time: ${lastRunning.time || '-'} | Pace: ${lastRunning.pace || '-'}\n`;
      text += `Cardio feel: ${lastRunning.cardio}/10 | Legs: ${lastRunning.legs}/10\n\n`;
    }

    // ── SESSION HISTORY ───────────────────────────────────────────────────────────
    if (recentFull.length > 0) {
      text += `📅 LAST ${recentFull.length} SESSIONS (newest first)\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      recentFull.forEach(log => {
        const day = new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' });
        text += `${log.date} (${day}) [${log.type}]`;
        if (log.name) text += ` "${log.name}"`;
        text += ` | Dur: ${log.duration || '-'} | E:${log.energy} C:${log.cardio || '-'} I:${log.intensity || '-'} F:${log.focus || '-'} L:${log.legs || '-'}`;
        if (log.skippedSteps > 0) text += ` | ⏭ skipped ${log.skippedSteps}`;
        if (log.notes) text += ` | "${log.notes}"`;
        text += '\n';
      });
      text += '\n';
    }


    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => showAlert("Error", "Copia fallita, il tuo browser non lo supporta. Usa la funzione di Download JSON"));
    } else {
      showAlert("Error", "Copia fallita, il tuo browser non lo supporta. Usa la funzione di Download JSON");
    }
  };

  const renderLevelSlider = (label, fieldKey) => (
    <div className="level-slider">
      <div className="level-header">
        <span>{label}</span>
        <span className="level-val">{localProfile.levels[fieldKey]}/5</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={localProfile.levels[fieldKey]}
        onChange={e => handleLevelChange(fieldKey, Number(e.target.value))}
      />
    </div>
  );

  return (
    <div className="page-container profile-view">
      <div className="profile-header">
        <h1 className="page-title">Athlete Profile</h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <button className="btn-secondary export-btn" onClick={handleExport}>
            {copied ? <><Check size={18} /> Copied!</> : <>Coach Export</>}
          </button>
        </div>
      </div>

      <div className="card profile-grid">
        <h3 className="section-title" style={{ gridColumn: '1 / -1' }}>Physical Stats</h3>

        <div className="form-group">
          <label>Age Bracket</label>
          <input type="text" value={localProfile.age} onChange={e => handleChange('age', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Weight (kg)</label>
          <input type="number" value={localProfile.weight} onChange={e => handleChange('weight', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Height (cm)</label>
          <input type="number" value={localProfile.height || ''} onChange={e => handleChange('height', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Resting HR (bpm)</label>
          <input type="number" value={localProfile.restingHR} onChange={e => handleChange('restingHR', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Est. VO2max</label>
          <input type="number" value={localProfile.vo2max} onChange={e => handleChange('vo2max', e.target.value)} />
        </div>

        <h3 className="section-title" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>Boxing Style</h3>

        <div className="form-group">
          <label>Experience</label>
          <input type="text" value={localProfile.experience} onChange={e => handleChange('experience', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Combat Style</label>
          <input type="text" value={localProfile.style} onChange={e => handleChange('style', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Stance</label>
          <select value={localProfile.stance || 'Orthodox'} onChange={e => handleChange('stance', e.target.value)}>
            <option value="Orthodox">Orthodox</option>
            <option value="Southpaw">Southpaw</option>
            <option value="Switch">Switch</option>
          </select>
        </div>
        <div className="form-group">
          <label>Prep Time Between Exercises (sec)</label>
          <input type="number" value={localProfile.prepTime !== undefined ? localProfile.prepTime : 10} onChange={e => handleChange('prepTime', Number(e.target.value))} />
        </div>

        <h3 className="section-title" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>Technical Levels (1-5)</h3>

        <div className="levels-grid" style={{ gridColumn: '1 / -1' }}>
          {renderLevelSlider("Cardio / Stamina", "cardio")}
          {renderLevelSlider("Technique", "technique")}
          {renderLevelSlider("Footwork", "footwork")}
          {renderLevelSlider("Defense / Guard", "defense")}
          {renderLevelSlider("Jab Mastery", "jab")}
          {renderLevelSlider("Opponent Reading", "reading")}
        </div>

        <h3 className="section-title" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>Locations & Equipment</h3>
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(localProfile.locations || []).map((loc, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="text" value={loc.name} onChange={e => handleLocationChange(idx, 'name', e.target.value)} placeholder="Location (e.g. Home)" style={{ flex: 1 }} />
                <input type="text" value={loc.equipment} onChange={e => handleLocationChange(idx, 'equipment', e.target.value)} placeholder="Equipment (e.g. Heavy Bag, Dumbbells)" style={{ flex: 2 }} />
                <button className="btn-icon danger" onClick={() => removeLocation(idx)} style={{ padding: '6px' }}><Trash2 size={16} /></button>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <label>Travel (min)</label>
                  <input type="number" value={loc.travelMinutes || 0} onChange={e => handleLocationChange(idx, 'travelMinutes', Number(e.target.value))} style={{ width: '50px', padding: '2px 4px' }} />
                </div>
                <label className="switch">
                  <input type="checkbox" checked={!!loc.showerAvailable} onChange={e => handleLocationChange(idx, 'showerAvailable', e.target.checked)} />
                  <span className="slider-toggle"></span>
                </label>
                <span style={{ marginLeft: '-0.5rem' }}>Shower</span>
                <label className="switch">
                  <input type="checkbox" checked={!!loc.lockerAvailable} onChange={e => handleLocationChange(idx, 'lockerAvailable', e.target.checked)} />
                  <span className="slider-toggle"></span>
                </label>
                <span style={{ marginLeft: '-0.5rem' }}>Locker</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {loc.schedule ? `✅ ${Array.isArray(loc.schedule) ? loc.schedule.length : Object.keys(loc.schedule).length} courses loaded` : `No courses schedule loaded`}
                </span>
                <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleAttachLocationSchedule(idx)}>
                  <Upload size={14} style={{ marginRight: '4px' }} /> {loc.schedule ? 'Manage Courses' : 'Set Courses'}
                </button>
              </div>
              {loc.schedule && (
                <div style={{ marginTop: '0.5rem', background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                  <button onClick={() => toggleLoc(idx)} style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Review Courses List</span>
                    {expandedLocs[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {expandedLocs[idx] && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Array.isArray(loc.schedule) ? loc.schedule.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '4px' }}>
                          <span>{c.day} @ {c.time}</span>
                          <strong style={{ textAlign: 'right' }}>{c.course}</strong>
                        </div>
                      )) : <pre style={{ maxHeight: '100px', overflow: 'auto' }}>{JSON.stringify(loc.schedule, null, 2)}</pre>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <button className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} onClick={addLocation}>
            <Plus size={14} /> Add Location
          </button>
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
          <button className="btn-primary w-full" onClick={handleSave}>
            {saved ? 'Saved!' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      <div className="card profile-grid" style={{ marginTop: '2rem' }}>
        <h3 className="section-title" style={{ gridColumn: '1 / -1' }}>Training Preferences</h3>

        <div className="form-group">
          <label>Chronotype (Energy Peak)</label>
          <select value={localProfile.chronotype} onChange={e => handleChange('chronotype', e.target.value)}>
            <option value="morning_sharp">Morning sharp</option>
            <option value="mid_morning_ramp">Mid-morning ramp 1-2h</option>
            <option value="afternoon_evening">Afternoon-Evening peak after 15:00</option>
            <option value="inconsistent">Inconsistent</option>
          </select>
        </div>

        <div className="form-group">
          <label>Minutes to feel functional after waking (default 60)</label>
          <input type="number" value={localProfile.wakeupRampMinutes} onChange={e => handleChange('wakeupRampMinutes', Number(e.target.value))} />
        </div>

        <div className="form-group">
          <label>Job Load (Stress/Fatigue)</label>
          <select value={localProfile.jobLoad} onChange={e => handleChange('jobLoad', e.target.value)}>
            <option value="desk_low">Desk low stress</option>
            <option value="desk_high">Desk high cognitive stress</option>
            <option value="physical">Physical all day</option>
            <option value="variable">Variable</option>
          </select>
        </div>

        <div className="form-group">
          <label>Sleep Consistency</label>
          <select value={localProfile.sleepConsistency} onChange={e => handleChange('sleepConsistency', e.target.value)}>
            <option value="very_consistent">Very consistent</option>
            <option value="mostly">Mostly consistent</option>
            <option value="irregular">Irregular</option>
            <option value="chronic_short">Chronically short under 6h</option>
          </select>
        </div>

        <div className="form-group">
          <label>Minimum session worth doing (min)</label>
          <input type="number" value={localProfile.minSessionMinutes} onChange={e => handleChange('minSessionMinutes', Number(e.target.value))} />
        </div>

        <div className="form-group">
          <label>Consecutive Days Preference</label>
          <select value={localProfile.consecutiveDaysPreference} onChange={e => handleChange('consecutiveDaysPreference', e.target.value)}>
            <option value="alternate">Alternate work-rest days</option>
            <option value="consecutive">Consecutive days then rest block</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>

        <div className="form-group">
          <label>Weather Threshold</label>
          <select value={localProfile.weatherThreshold} onChange={e => handleChange('weatherThreshold', e.target.value)}>
            <option value="any">Train in any weather</option>
            <option value="light_ok">Light rain ok storm no</option>
            <option value="indoor">Indoor only</option>
          </select>
        </div>

        <div className="form-group">
          <label>Travel Training Style</label>
          <select value={localProfile.travelTrainingStyle || ''} onChange={e => handleChange('travelTrainingStyle', e.target.value || null)}>
            <option value="">Not set — ask me when I travel</option>
            <option value="shadow_hotel">Shadow and bodyweight in hotel</option>
            <option value="hotel_gym">Finds hotel gym</option>
            <option value="runs_anywhere">Runs anywhere</option>
            <option value="write_off">Writes off travel weeks</option>
          </select>
        </div>



        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', gridColumn: '1 / -1' }}>
          <label className="switch">
            <input type="checkbox" checked={!!localProfile.mealBufferEnabled} onChange={e => handleChange('mealBufferEnabled', e.target.checked)} id="mealBuffer" />
            <span className="slider-toggle"></span>
          </label>
          <label htmlFor="mealBuffer" style={{ marginBottom: 0, cursor: 'pointer' }}>Enable Meal Buffer (Auto-schedule around meals)</label>
        </div>
      </div>

      {/* Weekly Availability */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Weekly Availability</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={handleImportAvailability}>
              <Upload size={14} style={{ marginRight: '4px' }} /> Import
            </button>
            <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={handleExportAvailability}>
              <Download size={14} style={{ marginRight: '4px' }} /> Export
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Tap any time slot to mark it as busy. The AI uses this to avoid scheduling over your commitments.
        </p>
        <AvailabilityCalendar
          availability={availability || {}}
          setAvailability={setAvailability}
          availabilityTemplate={availabilityTemplate || {}}
          setAvailabilityTemplate={setAvailabilityTemplate}
          schedule={schedule}
          locations={localProfile.locations || []}
          profile={localProfile}
          onConflictDetected={({ day, exerciseName, conflictDetails }) => {
            // surfaced in UI via cell highlight; no modal needed here
            console.warn('[AvailabilityCalendar] Conflict:', day, exerciseName, conflictDetails);
          }}
        />
      </div>

      {/* Goals Section */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} /> Goals
          </h3>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
            onClick={() => setGoals([...goals, { id: Date.now().toString(), text: '', type: 'short', targetDate: '', status: 'active', createdAt: new Date().toISOString() }])}
          >
            <Plus size={14} /> Add Goal
          </button>
        </div>

        {goals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No goals set yet. Add your first training goal!</p>
        ) : (
          <>
            {/* Short-term goals */}
            {goals.filter(g => g.type === 'short').length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Short-term</h4>
                {goals.filter(g => g.type === 'short').map(goal => (
                  <div key={goal.id} className="goal-item" style={{ opacity: goal.status === 'completed' ? 0.6 : 1 }}>
                    <div className="goal-row-main">
                      <button className="goal-checkbox" style={{ color: goal.status === 'completed' ? '#10b981' : 'var(--text-muted)' }}
                        onClick={() => setGoals(goals.map(g => g.id === goal.id ? { ...g, status: g.status === 'completed' ? 'active' : 'completed' } : g))}
                      >
                        <CheckCircle size={20} />
                      </button>
                      <input type="text" value={goal.text} placeholder="e.g. Run 5km under 25min"
                        className="goal-input-text"
                        style={{ textDecoration: goal.status === 'completed' ? 'line-through' : 'none' }}
                        onChange={e => setGoals(goals.map(g => g.id === goal.id ? { ...g, text: e.target.value } : g))}
                      />
                    </div>
                    <div className="goal-row-meta">
                      <div className="goal-controls">
                        <input type="date" value={goal.targetDate || ''} className="goal-input-date"
                          onChange={e => setGoals(goals.map(g => g.id === goal.id ? { ...g, targetDate: e.target.value } : g))}
                        />
                        <select value={goal.type} className="goal-select-type"
                          onChange={e => setGoals(goals.map(g => g.id === goal.id ? { ...g, type: e.target.value } : g))}
                        >
                          <option value="short">Short</option>
                          <option value="long">Long</option>
                        </select>
                      </div>
                      <button className="btn-icon danger" style={{ padding: '6px' }}
                        onClick={() => setGoals(goals.filter(g => g.id !== goal.id))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Long-term goals */}
            {goals.filter(g => g.type === 'long').length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Long-term</h4>
                {goals.filter(g => g.type === 'long').map(goal => (
                  <div key={goal.id} className="goal-item" style={{ opacity: goal.status === 'completed' ? 0.6 : 1 }}>
                    <div className="goal-row-main">
                      <button className="goal-checkbox" style={{ color: goal.status === 'completed' ? '#10b981' : 'var(--text-muted)' }}
                        onClick={() => setGoals(goals.map(g => g.id === goal.id ? { ...g, status: g.status === 'completed' ? 'active' : 'completed' } : g))}
                      >
                        <CheckCircle size={20} />
                      </button>
                      <input type="text" value={goal.text} placeholder="e.g. First competitive fight"
                        className="goal-input-text"
                        style={{ textDecoration: goal.status === 'completed' ? 'line-through' : 'none' }}
                        onChange={e => setGoals(goals.map(g => g.id === goal.id ? { ...g, text: e.target.value } : g))}
                      />
                    </div>
                    <div className="goal-row-meta">
                      <div className="goal-controls">
                        <input type="date" value={goal.targetDate || ''} className="goal-input-date"
                          onChange={e => setGoals(goals.map(g => g.id === goal.id ? { ...g, targetDate: e.target.value } : g))}
                        />
                        <select value={goal.type} className="goal-select-type"
                          onChange={e => setGoals(goals.map(g => g.id === goal.id ? { ...g, type: e.target.value } : g))}
                        >
                          <option value="short">Short</option>
                          <option value="long">Long</option>
                        </select>
                      </div>
                      <button className="btn-icon danger" style={{ padding: '6px' }}
                        onClick={() => setGoals(goals.filter(g => g.id !== goal.id))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </>
        )}
      </div>

      <div className="card profile-grid" style={{ marginTop: '2rem' }}>
        <h3 className="section-title" style={{ gridColumn: '1 / -1' }}>Data Management</h3>
        <p style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Import or Export your weekly schedule and workout logs in JSON format to share it or move it across devices.
        </p>

        <div style={{ display: 'flex', gap: '1rem', gridColumn: '1 / -1' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={handleExportJSON}>
            <Download size={18} /> Export Schedule
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleImportWithChoice("Import Schedule", handleImportJSON, handleImportJSON)}>
            <Upload size={18} /> Import Schedule
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', gridColumn: '1 / -1', marginTop: '0.5rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={handleExportLogs}>
            <Download size={18} /> Export Logs
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleImportWithChoice("Import Logs", handleImportLogs, handleImportLogs)}>
            <Upload size={18} /> Import Logs
          </button>
        </div>

        <h3 className="section-title" style={{ gridColumn: '1 / -1', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>Account Backup</h3>
        <p style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Export your entire account into a unified file (Settings, Logs, Schedule, Coach Data). Use this to migrate to another device.
        </p>

        <div style={{ display: 'flex', gap: '1rem', gridColumn: '1 / -1' }}>
          <button className="btn-primary" style={{ flex: 1, backgroundColor: '#3b82f6', color: 'white' }} onClick={handleExportAccount}>
            <Download size={18} /> Export Full Account
          </button>
          <button className="btn-primary" style={{ flex: 1, backgroundColor: '#b91c1c', color: 'white' }} onClick={() => handleImportWithChoice("Restore Account", handleImportAccount, handleImportAccount)}>
            <Upload size={18} /> Restore Account
          </button>
        </div>
      </div>
    </div>
  );
}
