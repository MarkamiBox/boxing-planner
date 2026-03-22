import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Plus, Trash2, X, ChevronDown, ChevronUp, Settings, Eye, EyeOff } from 'lucide-react';
import { buildSystemPrompt, sendCoachMessage, sendToolResults, detectProvider } from '../services/coachApi';
import { executeToolCall } from '../services/coachTools';
import { CoachMemoryPanel } from '../components/CoachMemoryPanel';
import { useDialog } from '../components/DialogContext';
import { ExerciseEditor } from '../components/ExerciseEditor';
import './coach.css';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const result = [];
  
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) result.push(<br key={`br-${lineIdx}`} />);
    
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const Tag = `h${Math.min(level + 2, 6)}`;
      result.push(<Tag key={`h-${lineIdx}`} style={{ margin: '8px 0 4px', color: 'var(--primary)' }}>{renderMarkdownInline(content)}</Tag>);
      return;
    }

    const listMatch = line.match(/^(\s*)([-*])\s+(.*)$/);
    if (listMatch) {
      result.push(
        <div key={`li-${lineIdx}`} style={{ paddingLeft: '1rem', position: 'relative', marginBottom: '4px' }}>
          <span style={{ position: 'absolute', left: 0, color: 'var(--primary)' }}>•</span>
          {renderMarkdownInline(listMatch[3])}
        </div>
      );
      return;
    }

    result.push(<span key={`text-${lineIdx}`}>{renderMarkdownInline(line)}</span>);
  });
  
  return result;
}

function renderMarkdownInline(line) {
  const result = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIdx) result.push(line.slice(lastIdx, match.index));
      if (match[1] !== undefined) result.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
      else result.push(<em key={`i-${match.index}`}>{match[2]}</em>);
      lastIdx = match.index + match[0].length;
  }
  if (lastIdx < line.length) result.push(line.slice(lastIdx));
  return result;
}

