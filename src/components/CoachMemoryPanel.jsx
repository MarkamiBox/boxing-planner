import React, { useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';

const CATEGORIES = [
  { key: 'preferences', label: 'Preferences', desc: 'Things you like/dislike' },
  { key: 'observations', label: 'Observations', desc: 'Patterns noticed in performance' },
  { key: 'decisions', label: 'Decisions', desc: 'Periodization and changes made' },
  { key: 'injuries', label: 'Injuries', desc: 'Current/past injuries and severity' },
  // Keep legacy options to display old data
  { key: 'patterns', label: 'Patterns (Legacy)', desc: '' },
  { key: 'progress_notes', label: 'Progress (Legacy)', desc: '' }
];

export function CoachMemoryPanel({ coachMemory, setCoachMemory, onClose }) {
  const [newEntryText, setNewEntryText] = useState('');
  const [newEntryCategory, setNewEntryCategory] = useState('preferences');

  const addManualEntry = () => {
    if (!newEntryText.trim()) return;
    const entry = {
      id: Date.now().toString(),
      text: newEntryText.trim(),
      createdAt: new Date().toISOString(),
      source: 'user'
    };
    setCoachMemory({
      ...coachMemory,
      [newEntryCategory]: [...(coachMemory[newEntryCategory] || []), entry]
    });
    setNewEntryText('');
  };

  const removeEntry = (category, entryId) => {
    setCoachMemory({
      ...coachMemory,
      [category]: coachMemory[category].filter(e => e.id !== entryId)
    });
  };

  const CATEGORY_LIMIT = 20;
  const TOTAL_LIMIT = 80; // 4 categories x 20
  const countEntries = Object.values(coachMemory).reduce((a, arr) => a + (arr?.length || 0), 0);
  const usagePct = Math.min(100, Math.round((countEntries / TOTAL_LIMIT) * 100));
  const healthColor = usagePct < 50 ? '#10b981' : usagePct < 80 ? '#f59e0b' : '#ef4444';

  const handlePrune = () => {
    const pruned = {};
    Object.entries(coachMemory).forEach(([cat, entries]) => {
      if (!Array.isArray(entries)) { pruned[cat] = entries; return; }
      const sorted = [...entries].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return db - da; // desc
      });
      pruned[cat] = sorted.slice(0, CATEGORY_LIMIT);
    });
    setCoachMemory(pruned);
  };

  return (
    <div className="coach-memory-panel">
      <div className="coach-memory-panel-header">
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Coach Memory ({countEntries})</h3>
        <button className="btn-icon" onClick={onClose} style={{ padding: '4px' }}>
          <X size={20} />
        </button>
      </div>

      <div className="coach-memory-panel-body">
        {/* Memory Health Bar */}
        <div style={{ marginBottom:'1rem', padding:'0.75rem', 
          background:'var(--bg-color)', borderRadius:'0.5rem',
          border:'1px solid var(--border-color)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', 
            marginBottom:'6px', fontSize:'0.8rem' }}>
            <span style={{ color:'var(--text-muted)', fontWeight:600 }}>
              Memory usage
            </span>
            <span style={{ color: healthColor, fontWeight:700 }}>
              {countEntries} / {TOTAL_LIMIT}
            </span>
          </div>
          <div style={{ height:'6px', background:'var(--border-color)', 
            borderRadius:'3px', overflow:'hidden' }}>
            <div style={{ height:'100%', width: usagePct+'%', 
              background: healthColor, borderRadius:'3px',
              transition:'width 0.3s' }} />
          </div>
          {usagePct >= 80 && (
            <div style={{ marginTop:'8px', fontSize:'0.75rem', 
              color:'#f59e0b' }}>
              Memory is nearly full. Old entries may be overwriting useful 
              context. Consider pruning.
            </div>
          )}
        </div>

        {countEntries > 40 && (
          <button 
            className="btn-secondary" 
            style={{ width:'100%', fontSize:'0.8rem', padding:'0.4rem', 
              marginBottom:'1rem' }}
            onClick={handlePrune}
          >
            Prune to {CATEGORY_LIMIT} most recent per category
          </button>
        )}

        {/* Add manual entry */}
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <select value={newEntryCategory} onChange={e => setNewEntryCategory(e.target.value)} style={{ padding: '0.3rem', fontSize: '0.8rem', flex: 1 }}>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newEntryText}
              onChange={e => setNewEntryText(e.target.value)}
              placeholder="e.g. I don't like burpees"
              style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }}
              onKeyDown={e => { if (e.key === 'Enter') addManualEntry(); }}
            />
            <button className="btn-primary" style={{ padding: '0.4rem 0.6rem' }} onClick={addManualEntry}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Memory entries by category */}
        {CATEGORIES.map(cat => {
          const entries = coachMemory[cat.key] || [];
          if (entries.length === 0 && (cat.key === 'patterns' || cat.key === 'progress_notes')) return null; // Hide legacy if empty

          return (
            <div key={cat.key} className="coach-memory-category">
              <h4>
                {cat.label} <span style={{ color: entries.length >= CATEGORY_LIMIT ? '#ef4444' : 'inherit' }}>({entries.length}/{CATEGORY_LIMIT})</span>
              </h4>
              {cat.desc && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{cat.desc}</p>}
              {entries.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty</p>
              ) : (
                entries.map(entry => (
                  <div key={entry.id} className="coach-memory-entry">
                    <div style={{ flex: 1 }}>
                      <div className="entry-text">{typeof entry === 'string' ? entry : entry.text}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px', alignItems: 'center' }}>
                        {entry.createdAt && (
                          <span className="entry-date">{new Date(entry.createdAt).toLocaleDateString('it-IT')}</span>
                        )}
                        {entry.source && <span className="entry-source">{entry.source}</span>}
                      </div>
                    </div>
                    <button className="btn-icon danger" style={{ padding: '2px' }} onClick={() => removeEntry(cat.key, entry.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}