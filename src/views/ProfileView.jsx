import React, { useState, useRef } from 'react';
import { Copy, Save, Check, Download, Upload } from 'lucide-react';
import './profile.css';
import { useAppState } from '../hooks/useAppState';

export function ProfileView({ profile, setProfile, logs, setLogs, showAlert, showConfirm }) {
  const [localProfile, setLocalProfile] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const logsInputRef = useRef(null);
  
  const { schedule, setSchedule } = useAppState();

  const handleChange = (field, value) => {
    setLocalProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleLevelChange = (field, value) => {
    setLocalProfile(prev => ({
      ...prev,
      levels: { ...prev.levels, [field]: value }
    }));
  };

  const handleSave = () => {
    setProfile(localProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(schedule, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "boxing_schedule_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "boxing_logs_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportLogs = (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const importedLogs = JSON.parse(event.target.result);
          if (Array.isArray(importedLogs)) {
            setLogs(importedLogs);
            showAlert("Successo", "Log importati con successo!");
          } else {
            showAlert("Errore", "Struttura JSON non valida per i log.");
          }
        } catch (err) {
          showAlert("Errore", "Errore nella lettura del JSON dei log.");
        }
      };
    }
  };

  const handleImportJSON = (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const importedSchedule = JSON.parse(event.target.result);
          // basic validation
          if (importedSchedule.monday && importedSchedule.sunday) {
            setSchedule(importedSchedule); // This sets the currentWeekId specifically due to useAppState abstraction
            showAlert("Successo", "Scheda importata con successo nella settimana corrente! Le tue settimane passate rimangono intatte nello storico, mentre le settimane future (ancora vuote) si baseranno su questa nuova scheda.");
          } else {
            showAlert("Errore", "Struttura JSON non valida per la scheda.");
          }
        } catch (err) {
          showAlert("Errore", "Errore nella lettura del JSON. Assicurati che sia valido.");
        }
      };
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

    let text = '';

    // ── ROLE ────────────────────────────────────────────────────────────────────
    text += `You are my personal boxing coach and strength & conditioning advisor. I'm going to give you my complete athlete profile and training history. Your job is to:\n`;
    text += `1. Analyze my current state and recent training.\n`;
    text += `2. Give me a DETAILED WORKOUT for TODAY (${today}) — format it step by step with sets, reps, rounds, rest times.\n`;
    text += `3. Build me a COMPLETE NEXT WEEK TRAINING SCHEDULE (Mon–Sun) with each day clearly labeled.\n`;
    text += `4. Give me 2–3 specific coaching tips on what I need to improve MOST based on my data.\n`;
    text += `5. Flag any recovery concerns if you see signs of overtraining or insufficient rest.\n\n`;
    text += `Be direct, specific, and talk to me like a real coach. Format clearly with headers.\n\n`;

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

    // ── REQUEST ───────────────────────────────────────────────────────────────────
    text += `═══════════════════════════════════════\n`;
    text += `📋 WHAT I NEED FROM YOU\n`;
    text += `═══════════════════════════════════════\n\n`;
    text += `**1. TODAY'S WORKOUT** (${today} — ${todayDayName})\n`;
    text += `Give me an appropriate workout for today considering my recent fatigue level, days since last session, and soreness. Include:\n`;
    text += `- Warm-up (10–15 min with specific exercises)\n`;
    text += `- Main block (rounds/sets/reps clearly stated, rest times clearly stated)\n`;
    text += `- Cool-down & mobility\n`;
    text += `- Total expected duration\n\n`;
    text += `**2. NEXT WEEK SCHEDULE (Mon–Sun)**\n`;
    text += `Build me a full week plan. For each day tell me:\n`;
    text += `- Session type and name\n`;
    text += `- Main focus/goal of the session\n`;
    text += `- Approximate duration\n`;
    text += `- Any specific exercises or drills I should do\n`;
    text += `Respect my current level and don't overload me. Include at least 1 full rest day and 1 active recovery day.\n\n`;
    text += `**3. TOP COACHING PRIORITIES**\n`;
    text += `Based on my profile and data, what are the 2–3 things I should focus on most right now to improve fastest? Be specific — not generic advice.\n\n`;
    text += `**4. RECOVERY / RED FLAGS**\n`;
    text += `Do you see any warning signs in my data? Am I overtraining, under-recovering, or missing something important?\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Note: Format the schedule clearly so I can copy it into my Boxing Planner app. Use simple structure:\n`;
    text += `Monday: [Session Name] — [Duration] — [Focus]\nTuesday: REST / Active Recovery\netc.`;

    // ── COPY TO CLIPBOARD ─────────────────────────────────────────────────────────
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        showAlert('Errore', 'Copy failed. Review console.');
      }
      document.body.removeChild(textArea);
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
          <button className="btn-secondary export-btn" onClick={handleExport} style={{ background: 'linear-gradient(135deg, #b91c1c, #7c3aed)', color: 'white', border: 'none', fontWeight: 700 }}>
            {copied ? <><Check size={18} /> Copied!</> : <>🤖 AI Coach Prompt</>}
          </button>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Copy → paste into ChatGPT</span>
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
          <label>Primary Punch</label>
          <input type="text" value={localProfile.primaryPunch} onChange={e => handleChange('primaryPunch', e.target.value)} />
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

        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
          <button className="btn-primary w-full" onClick={handleSave}>
            {saved ? 'Saved!' : 'Save Profile Changes'}
          </button>
        </div>
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

          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => fileInputRef.current.click()}>
            <Upload size={18} /> Import Schedule
          </button>
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImportJSON} 
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', gridColumn: '1 / -1', marginTop: '0.5rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={handleExportLogs}>
            <Download size={18} /> Export Logs
          </button>

          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => logsInputRef.current.click()}>
            <Upload size={18} /> Import Logs
          </button>
          <input 
            type="file" 
            accept=".json" 
            ref={logsInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImportLogs} 
          />
        </div>
      </div>
    </div>
  );
}
