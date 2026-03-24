/**
 * Coach API Service — Handles Claude (Anthropic direct) and OpenRouter communication with tool use
 * Version 2: Complete rewrite with intent detection, modular knowledge base, and body map pattern detection
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ── Provider Detection ────────────────────────────────────────────────────────

export function detectProvider(apiKey) {
  if (apiKey?.startsWith('sk-or-')) return 'openrouter';
  if (apiKey?.startsWith('AIza')) return 'google';
  return 'anthropic';
}

// ── Tool Definitions (Anthropic format — converted for OpenRouter) ────────────

export const coachTools = [
  {
    name: 'modify_exercise',
    description: 'Modify fields of an existing exercise in the current week schedule. Use this to change the name, type, notes, or steps of a specific exercise.',
    input_schema: {
      type: 'object',
      properties: {
        day: { type: 'string', enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], description: "Day of the week in lowercase (e.g. 'monday', 'tuesday')" },
        exerciseId: { type: 'string', description: 'ID of the exercise to modify' },
        fields: {
          type: 'object',
          description: 'Fields to update on the exercise',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['Boxing', 'Strength', 'Running', 'Recovery'] },
            notes: { type: 'string' },
            plannedTime: { type: 'string', description: 'Starting time in HH:mm format, e.g. "17:30"' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['timer', 'manual_timer', 'interval', 'sets', 'text'] },
                  name: { type: 'string' },
                  duration: { type: 'number' },
                  work: { type: 'number' },
                  rest: { type: 'number' },
                  rounds: { type: 'number' },
                  sets: { type: 'number' },
                  reps: { type: 'string' },
                  prepTime: { type: 'number', description: 'Preparation time before this step in seconds, e.g. 30' },
                  instruction: { type: 'string' }
                },
                required: ['id', 'type', 'name']
              }
            }
          }
        }
      },
      required: ['day', 'exerciseId', 'fields']
    }
  },
  {
    name: 'add_exercise',
    description: 'Add a new exercise to a specific day in the current week schedule.',
    input_schema: {
      type: 'object',
      properties: {
        day: { type: 'string', enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], description: "Day of the week in lowercase (e.g. 'monday', 'tuesday')" },
        exercise: {
          type: 'object',
          description: 'The exercise object to add',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['Boxing', 'Strength', 'Running', 'Recovery'] },
            notes: { type: 'string' },
            plannedTime: { type: 'string', description: 'Starting time in HH:mm format, e.g. "14:45"' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['timer', 'manual_timer', 'interval', 'sets', 'text'] },
                  name: { type: 'string' },
                  duration: { type: 'number' },
                  work: { type: 'number' },
                  rest: { type: 'number' },
                  rounds: { type: 'number' },
                  sets: { type: 'number' },
                  reps: { type: 'string' },
                  prepTime: { type: 'number' },
                  instruction: { type: 'string' }
                },
                required: ['type', 'name']
              }
            }
          },
          required: ['name', 'type']
        }
      },
      required: ['day', 'exercise']
    }
  },
  {
    name: 'remove_exercise',
    description: 'Remove an exercise from a specific day.',
    input_schema: {
      type: 'object',
      properties: {
        day: { type: 'string', enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], description: "Day of the week in lowercase (e.g. 'monday', 'tuesday')" },
        exerciseId: { type: 'string', description: 'ID of the exercise to remove' }
      },
      required: ['day', 'exerciseId']
    }
  },
  {
    name: 'replace_exercise',
    description: 'Replace an existing exercise entirely with a new one.',
    input_schema: {
      type: 'object',
      properties: {
        day: { type: 'string', enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], description: "Day of the week in lowercase (e.g. 'monday', 'tuesday')" },
        exerciseId: { type: 'string', description: 'ID of the exercise to replace' },
        newExercise: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['Boxing', 'Strength', 'Running', 'Recovery'] },
            notes: { type: 'string' },
            steps: { type: 'array', items: { type: 'object' } }
          },
          required: ['name', 'type']
        }
      },
      required: ['day', 'exerciseId', 'newExercise']
    }
  },
  {
    name: 'reschedule_exercise',
    description: 'Move an exercise from one day to another.',
    input_schema: {
      type: 'object',
      properties: {
        fromDay: { type: 'string', enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], description: "Day in lowercase (e.g. 'monday')" },
        exerciseId: { type: 'string' },
        toDay: { type: 'string', enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], description: "Day in lowercase (e.g. 'monday')" }
      },
      required: ['fromDay', 'exerciseId', 'toDay']
    }
  },
  {
    name: 'rewrite_week',
    description: 'Completely overwrite the current week schedule with a new one. Use this for major restructuring.',
    input_schema: {
      type: 'object',
      properties: {
        schedule: {
          type: 'object',
          description: 'Full week schedule with keys monday-sunday, each containing an array of exercises.',
          properties: {
            monday: { type: 'array', items: { type: 'object' } },
            tuesday: { type: 'array', items: { type: 'object' } },
            wednesday: { type: 'array', items: { type: 'object' } },
            thursday: { type: 'array', items: { type: 'object' } },
            friday: { type: 'array', items: { type: 'object' } },
            saturday: { type: 'array', items: { type: 'object' } },
            sunday: { type: 'array', items: { type: 'object' } }
          },
          required: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
        }
      },
      required: ['schedule']
    }
  },
  {
    name: 'create_next_week',
    description: 'Create a schedule for the next week (advances the week pointer and sets the schedule).',
    input_schema: {
      type: 'object',
      properties: {
        schedule: {
          type: 'object',
          description: 'Full week schedule for next week.',
          properties: {
            monday: { type: 'array', items: { type: 'object' } },
            tuesday: { type: 'array', items: { type: 'object' } },
            wednesday: { type: 'array', items: { type: 'object' } },
            thursday: { type: 'array', items: { type: 'object' } },
            friday: { type: 'array', items: { type: 'object' } },
            saturday: { type: 'array', items: { type: 'object' } },
            sunday: { type: 'array', items: { type: 'object' } }
          },
          required: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
        }
      },
      required: ['schedule']
    }
  },
  {
    name: 'update_goal',
    description: 'Add, modify, or complete a goal.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'update', 'complete', 'remove'] },
        goalId: { type: 'string', description: 'Required for update/complete/remove' },
        goal: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            type: { type: 'string', enum: ['short', 'long'] },
            targetDate: { type: 'string' }
          }
        }
      },
      required: ['action']
    }
  },
  {
    name: 'update_coach_memory',
    description: 'Store a new observation, preference, or decision in coach memory for future reference.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['preferences', 'patterns', 'decisions', 'progress_notes'] },
        entry: { type: 'string', description: 'The observation or note to store' }
      },
      required: ['category', 'entry']
    }
  },
  {
    name: 'update_skill_level',
    description: 'Update one of the athlete technical skill levels (1-5).',
    input_schema: {
      type: 'object',
      properties: {
        skill: { type: 'string', enum: ['cardio', 'technique', 'footwork', 'defense', 'jab', 'reading'] },
        level: { type: 'number', minimum: 1, maximum: 5 }
      },
      required: ['skill', 'level']
    }
  }
];

// ── Tool Format Conversion ────────────────────────────────────────────────────

function convertToolsToOpenAI(anthropicTools) {
  return anthropicTools.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema }
  }));
}

function convertToolsToGoogle(anthropicTools) {
  return {
    function_declarations: anthropicTools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }))
  };
}

// ── Message Format Conversion ─────────────────────────────────────────────────

/**
 * Internal message format:
 *   { role: 'user'|'assistant', content: string, toolCalls?: [{ id, name, input }] }
 *
 * Convert internal messages → Anthropic API format
 */