export function CoachView({
  profile, setProfile,
  schedule, setSchedule,
  weeks, setWeeks,
  currentWeekId, setCurrentWeekId,
  logs,
  goals, setGoals,
  coachMemory, setCoachMemory,
  coachSettings, setCoachSettings,
  coachConversations, setCoachConversations,
  pendingCoachContext, setPendingCoachContext,
  pendingTools, setPendingTools
}) {
  const { showConfirm } = useDialog();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const [activeConvId, setActiveConvId] = useState(null);
  const [showMemory, setShowMemory] = useState(false);
  const [showSchedulePreview, setShowSchedulePreview] = useState(true);
  const [highlightedExercises, setHighlightedExercises] = useState(new Set());
  const [expandedTools, setExpandedTools] = useState(new Set());
  const [disabledToolIndices, setDisabledToolIndices] = useState(new Set());
  const [previewDay, setPreviewDay] = useState(null);
  const [editingToolRef, setEditingToolRef] = useState(null); // { idx: number, type: 'tool'|'ex' }
  const [overrides, setOverrides] = useState({}); // toolIdx -> updatedToolInput

  const [apiKeyInput, setApiKeyInput] = useState({
    anthropic: coachSettings.anthropicKey || '',
    openrouter: coachSettings.openrouterKey || '',
    google: coachSettings.googleKey || ''
  });
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const currentConv = coachConversations.find(c => c.id === activeConvId);
  const messages = currentConv?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, pendingTools]);

  useEffect(() => {
    if (pendingCoachContext) {
      const log = pendingCoachContext;
      let prefill = `Ho appena completato "${log.name || 'una sessione'}".`;
      if (log.energy > 0) prefill += ` Energy: ${log.energy}/10, Cardio: ${log.cardio}/10.`;
      if (log.skippedSteps > 0) prefill += ` Ho saltato ${log.skippedSteps} step guidati.`;
      if (log.notes) prefill += ` Note: ${log.notes}`;
      setInputText(prefill);
      setPendingCoachContext(null);
    }
  }, [pendingCoachContext, setPendingCoachContext]);

  const anyKeySet = coachSettings.anthropicKey || coachSettings.openrouterKey || coachSettings.googleKey;

  if (!anyKeySet || showSettings) {
    const handleSaveKeys = () => {
      const keys = {
        anthropicKey: apiKeyInput.anthropic.trim(),
        openrouterKey: apiKeyInput.openrouter.trim(),
        googleKey: apiKeyInput.google.trim(),
      };
      let activeProvider = coachSettings.activeProvider;
      if (!activeProvider) {
        if (keys.anthropicKey) activeProvider = 'anthropic';
        else if (keys.googleKey) activeProvider = 'google';
        else if (keys.openrouterKey) activeProvider = 'openrouter';
      }
      const activeKey = activeProvider === 'anthropic' ? keys.anthropicKey : 
                        activeProvider === 'google' ? keys.googleKey : 
                        keys.openrouterKey;

      setCoachSettings({
        ...coachSettings,
        ...keys,
        activeProvider: activeProvider || 'anthropic',
        apiKey: activeKey,
        model: coachSettings.model || 'claude-3-5-sonnet-20241022'
      });
      setShowSettings(false);
    };

    return (
      <div className="page-container coach-view" style={{ overflowY: 'auto' }}>
        <div className="coach-setup">
          <Brain size={48} style={{ color: 'var(--primary)' }} />
          <h2>AI Coach Settings</h2>
          <p style={{ marginBottom: '1.5rem' }}>Store multiple keys and switch anytime.</p>
          <div className="setup-fields">
             <div className="setup-field">
              <label>Anthropic API Key</label>
              <input type="password" value={apiKeyInput.anthropic} onChange={e => setApiKeyInput({ ...apiKeyInput, anthropic: e.target.value })} />
            </div>
            <div className="setup-field">
              <label>Google AI Studio Key</label>
              <input type="password" value={apiKeyInput.google} onChange={e => setApiKeyInput({ ...apiKeyInput, google: e.target.value })} />
            </div>
            <div className="setup-field">
              <label>OpenRouter API Key</label>
              <input type="password" value={apiKeyInput.openrouter} onChange={e => setApiKeyInput({ ...apiKeyInput, openrouter: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveKeys}>Save</button>
            {anyKeySet && <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowSettings(false)}>Cancel</button>}
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    setError(''); // Clear errors when switching convs
  }, [activeConvId]);

  const deleteConversation = (id) => {
    showConfirm('Sei sicuro?', 'Vuoi davvero eliminare questa conversazione?', () => {
      const newConvs = coachConversations.filter(c => c.id !== id);
      setCoachConversations(newConvs);
      if (activeConvId === id) {
        const remaining = newConvs.length > 0 ? newConvs[0].id : null;
        setActiveConvId(remaining);
      }
    });
  };

  const createNewConversation = () => {
    const newConv = { id: Date.now().toString(), title: `Session ${new Date().toLocaleDateString('it-IT')}`, createdAt: new Date().toISOString(), messages: [] };
    setCoachConversations([newConv, ...coachConversations]);
    setActiveConvId(newConv.id);
    setStreamingText('');
    setError('');
  };

  if (coachConversations.length === 0 || (!activeConvId && coachConversations.length > 0)) {
    if (coachConversations.length === 0) {
      setTimeout(createNewConversation, 0);
      return null;
    }
    if (!activeConvId) setActiveConvId(coachConversations[0].id);
  }

  const updateConversation = (newMessages) => {
    setCoachConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, messages: newMessages } : c));
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    setError('');
    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    updateConversation(updatedMessages);
    setIsLoading(true);
    try {
      const systemPrompt = buildSystemPrompt({ profile, schedule, currentWeekId, logs, goals, coachMemory });
      const apiMessages = updatedMessages.filter(m => m.role === 'user' || m.role === 'assistant');
      let accText = '';
      const result = await sendCoachMessage({
        apiKey: coachSettings.apiKey, model: coachSettings.model, systemPrompt, messages: apiMessages,
        onTextChunk: (chunk) => { accText += chunk; setStreamingText(accText); }
      });

      if (result.toolUses && result.toolUses.length > 0) {
        const assistantMsg = { role: 'assistant', content: result.text || '', toolCalls: result.toolUses.map(tu => ({ ...tu, isPending: true })), isPending: true, convId: activeConvId };
        const finalMsgs = [...updatedMessages, assistantMsg];
        updateConversation(finalMsgs);
        setPendingTools({ convId: activeConvId, tools: result.toolUses, snapshot: { schedule, goals, coachMemory }, result, originalMsgs: finalMsgs });
      } else {
        updateConversation([...updatedMessages, { role: 'assistant', content: result.text }]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  const handleApprove = async () => {
    const { result, originalMsgs, snapshot } = pendingTools;
    const activeTools = result.toolUses.map((tu, idx) => {
      if (disabledToolIndices.has(idx)) return null;
      if (overrides[idx]) return { ...tu, input: overrides[idx] };
      return tu;
    }).filter(Boolean);
    
    setPendingTools(null);
    setDisabledToolIndices(new Set());
    setOverrides({});
    setIsLoading(true);
    
    if (activeTools.length === 0) {
      handleReject();
      return;
    }

    const toolResults = [];
    const toolMessages = [];
    const newHighlights = new Set();
    let currentSchedule = snapshot.schedule;
    let currentGoals = snapshot.goals;
    let currentMemory = snapshot.coachMemory;

    for (const tu of activeTools) {
      const appState = {
        schedule: currentSchedule, setSchedule: s => { currentSchedule = s; setSchedule(s); },
        goals: currentGoals, setGoals: g => { currentGoals = g; setGoals(g); },
        coachMemory: currentMemory, setCoachMemory: m => { currentMemory = m; setCoachMemory(m); },
        weeks, setWeeks, currentWeekId, setCurrentWeekId, profile, setProfile
      };
      const res = executeToolCall(tu.name, tu.input, appState);
      toolResults.push({ tool_use_id: tu.id, tool_name: tu.name, content: JSON.stringify(res) });
      toolMessages.push({ role: 'tool', toolName: tu.name, toolInput: tu.input, result: res });
      if (res.diff?.exerciseId) newHighlights.add(res.diff.exerciseId);
      if (res.diff?.added?.id) newHighlights.add(res.diff.added.id);
    }

    setHighlightedExercises(newHighlights);
    setTimeout(() => setHighlightedExercises(new Set()), 3000);

    const assistantMsg = { role: 'assistant', content: result.text || '', toolCalls: result.toolUses.map((tu, i) => ({ ...tu, result: toolMessages[i]?.result })), snapshot };
    const updatedWithResult = [...originalMsgs.filter(m => !m.isPending), assistantMsg];
    updateConversation(updatedWithResult);

    try {
      const systemPrompt = buildSystemPrompt({ profile, schedule: currentSchedule, currentWeekId, logs, goals: currentGoals, coachMemory: currentMemory });
      let accText = '';
      const followUp = await sendToolResults({
        apiKey: coachSettings.apiKey, model: coachSettings.model, systemPrompt,
        messages: updatedWithResult.filter(m => m.role === 'user' || m.role === 'assistant'),
        toolResults, onTextChunk: c => { accText += c; setStreamingText(accText); }
      });
      if (followUp.text) updateConversation([...updatedWithResult, { role: 'assistant', content: followUp.text }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  const handleReject = () => {
    updateConversation(pendingTools.originalMsgs.filter(m => !m.isPending));
    setPendingTools(null);
    setDisabledToolIndices(new Set());
    setOverrides({});
  };

  const toggleTool = (idx) => {
    setDisabledToolIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const renderVisualPreview = (pt) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Find first day with changes if not set
    const daysWithChanges = days.filter(d => 
      pt.tools.some(tu => tu.input.day === d || tu.input.fromDay === d || ['rewrite_week', 'create_next_week'].includes(tu.name))
    );
    
    const currentDay = previewDay || daysWithChanges[0] || 'monday';
    const originalExs = pt.snapshot.schedule[currentDay] || [];
    
    // Calculate what happens on this day - processed regardless of disabled status to keep cards visible
    const dayTools = pt.tools.map((tu, idx) => ({ ...tu, idx })).filter(tu => {
      return tu.input.day === currentDay || tu.input.fromDay === currentDay || ['rewrite_week', 'create_next_week'].includes(tu.name);
    });

    // Simple "simulation" for the visual preview
    let previewExs = [...originalExs.map(ex => ({ ...ex, status: 'original' }))];
    
    dayTools.forEach(tu => {
      const input = overrides[tu.idx] || tu.input;

      if (tu.name === 'add_exercise') {
        previewExs.push({ ...input.exercise, id: `preview-${tu.idx}`, status: 'added', toolIdx: tu.idx });
      } else if (tu.name === 'remove_exercise') {
        const found = previewExs.find(e => e.id === input.exerciseId);
        if (found) { found.status = 'removed'; found.toolIdx = tu.idx; }
      } else if (tu.name === 'modify_exercise') {
        const found = previewExs.find(e => e.id === input.exerciseId);
        if (found) {
          Object.assign(found, input.fields);
          found.status = 'modified';
          found.toolIdx = tu.idx;
        }
      } else if (tu.name === 'replace_exercise') {
        const found = previewExs.find(e => e.id === input.exerciseId);
        if (found) {
          found.status = 'removed'; found.toolIdx = tu.idx;
          previewExs.push({ ...input.newExercise, id: `preview-r-${tu.idx}`, status: 'added', toolIdx: tu.idx });
        }
      } else if (tu.name === 'rewrite_week' || tu.name === 'create_next_week') {
        const newDayExs = input.schedule[currentDay] || [];
        previewExs = newDayExs.map((e, ei) => ({ ...e, status: 'added', toolIdx: tu.idx, exIdx: ei }));
      }
    });

    const handleSaveEdit = (newEx) => {
      const { idx, exIdx } = editingToolRef;
      const tu = pt.tools[idx];
      const newOverrides = { ...overrides };

      if (tu.name === 'add_exercise') {
        newOverrides[idx] = { ...tu.input, exercise: newEx };
      } else if (tu.name === 'modify_exercise') {
        newOverrides[idx] = { ...tu.input, fields: newEx };
      } else if (tu.name === 'replace_exercise') {
        newOverrides[idx] = { ...tu.input, newExercise: newEx };
      } else if (tu.name === 'rewrite_week' || tu.name === 'create_next_week') {
        const newSchedule = JSON.parse(JSON.stringify(overrides[idx]?.schedule || tu.input.schedule));
        newSchedule[currentDay][exIdx] = { ...newSchedule[currentDay][exIdx], ...newEx };
        newOverrides[idx] = { ...tu.input, schedule: newSchedule };
      }
      setOverrides(newOverrides);
      setEditingToolRef(null);
    };

    return (
      <div className="coach-visual-preview">
        {editingToolRef && (
          <div className="preview-edit-overlay">
            <ExerciseEditor 
              exercise={(() => {
                const { idx, exIdx } = editingToolRef;
                const tu = pt.tools[idx];
                const input = overrides[idx] || tu.input;
                if (tu.name === 'rewrite_week' || tu.name === 'create_next_week') return input.schedule[currentDay][exIdx];
                if (tu.name === 'add_exercise') return input.exercise;
                if (tu.name === 'modify_exercise') return { ...pt.snapshot.schedule[currentDay].find(e => e.id === input.exerciseId), ...input.fields };
                if (tu.name === 'replace_exercise') return input.newExercise;
                return {};
              })()}
              onSave={handleSaveEdit}
              onCancel={() => setEditingToolRef(null)}
            />
          </div>
        )}

        <div className="preview-day-nav">
          <button onClick={() => setPreviewDay(days[(days.indexOf(currentDay) + 6) % 7])}>←</button>
          <span className="current-day-label">{currentDay.toUpperCase()}</span>
          <button onClick={() => setPreviewDay(days[(days.indexOf(currentDay) + 1) % 7])}>→</button>
        </div>

        <div className="preview-cards-list">
          {previewExs.length === 0 && <div className="preview-empty">Nessun esercizio pianificato.</div>}
          {previewExs.map((ex, i) => (
            <div key={i} className={`preview-ex-card status-${ex.status} ${ex.toolIdx !== undefined && disabledToolIndices.has(ex.toolIdx) ? 'is-disabled' : ''}`}
                 onClick={() => ex.toolIdx !== undefined && toggleTool(ex.toolIdx)}>
              <div className="preview-ex-header">
                <span className="preview-ex-type">{ex.type}</span>
                <span className="preview-ex-name">{ex.name}</span>
                {ex.toolIdx !== undefined && ex.status !== 'removed' && (
                  <button className="preview-edit-btn" onClick={(e) => { e.stopPropagation(); setEditingToolRef({ idx: ex.toolIdx, exIdx: ex.exIdx }); }}>
                     <Settings size={14} />
                  </button>
                )}
              </div>
              {ex.plannedTime && <div className="preview-ex-time">🕒 {ex.plannedTime}</div>}
              {ex.notes && <div className="preview-ex-notes">{ex.notes}</div>}
              {ex.steps && <div className="preview-ex-steps-count">{ex.steps.length} steps</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const formatToolName = name => {
    const map = { 
      'modify_exercise': 'Modifica', 
      'add_exercise': 'Aggiungi', 
      'remove_exercise': 'Rimuovi', 
      'replace_exercise': 'Sostituisci', 
      'rewrite_week': 'Reset Settimana', 
      'create_next_week': 'Nuova Settimana',
      'reschedule_exercise': 'Sposta',
      'update_coach_memory': 'Memoria', 
      'update_goal': 'Obiettivo',
      'update_skill_level': 'Skill Level'
    };
    return map[name] || name;
  };

  return (
    <div className="page-container coach-view">
      <div className="coach-header">
        <div className="coach-header-row coach-title-row">
          <h1 className="page-title">Coach</h1>
          <div className="coach-tool-group mobile-tools">
            <button className="btn-icon" onClick={() => setShowMemory(true)}><Brain size={18} /></button>
            <button className="btn-icon" onClick={createNewConversation}><Plus size={18} /></button>
            <button className="btn-icon" onClick={() => setShowSettings(true)}><Settings size={16} /></button>
          </div>
        </div>

        {coachConversations.length > 0 && (
          <div className="coach-header-row coach-conv-selector">
            <select className="session-select" value={activeConvId || ''} onChange={e => setActiveConvId(e.target.value)}>
              {coachConversations.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button className="btn-icon danger" onClick={() => deleteConversation(activeConvId)} title="Elimina conversazione">
              <Trash2 size={14} />
            </button>
          </div>
        )}

        <div className="coach-header-row coach-model-group">
          <select 
            className="coach-provider-select" 
            value={coachSettings.activeProvider} 
            onChange={e => {
              const p = e.target.value;
              const k = p === 'anthropic' ? (coachSettings.anthropicKey || '') : p === 'google' ? (coachSettings.googleKey || '') : (coachSettings.openrouterKey || '');
              setCoachSettings({ 
                ...coachSettings, 
                activeProvider: p, 
                apiKey: k, 
                model: p === 'google' ? 'gemini-2.5-flash' : p === 'openrouter' ? 'deepseek/deepseek-chat' : 'claude-3-5-sonnet-20241022' 
              });
            }}
          >
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="openrouter">OpenRouter</option>
          </select>

          <select 
            className="coach-model-select" 
            value={coachSettings.model} 
            onChange={e => {
              if (e.target.value === 'CUSTOM') {
                const custom = prompt('Inserisci ID Modello OpenRouter (es. openai/gpt-4o):');
                if (custom) setCoachSettings({ ...coachSettings, model: custom });
              } else {
                setCoachSettings({ ...coachSettings, model: e.target.value });
              }
            }}
          >
            {coachSettings.activeProvider === 'google' ? (
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            ) : coachSettings.activeProvider === 'openrouter' ? (
              <>
                <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (OR)</option>
                <option value="google/gemini-flash-1.5">Gemini 1.5 Flash (OR)</option>
                <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B (OR)</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini (OR)</option>
                <option value="CUSTOM">Altro (Custom)...</option>
              </>
            ) : (
              <>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              </>
            )}
          </select>
        </div>

        <div className="coach-tool-group desktop-tools">
          <button className="btn-icon" onClick={() => setShowMemory(true)}><Brain size={18} /></button>
          <button className="btn-icon" onClick={createNewConversation}><Plus size={18} /></button>
          <button className="btn-icon" onClick={() => setShowSettings(true)}><Settings size={16} /></button>
        </div>
      </div>


      <div className="coach-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`coach-msg ${msg.role}`}>
             {msg.role === 'assistant' && msg.toolCalls?.map((tc, ti) => (
               <div key={ti} className="coach-tool-indicator">
                 {tc.isPending ? '⏳' : '✅'} {formatToolName(tc.name)}
               </div>
             ))}
             {renderMarkdown(msg.content)}
             {msg.role === 'assistant' && msg.snapshot && !msg.undone && (
               <button className="undo-btn" onClick={() => { setSchedule(msg.snapshot.schedule); setGoals(msg.snapshot.goals); setCoachMemory(msg.snapshot.coachMemory); updateConversation(messages.map((m, i) => i === idx ? { ...m, undone: true } : m)); }}>↩ Undo</button>
             )}
          </div>
        ))}
        {streamingText && <div className="coach-msg assistant">{renderMarkdown(streamingText)}</div>}
        {isLoading && !streamingText && <div className="coach-typing"><span className="dot"/><span className="dot"/><span className="dot"/></div>}
        {error && (
          <div className="coach-msg system error">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <strong>Si è verificato un errore:</strong>
              <p>{error}</p>
              <button className="btn-text" style={{ fontSize: '0.8rem', padding: '0', marginTop: '4px' }} onClick={() => handleSend()}>Riprova</button>
            </div>
          </div>
        )}

        {pendingTools && pendingTools.convId === activeConvId && (
          <div className="coach-approval-card detailed">
            <h4>Proposta di Allenamento</h4>
            <p>Verifica le modifiche giorno per giorno prima di confermare:</p>
            
            {renderVisualPreview(pendingTools)}

            <div className="approval-actions">
              <button className="btn-primary" onClick={handleApprove}>Applica Modifiche</button>
              <button className="btn-secondary" onClick={handleReject}>Annulla</button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      <div className="coach-input-area">
        <textarea ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} placeholder="Scrivi al coach..." rows={1} disabled={isLoading} />
        <button className="coach-send-btn" onClick={handleSend} disabled={isLoading || !inputText.trim()}><Send size={18} /></button>
      </div>

      <div className="coach-schedule-preview">
        <h4>Weekly Preview <button onClick={() => setShowSchedulePreview(!showSchedulePreview)}>{showSchedulePreview ? <EyeOff size={14}/> : <Eye size={14}/>}</button></h4>
        {showSchedulePreview && daysOfWeek.map(day => (
          <div key={day} className="coach-schedule-day">
            <span className="coach-schedule-day-name">{day.slice(0, 3)}</span>
            <div className="coach-schedule-exercises">
              {(schedule[day] || []).map(ex => <span key={ex.id} className={`coach-schedule-ex-chip ${ex.done ? 'done' : ''} ${highlightedExercises.has(ex.id) ? 'highlight' : ''}`}>{ex.name}</span>)}
            </div>
          </div>
        ))}
      </div>
      {showMemory && <><div className="modal-overlay" onClick={() => setShowMemory(false)} /><CoachMemoryPanel coachMemory={coachMemory} setCoachMemory={setCoachMemory} onClose={() => setShowMemory(false)} /></>}
    </div>
  );
}
