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
    const recentFull = logs.filter(l => l.energy > 0).slice(0, 10);
    const lastBoxing = logs.find(l => l.type === 'Boxing');
    const lastRunning = logs.find(l => l.type === 'Running');
    const withWeight = logs.filter(l => l.bodyWeight);
    const withSleep = logs.filter(l => l.sleepHours);
    
    let text = `🏋️ ATHLETE PROFILE 🥊\n`;
    text += `Age: ${localProfile.age} | Weight: ${localProfile.weight}kg | Height: ${localProfile.height || '-'}cm\n`;
    text += `Resting HR: ${localProfile.restingHR}bpm | Est. VO2max: ${localProfile.vo2max}\n`;
    text += `Experience: ${localProfile.experience} | Stance: ${localProfile.stance || 'Orthodox'} | Style: ${localProfile.style} | Main: ${localProfile.primaryPunch}\n\n`;
    
    text += `📊 TECHNICAL LEVELS (1-5)\n`;
    text += `Cardio: ${localProfile.levels.cardio} | Technique: ${localProfile.levels.technique} | Footwork: ${localProfile.levels.footwork}\n`;
    text += `Defense: ${localProfile.levels.defense} | Jab: ${localProfile.levels.jab} | Ring IQ/Reading: ${localProfile.levels.reading}\n\n`;

    if (withWeight.length > 0) {
      const last = withWeight[0];
      text += `⚖️ BODY WEIGHT (last: ${last.date})\n`;
      text += `${last.bodyWeight}kg\n\n`;
    }

    if (withSleep.length > 0) {
      const avgSleep = (withSleep.reduce((a, l) => a + l.sleepHours, 0) / withSleep.length).toFixed(1);
      text += `🛌 SLEEP (avg last ${withSleep.length} sessions)\n`;
      text += `Avg ${avgSleep}h/night\n\n`;
    }

    if (lastBoxing) {
      text += `🥊 LAST BOXING SESSION (${lastBoxing.date})\n`;
      text += `Rounds: ${lastBoxing.sparringRounds || '-'} | Drop: ${lastBoxing.lastRoundDrop || '-'}/10\n`;
      text += `Energy: ${lastBoxing.energy}/10 | Focus: ${lastBoxing.focus || '-'}/10 | Notes: ${lastBoxing.notes}\n\n`;
    }

    if (lastRunning) {
      text += `🏃 LAST RUNNING SESSION (${lastRunning.date})\n`;
      text += `Dist: ${lastRunning.distance} | Time: ${lastRunning.time} | Pace: ${lastRunning.pace}\n`;
      text += `Cardio/Legs feel: ${lastRunning.cardio}/10 ${lastRunning.legs}/10\n\n`;
    }

    if (recentFull.length > 0) {
      text += `📅 RECENT 10 SESSIONS\n`;
      recentFull.forEach(log => {
        text += `- ${log.date} [${log.type}] ${log.name || ''} | E:${log.energy} C:${log.cardio} I:${log.intensity || '-'} F:${log.focus || '-'} Dur:${log.duration || '-'}\n`;
      });
      text += '\n';
    }

    text += `\n---\nPlease analyze my training data and give me feedback on my progress, recovery, and what to focus on next.`;

    // fallback copy logic
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // Create a temporary textarea to copy
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
        console.error('Failed to copy', err);
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
        <button className="btn-secondary export-btn" onClick={handleExport}>
          {copied ? <><Check size={18} /> Copied</> : <><Copy size={18} /> Export Coach</>}
        </button>
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