function toAnthropicMessages(messages) {
  return messages.map(m => {
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: [
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
          ...m.toolCalls.map(tc => ({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input }))
        ]
      };
    }
    return { role: m.role, content: m.content ?? '' };
  });
}

/**
 * Convert internal messages → OpenAI API format
 * pendingToolResults: if provided, appended after the last assistant-with-toolCalls message
 */
function toOpenAIMessages(systemPrompt, messages, pendingToolResults = null) {
  const result = [{ role: 'system', content: systemPrompt }];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === 'assistant' && m.toolCalls?.length) {
      result.push({
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.input) }
        }))
      });
      // Append tool results right after the assistant message that triggered them
      if (i === messages.length - 1 && pendingToolResults) {
        for (const tr of pendingToolResults) {
          result.push({ role: 'tool', tool_call_id: tr.tool_use_id, content: tr.content });
        }
      }
    } else {
      result.push({ role: m.role, content: m.content ?? '' });
    }
  }
  return result;
}

/**
 * Convert internal messages → Google contents format
 */
function toGoogleMessages(messages) {
  return messages.map(m => {
    const parts = [];
    if (m.content) parts.push({ text: m.content });

    if (m.role === 'assistant' && m.toolCalls?.length) {
      m.toolCalls.forEach(tc => {
        parts.push({ functionCall: { name: tc.name, args: tc.input } });
      });
    }

    if (m.role === 'tool' || m.role === 'function') {
      return {
        role: 'function',
        parts: m.content ? [{ functionResponse: { name: m.tool_name || m.name, response: { content: m.content } } }] : []
      };
    }

    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });
}

