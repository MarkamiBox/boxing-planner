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

  const totalEntries = Object.values(coachMemory).reduce((a, arr) => a + (arr?.length || 0), 0);

  return (
    <div className="coach-memory-panel">
      <div className="coach-memory-panel-header">
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Coach Memory ({totalEntries})</h3>
        <button className="btn-icon" onClick={onClose} style={{ padding: '4px' }}>
          <X size={20} />
        </button>
      </div>

      <div className="coach-memory-panel-body">
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
              <h4>{cat.label} ({entries.length})</h4>
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