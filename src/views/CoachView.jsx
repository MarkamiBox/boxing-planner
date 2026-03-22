import React, { useState, useRef, useEffect } from 'react';
import { Send, Brain, Plus, Trash2, X, ChevronDown, ChevronUp, Settings, Eye, EyeOff } from 'lucide-react';
import { buildSystemPrompt, sendCoachMessage, sendToolResults, detectProvider } from '../services/coachApi';
import { executeToolCall } from '../services/coachTools';
import { CoachMemoryPanel } from '../components/CoachMemoryPanel';
import { useDialog } from '../components/DialogContext';
import './coach.css';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const result = [];
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) result.push('\n');
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIdx) result.push(line.slice(lastIdx, match.index));
      if (match[1] !== undefined) result.push(<strong key={`b-${lineIdx}-${match.index}`}>{match[1]}</strong>);
      else result.push(<em key={`i-${lineIdx}-${match.index}`}>{match[2]}</em>);
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < line.length) result.push(line.slice(lastIdx));
  });
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
  pendingCoachContext, setPendingCoachContext
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

  // API key setup state
  const [apiKeyInput, setApiKeyInput] = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Get current conversation
  const currentConv = coachConversations.find(c => c.id === activeConvId);
  const messages = currentConv?.messages || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Handle pending coach context from logger
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

  // ── API Key Setup ──────────────────────────────────────────────────

  if (!coachSettings.apiKey) {
    const detectedProvider = detectProvider(apiKeyInput.trim());
    const defaultModel = detectedProvider === 'openrouter' ? 'deepseek/deepseek-chat' : 'claude-haiku-4-5-20251001';
    return (
      <div className="page-container coach-view">
        <div className="coach-setup">
          <Brain size={48} style={{ color: 'var(--primary)' }} />
          <h2>Setup Your AI Coach</h2>
          <p>
            Paste your API key below. Supports <strong>Anthropic</strong> (<code>sk-ant-...</code>) or <strong>OpenRouter</strong> (<code>sk-or-...</code>).
            The key stays on your device only.
          </p>
          <div className="setup-input-row">
            <input
              type="password"
              placeholder="sk-ant-... or sk-or-..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && apiKeyInput.trim()) {
                  setCoachSettings({ ...coachSettings, apiKey: apiKeyInput.trim(), model: defaultModel });
                }
              }}
            />
            <button
              className="btn-primary"
              onClick={() => {
                if (apiKeyInput.trim()) {
                  setCoachSettings({ ...coachSettings, apiKey: apiKeyInput.trim(), model: defaultModel });
                }
              }}
            >
              Save
            </button>
          </div>
          {apiKeyInput.trim() && (
            <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.5rem' }}>
              Detected: <strong>{detectedProvider === 'openrouter' ? 'OpenRouter' : 'Anthropic'}</strong>
              {' — '}default model: <code>{defaultModel}</code>
            </p>
          )}
          <p className="setup-note">
            Anthropic: console.anthropic.com — OpenRouter: openrouter.ai/keys<br />
            Cost: ~$0.003–0.015 per message. $5 lasts months with daily use.
          </p>
        </div>
      </div>
    );
  }

  // ── Conversation Management ────────────────────────────────────────

  const createNewConversation = () => {
    const newConv = {
      id: Date.now().toString(),
      title: `Session ${new Date().toLocaleDateString('it-IT')}`,
      createdAt: new Date().toISOString(),
      messages: []
    };
    setCoachConversations([newConv, ...coachConversations]);
    setActiveConvId(newConv.id);
    setStreamingText('');
    setError('');
  };

  const deleteConversation = (convId) => {
    showConfirm('Delete Conversation', 'Are you sure?', () => {
      setCoachConversations(coachConversations.filter(c => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(coachConversations.length > 1 ? coachConversations.find(c => c.id !== convId)?.id : null);
      }
    });
  };

  // Auto-create first conversation
  if (coachConversations.length === 0 || (!activeConvId && coachConversations.length > 0)) {
    if (coachConversations.length === 0) {
      // Will be created on first render
      setTimeout(createNewConversation, 0);
      return <div className="page-container coach-view"><div className="coach-setup"><p>Initializing coach...</p></div></div>;
    }
    if (!activeConvId) {
      setActiveConvId(coachConversations[0].id);
    }
  }

  // ── Send Message ───────────────────────────────────────────────────

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText('');
    setError('');
    setStreamingText('');

    // Add user message
    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];

    // Update conversation
    updateConversation(updatedMessages);

    setIsLoading(true);

    try {
      await processCoachResponse(updatedMessages);
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API key.');
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  const processCoachResponse = async (conversationMessages) => {
    const systemPrompt = buildSystemPrompt({
      profile, schedule, currentWeekId, logs, goals, coachMemory
    });

    // Only user/assistant messages — system prompt passed separately
    const apiMessages = conversationMessages.filter(m => m.role === 'user' || m.role === 'assistant');

    let accumulatedText = '';

    const result = await sendCoachMessage({
      apiKey: coachSettings.apiKey,
      model: coachSettings.model,
      systemPrompt,
      messages: apiMessages,
      onTextChunk: (chunk) => {
        accumulatedText += chunk;
        setStreamingText(accumulatedText);
      },
      onToolUse: () => {}
    });

    // Process tool calls if any
    if (result.toolUses && result.toolUses.length > 0) {
      // Execute all tool calls
      const toolResults = [];
      const toolMessages = [];
      const newHighlights = new Set();

      // Snapshot before executing any tools (for rollback)
      const snapshot = { schedule, goals, coachMemory };

      // Mutable refs so sequential tool calls see updated state
      let currentSchedule = schedule;
      let currentGoals = goals;
      let currentMemory = coachMemory;

      for (const toolUse of result.toolUses) {
        const appState = {
          schedule: currentSchedule,
          setSchedule: (s) => { currentSchedule = s; setSchedule(s); },
          goals: currentGoals,
          setGoals: (g) => { currentGoals = g; setGoals(g); },
          coachMemory: currentMemory,
          setCoachMemory: (m) => { currentMemory = m; setCoachMemory(m); },
          weeks, setWeeks, currentWeekId, setCurrentWeekId, profile, setProfile
        };

        const toolResult = executeToolCall(toolUse.name, toolUse.input, appState);

        toolResults.push({
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult)
        });

        toolMessages.push({
          role: 'tool',
          toolName: toolUse.name,
          toolInput: toolUse.input,
          result: toolResult
        });

        // Track modified exercises for highlighting
        if (toolResult.diff) {
          if (toolResult.diff.exerciseId) newHighlights.add(toolResult.diff.exerciseId);
          if (toolResult.diff.added?.id) newHighlights.add(toolResult.diff.added.id);
        }
      }

      // Highlight modified exercises
      setHighlightedExercises(newHighlights);
      setTimeout(() => setHighlightedExercises(new Set()), 3000);

      // Add assistant message with tool calls + tool results to conversation
      const assistantMsg = {
        role: 'assistant',
        content: result.text || '',
        toolCalls: result.toolUses.map((tu, i) => ({
          ...tu,
          result: toolMessages[i]?.result
        })),
        snapshot
      };

      const updatedMsgs = [...conversationMessages, assistantMsg];
      updateConversation(updatedMsgs);

      // Send tool results back to get follow-up response
      accumulatedText = '';
      setStreamingText('');

      const followUp = await sendToolResults({
        apiKey: coachSettings.apiKey,
        model: coachSettings.model,
        systemPrompt,
        messages: updatedMsgs.filter(m => m.role === 'user' || m.role === 'assistant'),
        toolResults,
        onTextChunk: (chunk) => {
          accumulatedText += chunk;
          setStreamingText(accumulatedText);
        }
      });

      // Add follow-up text as a new assistant message
      if (followUp.text) {
        const followUpMsg = { role: 'assistant', content: followUp.text };
        updateConversation([...updatedMsgs, followUpMsg]);
      }

      // Handle recursive tool calls (in case follow-up also uses tools)
      if (followUp.toolUses && followUp.toolUses.length > 0) {
        for (const toolUse of followUp.toolUses) {
          const appState = {
            schedule: currentSchedule,
            setSchedule: (s) => { currentSchedule = s; setSchedule(s); },
            goals: currentGoals,
            setGoals: (g) => { currentGoals = g; setGoals(g); },
            coachMemory: currentMemory,
            setCoachMemory: (m) => { currentMemory = m; setCoachMemory(m); },
            weeks, setWeeks, currentWeekId, setCurrentWeekId, profile, setProfile
          };
          executeToolCall(toolUse.name, toolUse.input, appState);
        }
      }
    } else {
      // No tool calls, just a text response
      const assistantMsg = { role: 'assistant', content: result.text };
      updateConversation([...conversationMessages, assistantMsg]);
    }
  };

  const updateConversation = (newMessages) => {
    setCoachConversations(prev => prev.map(c =>
      c.id === activeConvId
        ? { ...c, messages: newMessages }
        : c
    ));
  };

  // ── Auto-resize textarea ───────────────────────────────────────────

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Tool indicator formatting ──────────────────────────────────────

  const formatToolName = (name) => {
    const map = {
      'modify_exercise': 'Modified exercise',
      'add_exercise': 'Added exercise',
      'remove_exercise': 'Removed exercise',
      'replace_exercise': 'Replaced exercise',
      'reschedule_exercise': 'Rescheduled exercise',
      'rewrite_week': 'Rewrote week schedule',
      'create_next_week': 'Created next week',
      'update_goal': 'Updated goal',
      'update_coach_memory': 'Stored memory',
      'update_skill_level': 'Updated skill level'
    };
    return map[name] || name;
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="page-container coach-view">
      {/* Header */}
      <div className="coach-header">
        <div className="coach-conv-selector">
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.1rem' }}>Coach</h1>
          {coachConversations.length > 1 && (
            <select
              value={activeConvId || ''}
              onChange={e => { setActiveConvId(e.target.value); setStreamingText(''); setError(''); }}
              style={{ maxWidth: '150px', minWidth: '100px', padding: '0.25rem', fontSize: '0.8rem' }}
            >
              {coachConversations.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}
        </div>
        <div className="coach-header-actions">
          <select
            className="coach-model-select"
            value={coachSettings.model}
            onChange={e => setCoachSettings({ ...coachSettings, model: e.target.value })}
          >
            {detectProvider(coachSettings.apiKey) === 'openrouter' ? (
              <>
                <option value="deepseek/deepseek-chat">DeepSeek V3 💰</option>
                <option value="google/gemini-flash-2.0">Gemini Flash 💰</option>
                <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
                <option value="anthropic/claude-haiku-4-5">Haiku (OR)</option>
                <option value="anthropic/claude-sonnet-4-5">Sonnet (OR)</option>
              </>
            ) : (
              <>
                <option value="claude-haiku-4-5-20251001">Haiku 💰</option>
                <option value="claude-sonnet-4-20250514">Sonnet</option>
              </>
            )}
          </select>
          <button className="btn-icon" title="Coach Memory" onClick={() => setShowMemory(true)} style={{ padding: '4px' }}>
            <Brain size={18} />
          </button>
          <button className="btn-icon" title="New Conversation" onClick={createNewConversation} style={{ padding: '4px' }}>
            <Plus size={18} />
          </button>
          {activeConvId && (
            <button className="btn-icon danger" title="Delete Conversation" onClick={() => deleteConversation(activeConvId)} style={{ padding: '4px' }}>
              <Trash2 size={16} />
            </button>
          )}
          <button className="btn-icon danger" title="Remove API Key"
            onClick={() => showConfirm('Remove API Key', 'This will disconnect the coach.', () => setCoachSettings({ ...coachSettings, apiKey: '' }))}
            style={{ padding: '4px' }}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="coach-messages">
        {messages.length === 0 && !streamingText && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
            <Brain size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>Ciao! Sono il tuo coach. Dimmi come posso aiutarti oggi.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Puoi chiedermi di modificare il programma, dare feedback su una sessione, o pianificare la prossima settimana.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return <div key={idx} className="coach-msg user">{msg.content}</div>;
          }
          if (msg.role === 'assistant') {
            return (
              <React.Fragment key={idx}>
                {/* Tool call indicators */}
                {msg.toolCalls && msg.toolCalls.map((tc, tcIdx) => (
                  <React.Fragment key={`tool-${idx}-${tcIdx}`}>
                    <div
                      className="coach-tool-indicator"
                      onClick={() => setExpandedTools(prev => {
                        const next = new Set(prev);
                        const key = `${idx}-${tcIdx}`;
                        next.has(key) ? next.delete(key) : next.add(key);
                        return next;
                      })}
                    >
                      {tc.result?.success ? '\u2705' : '\u274c'} {formatToolName(tc.name)}
                      {tc.result?.message && ` — ${tc.result.message}`}
                      {expandedTools.has(`${idx}-${tcIdx}`) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                    {expandedTools.has(`${idx}-${tcIdx}`) && (
                      <div className="coach-tool-detail">
                        {JSON.stringify(tc.input, null, 2)}
                      </div>
                    )}
                  </React.Fragment>
                ))}
                {/* Undo button for messages with tool calls */}
                {msg.toolCalls?.length > 0 && msg.snapshot && !msg.undone && (
                  <button
                    style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '2px 8px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}
                    onClick={() => {
                      setSchedule(msg.snapshot.schedule);
                      setGoals(msg.snapshot.goals);
                      setCoachMemory(msg.snapshot.coachMemory);
                      setCoachConversations(prev => prev.map(c =>
                        c.id === activeConvId
                          ? { ...c, messages: c.messages.map((m, i) => i === idx ? { ...m, undone: true } : m) }
                          : c
                      ));
                    }}
                  >
                    ↩ Undo
                  </button>
                )}

                {/* Message text */}
                {msg.content && <div className="coach-msg assistant">{renderMarkdown(msg.content)}</div>}
              </React.Fragment>
            );
          }
          return null;
        })}

        {/* Streaming text */}
        {streamingText && (
          <div className="coach-msg assistant">{renderMarkdown(streamingText)}</div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingText && (
          <div className="coach-typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}

        {/* Error */}
        {error && <div className="coach-error">{error}</div>}

        <div ref={messagesEndRef} style={{ height: '1px', paddingBottom: '2rem', flexShrink: 0 }} />
      </div>

      {/* Input */}
      <div className="coach-input-area">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi al tuo coach..."
          rows={1}
          disabled={isLoading}
        />
        <button className="coach-send-btn" onClick={handleSend} disabled={isLoading || !inputText.trim()}>
          <Send size={18} />
        </button>
      </div>

      {/* Schedule Preview */}
      <div className="coach-schedule-preview">
        <h4>
          <span>This Week</span>
          <button className="btn-icon" style={{ padding: '2px' }} onClick={() => setShowSchedulePreview(v => !v)}>
            {showSchedulePreview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </h4>
        {showSchedulePreview && daysOfWeek.map(day => {
          const exercises = schedule[day] || [];
          const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          return (
            <div key={day} className="coach-schedule-day">
              <span className="coach-schedule-day-name" style={{ color: day === todayDay ? 'var(--primary)' : undefined, fontWeight: day === todayDay ? 800 : undefined }}>
                {day.slice(0, 3)}
              </span>
              <div className="coach-schedule-exercises">
                {exercises.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Rest</span>
                ) : exercises.map(ex => (
                  <span
                    key={ex.id}
                    className={`coach-schedule-ex-chip ${ex.done ? 'done' : ''} ${highlightedExercises.has(ex.id) ? 'highlight' : ''}`}
                  >
                    {ex.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Memory Panel */}
      {showMemory && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 499 }} onClick={() => setShowMemory(false)} />
          <CoachMemoryPanel
            coachMemory={coachMemory}
            setCoachMemory={setCoachMemory}
            onClose={() => setShowMemory(false)}
          />
        </>
      )}
    </div>
  );
}