// ── System Prompt Builder ────────────────────────────────────────────────────

export function buildSystemPrompt({ profile, schedule, currentWeekId, logs, goals, coachMemory }) {
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayDayNum = new Date().getDay(); // 0=Sun, 4=Thu, 5=Fri, 6=Sat

  const recentLogs = (logs || []).filter(l => l.energy > 0).slice(0, 10);

  const avg = (arr, key) => arr.length > 0 ? (arr.reduce((a, l) => a + (l[key] || 0), 0) / arr.length).toFixed(1) : '-';
  const avgEnergy = avg(recentLogs, 'energy');
  const avgCardio = avg(recentLogs, 'cardio');
  const avgFocus = avg(recentLogs.filter(l => l.focus > 0), 'focus');

  const withSleep = (logs || []).filter(l => l.sleepHours).slice(0, 7);
  const avgSleep = withSleep.length > 0 ? (withSleep.slice(0, 7).reduce((a, l) => a + l.sleepHours, 0) / Math.min(withSleep.length, 7)).toFixed(1) : null;
  const lastWeight = (logs || []).find(l => l.bodyWeight)?.bodyWeight || null;
  const lastSoreness = recentLogs.length > 0 ? recentLogs[0].musclesSoreness : null;
  const recentSoreness = recentLogs.slice(0, 3).map(l => l.musclesSoreness).filter(Boolean);
  const lastSleep = withSleep.length > 0 ? withSleep[0].sleepHours : null;

  // Fatigue signal: last 2 sessions both low energy
  const last2 = recentLogs.slice(0, 2);
  const consecutiveLowEnergy = last2.length === 2 && last2.every(l => l.energy <= 5);

  const scheduleText = Object.entries(schedule || {}).map(([day, exercises]) => {
    if (!exercises || exercises.length === 0) return `  ${day}: Rest`;
    const exList = exercises.map(ex => {
      let desc = `    [${ex.done ? 'DONE' : 'TODO'}] (id:${ex.id}) ${ex.type} — "${ex.name}"`;
      if (ex.notes) desc += ` | Notes: ${ex.notes}`;
      if (ex.steps?.length > 0) desc += ` | ${ex.steps.length} steps`;
      return desc;
    }).join('\n');
    return `  ${day}:\n${exList}`;
  }).join('\n');

  const activeGoals = (goals || []).filter(g => g.status === 'active');
  const goalsText = activeGoals.length > 0
    ? activeGoals.map(g => `  - [${g.type}] "${g.text}"${g.targetDate ? ` (target: ${g.targetDate})` : ''}`).join('\n')
    : '  No active goals set.';

  const memoryText = Object.entries(coachMemory || {}).map(([cat, entries]) => {
    if (!entries || entries.length === 0) return '';
    return `  ${cat.toUpperCase()}:\n${entries.map(e => `    - ${typeof e === 'string' ? e : e.text}`).join('\n')}`;
  }).filter(Boolean).join('\n');

  const historyText = recentLogs.map(log => {
    const day = new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' });
    let line = `  ${log.date} (${day}) [${log.type}] "${log.name || 'Unnamed'}" | Dur: ${log.duration || '-'} | E:${log.energy} C:${log.cardio || '-'} I:${log.intensity || '-'} F:${log.focus || '-'} L:${log.legs || '-'}`;
    if (log.skippedSteps > 0) line += ` | Skipped ${log.skippedSteps} steps`;
    if (log.musclesSoreness) line += ` | Soreness:${log.musclesSoreness}/10`;
    if (log.sleepHours) line += ` | Sleep:${log.sleepHours}h (quality:${log.sleepQuality}/10)`;
    if (log.sparringRounds > 0) line += ` | Sparring:${log.sparringRounds}rnd (gas tank drop:${log.lastRoundDrop}/10)`;
    if (log.distance) line += ` | Distance:${log.distance} Pace:${log.pace || '-'} Time:${log.time || '-'}`;
    if (log.notes) line += ` | "${log.notes}"`;
    return line;
  }).join('\n');

  // Smart flags to surface in system prompt
  const smartFlags = [];
  if (consecutiveLowEnergy) smartFlags.push('⚠️ FATIGUE ALERT: Last 2 sessions both ≤5/10 energy — consider reducing this week\'s intensity.');
  if (lastSoreness >= 8) smartFlags.push('⚠️ HIGH SORENESS: Last session soreness was ' + lastSoreness + '/10 — consider a recovery day swap today.');
  if (lastSleep !== null && lastSleep < 6) smartFlags.push('⚠️ SLEEP DEFICIT: Last night was only ' + lastSleep + 'h — reduce intensity for today\'s session.');
  if (todayDayNum === 5 || todayDayNum === 6 || todayDayNum === 0) smartFlags.push('📅 END OF WEEK: It\'s ' + todayDay + ' — good time to review this week and plan next week if needed.');

  const weekDoneCount = Object.values(schedule || {}).flat().filter(e => e.done).length;
  const weekTotalCount = Object.values(schedule || {}).flat().length;
  const weekCompletionLine = weekTotalCount > 0 ? `Completion this week: ${weekDoneCount}/${weekTotalCount} exercises done` : '';

  return `You are an expert boxing coach embedded inside the athlete's training app. You speak the same language as the athlete (Italian if they write in Italian, English if they write in English). Be direct and act like a real coach — not an assistant.

═══ COACHING RULES (non-negotiable) ═══
1. ACT FIRST, explain after. NEVER apologize. NEVER use long intros or filler phrases. Go straight to the point.
2. Be EXTREMELY CONCISE: 1-2 sentences for check-ins, skip the niceties.
3. ALWAYS call update_coach_memory when you detect any preference, dislike, pattern, or milestone. This is mandatory.
4. When an athlete reports a problem with an exercise → immediately replace or reschedule it.
5. When creating/modifying exercises, ALWAYS include structured steps (timer/interval/sets/text types) so the guided timer works.
6. Step IDs: 's1', 's2', etc. Exercise IDs: use Date.now() as string. Durations always in seconds.
7. GOALS: Always consider the user's short/long-term goals when planning, even if they have no specific target date.
8. STRETCHING: Always include a 'Recovery' exercise or 'text' steps at the end of workouts with contextual stretching targeting the specific muscles used that day.
9. LOCATIONS: If the user has defined training locations/equipment, plan workouts strictly based on the equipment available at their chosen location.
11. TIMING: Always set the 'plannedTime' field in HH:mm format (e.g. "17:30"). Never omit it if a specific time is mentioned. If no exact time is given, use a reasonable default based on context (morning session → "09:00", afternoon → "16:00", evening → "19:00").
12. GYM vs LOCATION (Fixed Courses):
    - If a location has a schedule loaded in the profile, it's a Gym providing FIXED courses. If you plan a course from that schedule, DO NOT attempt to "structure" or "add steps" to it.
    - You MUST include the course's duration in the 'notes' field (e.g., "60 min"). If their schedule JSON has a duration, use it. The app expects this text to calculate the Average Time dynamically.
    - If a location has NO schedule, it's just a place. You ARE responsible for providing a full, structured workout with steps.
13. MEMORY: Be highly selective. Only store meaningful insights, enduring preferences, or significant milestones. Do not log raw session summaries.
14. MULTIPLE TOOLS: If a user request requires multiple changes (e.g. remove X, add Y, and modify Z), you MUST call all appropriate tools in the SAME response. Do not perform changes one by one.

═══ SMART TRIGGERS (act on these automatically) ═══
- Energy ≤5 reported → lighten tomorrow's session, store in patterns memory
- Same exercise skipped/disliked twice → replace it, store preference in memory
- Soreness ≥8 → swap next session to recovery, store in patterns
- Sleep <6h mentioned → reduce today's intensity
- Thursday or later in week → proactively offer next week planning
- Athlete mentions a goal → use update_goal to save it immediately

You are the coach for an athlete who is ${profile.age} years old with ${profile.experience} of experience. Use this information to calibrate your technical authority. Be the professional expert they need to prepare for their first competition.

═══ ACTIVE FLAGS ═══
${smartFlags.length > 0 ? smartFlags.join('\n') : 'None.'}
TODAY: ${today} (${todayDay})
CURRENT WEEK: ${currentWeekId}

═══ ATHLETE PROFILE ═══
Age: ${profile.age} | Weight: ${lastWeight ? lastWeight + 'kg' : profile.weight + 'kg'} | Height: ${profile.height}cm
Stance: ${profile.stance} | Experience: ${profile.experience}
Style: ${profile.style}${profile.primaryPunch ? ` | Primary punch: ${profile.primaryPunch}` : ''}
Resting HR: ${profile.restingHR}bpm${profile.vo2max ? ` | VO2max: ${profile.vo2max}` : ''}

Technical Levels (1-5):
  Cardio: ${profile.levels.cardio} | Technique: ${profile.levels.technique} | Footwork: ${profile.levels.footwork}
  Defense: ${profile.levels.defense} | Jab: ${profile.levels.jab} | Ring IQ: ${profile.levels.reading}

Locations & Equipment:
${profile.locations && profile.locations.length > 0 ? profile.locations.map(l => {
  let text = '  - ' + l.name + ': ' + l.equipment;
  if (l.schedule && l.schedule.length > 0) {
    text += ' (Schedule: ' + JSON.stringify(l.schedule) + ')';
  }
  return text;
}).join('\n') : '  None specified.'}

═══ CURRENT STATE ═══
Recent averages (${recentLogs.length} sessions): Energy ${avgEnergy}/10, Cardio ${avgCardio}/10, Focus ${avgFocus}/10
${avgSleep ? `Avg sleep: ${avgSleep}h/night` : ''}
${recentSoreness.length > 0 ? `Soreness trend (last ${recentSoreness.length}): ${recentSoreness.join(' → ')}/10` : ''}
${lastWeight ? `Last weight: ${lastWeight}kg` : ''}
${(() => { const withSkips = recentLogs.filter(l => l.skippedSteps > 0); return withSkips.length > 0 ? `Timer discipline: ${withSkips.length}/${recentLogs.length} recent sessions had skipped steps` : ''; })()}

═══ ACTIVE GOALS ═══
${goalsText}

═══ THIS WEEK'S SCHEDULE (${currentWeekId}) ═══
${weekCompletionLine}
${scheduleText}

═══ RECENT SESSION HISTORY ═══
${historyText || '  No sessions logged yet.'}

${memoryText ? `═══ COACH MEMORY (your persistent knowledge about this athlete) ═══\n${memoryText}` : ''}`;
}

// ── Stream Parsers ────────────────────────────────────────────────────────────

async function parseAnthropicStream(reader, { onTextChunk, onToolUse }) {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let toolUses = [];
  let currentToolUse = null;
  let currentToolInput = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);

        if (event.type === 'content_block_start') {
          if (event.content_block?.type === 'tool_use') {
            currentToolUse = { id: event.content_block.id, name: event.content_block.name, input: {} };
            currentToolInput = '';
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta?.type === 'text_delta') {
            fullText += event.delta.text;
            if (onTextChunk) onTextChunk(event.delta.text);
          } else if (event.delta?.type === 'input_json_delta') {
            currentToolInput += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUse) {
            try { currentToolUse.input = JSON.parse(currentToolInput); } catch { currentToolUse.input = {}; }
            toolUses.push(currentToolUse);
            if (onToolUse) onToolUse(currentToolUse);
            currentToolUse = null;
            currentToolInput = '';
          }
        }
      } catch {}
    }
  }

  return { text: fullText, toolUses };
}

async function parseOpenAIStream(reader, { onTextChunk, onToolUse }) {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let toolUses = [];
  const toolCallMap = {}; // index → { id, name, arguments }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();

      if (data === '[DONE]') {
        // Finalize all accumulated tool calls
        for (const tc of Object.values(toolCallMap)) {
          if (!tc.name) continue;
          try {
            const parsed = { id: tc.id, name: tc.name, input: JSON.parse(tc.arguments || '{}') };
            toolUses.push(parsed);
            if (onToolUse) onToolUse(parsed);
          } catch {}
        }
        continue;
      }

      try {
        const event = JSON.parse(data);
        const delta = event.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          fullText += delta.content;
          if (onTextChunk) onTextChunk(delta.content);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallMap[idx]) toolCallMap[idx] = { id: '', name: '', arguments: '' };
            if (tc.id) toolCallMap[idx].id = tc.id;
            if (tc.function?.name) toolCallMap[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallMap[idx].arguments += tc.function.arguments;
          }
        }
      } catch {}
    }
  }

  return { text: fullText, toolUses };
}

async function parseGoogleStream(reader, { onTextChunk, onToolUse }) {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let toolUses = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data) continue;

      try {
        const chunk = JSON.parse(data);
        const parts = chunk.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
          if (part.text) {
            fullText += part.text;
            if (onTextChunk) onTextChunk(part.text);
          }
          if (part.functionCall) {
            const tc = {
              id: `gc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              name: part.functionCall.name,
              input: part.functionCall.args || {}
            };
            toolUses.push(tc);
            if (onToolUse) onToolUse(tc);
          }
        }
      } catch (e) {
        // Ignore JSON parse errors for empty/malformed lines
      }
    }
  }

  return { text: fullText, toolUses };
}

// ── API Communication ────────────────────────────────────────────────────────

export async function sendCoachMessage({
  apiKey, model, systemPrompt, messages,
  onTextChunk, onToolUse, onComplete, onError
}) {
  const provider = detectProvider(apiKey);

  try {
    let response;

    if (provider === 'openrouter') {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'boxing-planner-app',
          'X-Title': 'Boxing Planner'
        },
        body: JSON.stringify({
          model,
          messages: toOpenAIMessages(systemPrompt, messages),
          tools: convertToolsToOpenAI(coachTools),
          stream: true
        })
      });
    } else if (provider === 'google') {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: toGoogleMessages(messages),
            tools: [convertToolsToGoogle(coachTools)]
          })
        }
      );
    } else {
      response = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: toAnthropicMessages(messages),
          tools: coachTools,
          stream: true
        })
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `API Error ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error?.message || parsed.error?.code || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const parser = 
      provider === 'openrouter' ? parseOpenAIStream : 
      provider === 'google' ? parseGoogleStream : 
      parseAnthropicStream;
    const result = await parser(reader, { onTextChunk, onToolUse });

    if (onComplete) onComplete(result);
    return result;
  } catch (error) {
    if (onError) onError(error);
    throw error;
  }
}

/**
 * Send tool results back to continue the conversation.
 * messages: internal format, last item must be the assistant message with toolCalls
 * toolResults: [{ tool_use_id, content }]
 */
export async function sendToolResults({
  apiKey, model, systemPrompt, messages, toolResults,
  onTextChunk, onToolUse, onComplete, onError
}) {
  const provider = detectProvider(apiKey);

  try {
    let response;

    if (provider === 'openrouter') {
      // For OpenAI: tool results appended as 'tool' role messages after the assistant message
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'boxing-planner-app',
          'X-Title': 'Boxing Planner'
        },
        body: JSON.stringify({
          model,
          messages: toOpenAIMessages(systemPrompt, messages, toolResults),
          tools: convertToolsToOpenAI(coachTools),
          stream: true
        })
      });
    } else if (provider === 'google') {
      const toolResultMessage = {
        role: 'function',
        parts: toolResults.map(tr => ({
          functionResponse: {
            name: tr.tool_name,
            response: { content: tr.content }
          }
        }))
      };
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [...toGoogleMessages(messages), toolResultMessage],
            tools: [convertToolsToGoogle(coachTools)]
          })
        }
      );
    } else {
      // For Anthropic: tool results go as a 'user' message with tool_result content
      const toolResultMessage = {
        role: 'user',
        content: toolResults.map(tr => ({
          type: 'tool_result',
          tool_use_id: tr.tool_use_id,
          content: tr.content
        }))
      };
      response = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [...toAnthropicMessages(messages), toolResultMessage],
          tools: coachTools,
          stream: true
        })
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `API Error ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error?.message || parsed.error?.code || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const parser = 
      provider === 'openrouter' ? parseOpenAIStream : 
      provider === 'google' ? parseGoogleStream : 
      parseAnthropicStream;
    const result = await parser(reader, { onTextChunk, onToolUse });

    if (onComplete) onComplete(result);
    return result;
  } catch (error) {
    if (onError) onError(error);
    throw error;
  }
}
