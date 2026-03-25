/**
 * Coach API Service — Version 2
*/

import { compressAvailability, detectSkipPatterns } from '../components/AvailabilityCalendar';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function detectProvider(apiKey) {
  if (apiKey?.startsWith('sk-or-')) return 'openrouter';
  if (apiKey?.startsWith('AIza')) return 'google';
  return 'anthropic';
}

// ── Part 1 — Intent Detection & Helpers ────────────────────────────────────────

function getDaysSinceLastLog(logs) {
  if (!logs || logs.length === 0) return 999;
  return Math.floor((new Date() - new Date(logs[0].date)) / 86400000);
}

function detectWeeklyOverload(logs) {
  const week = (logs || []).filter(l => {
    return Math.floor((new Date() - new Date(l.date)) / 86400000) <= 7;
  });
  if (week.length < 2) return false;
  const avgEnergy = week.reduce((a, l) => a + (l.energy || 0), 0) / week.length;
  const highSoreness = week.some(l => (l.musclesSoreness || 0) >= 8);
  return avgEnergy <= 4.5 || highSoreness;
}

function detectGoalReached(logs, goals) {
  return false;
}

function detectAnalysisTopic(messages) {
  const text = (messages || []).slice(-2).map(m => m.content || '').join(' ').toLowerCase();
  if (/corsa|running|pace|distanza|km|roadwork/.test(text)) return 'running';
  if (/energia|energy|stanchez|affatic/.test(text)) return 'energy';
  if (/cardio|fiato|resistenza/.test(text)) return 'cardio';
  if (/sonno|sleep|riposo/.test(text)) return 'sleep';
  if (/peso|weight|bilancia/.test(text)) return 'weight';
  return 'general';
}

export function detectIntent(messages, { schedule, logs, weeks, currentWeekId }) {
  const lastMsgs = (messages || []).slice(-4);
  const text = lastMsgs.map(m => m.content || '').join(' ').toLowerCase();

  // ── Proactive (conversation open, no user messages) ──
  if (!messages || messages.length === 0) {
    const now = new Date();
    const isSundayEvening = now.getDay() === 0 && now.getHours() >= 18;
    if (isSundayEvening) return 'PROACTIVE_SUNDAY';
    const daysSinceLast = getDaysSinceLastLog(logs);
    if (daysSinceLast >= 5) return 'PROACTIVE_INACTIVITY';
    if (detectWeeklyOverload(logs)) return 'PROACTIVE_OVERLOAD';
    if (detectGoalReached(logs)) return 'PROACTIVE_GOAL';
    return 'COACH_CHAT';
  }

  // ── HARD INTENTS ──
  if (/(?:mi fa male|ho male al|dolore|lesion|infortun|strappo|stiramento|gonfi[oa]|bloccat[oa])\b/.test(text)
    && /(?:polso|spalla|ginocch|caviglia|costol|schiena|collo|gomito|mano|dito|piede|tibia|anca)/.test(text))
    return 'INJURY';
  if (/(?:infortun|lesion|mi sono fatt[oa] male|non riesco a muovere)/.test(text))
    return 'INJURY';

  if (/(?:gara|match|combattimento|competizione|salgo sul ring|taper|peak week)/.test(text))
    return 'TAPER';
  if (/tra \d+\s*settiman[ae]/.test(text) && /(?:gara|match|combatt)/.test(text))
    return 'TAPER';

  if (/(?:esaurit|sfinit|overtraining|non ce la faccio|tropp[oa] caric|sono distrutt|ho bisogno di scaric|deload)/.test(text))
    return 'DELOAD';

  if (/(?:settimana prossima|settimana nuova|fammi la scheda|crea la settimana|programma|pianifica|piano di allenamento|prossima settimana)/.test(text))
    return 'PLAN_WEEK';

  if (/(?:rimuovi|aggiungi|sposta|cambia|sostituisci|accorcia|allunga|modifica|togli|metti)\b/.test(text)
    && /(?:session[ei]|esercizi[oa]|giorno|luned|marted|mercoled|gioved|venerd|sabat|domenic|allenament)/.test(text))
    return 'MODIFY_SESSION';

  if (/(?:viaggio|fuori città|trasferta|hotel|sono via|non ho palestra|solo \d+ giorn|settimana corta|settimana ridotta)/.test(text))
    return 'TRAVEL_WEEK';

  if (/(?:confronta|confronto|rispetto a|la scorsa settimana|differenza tra|settimana \d)/.test(text))
    return 'COMPARE_WEEKS';

  if (/(?:migliorat|progress|crescit|nell.ultimo (?:mese|period)|ultim[ei] \d+ settiman)/.test(text))
    return 'ANALYZE_PROGRESS';

  if (
    (/(?:orario|distribu|carico settimana|ha senso|perch[eé] hai messo|posso allenarmi)/.test(text)) ||
    (/(?:tempo|impegno)/.test(text) && /(?:luned|marted|mercoled|gioved|venerd|sabat|domenic)/.test(text))
  ) return 'ANALYZE_SCHEDULE';

  // ── SOFT INTENTS ──
  if (/(?:sto per iniziare|sto per allenar|prima dell.allenam|ho appena finit|appena uscit|come mi regolo|domani alleno)/.test(text))
    return 'REAL_TIME';

  if (/(?:jab|cross|diretto|hook|gancio|uppercut|montante|guardia|difesa|footwork|schivat[ae]|parata|combinazion|slips?|rolls?|pivot|contropied)/.test(text)
    && /(?:come|miglior|lavora|drill|eserciz|tecnica|consiglio)/.test(text))
    return 'TECHNIQUE';

  if (/(?:perch[eé]|causa|problema|mi stanc|mi esaurisc|non riesco|dove sbaglio|cosa non va|come mai)/.test(text))
    return 'DIAGNOSE';

  if (/(?:analisi|statistich|come sto|trend|dati|numeri|andamento)\b/.test(text))
    return 'ANALYZE_STATS';
  if (/(?:corsa|running|pace|energia|cardio|sonno|peso)\b/.test(text)
    && /(?:come|quanto|analiz|trend|media|ultim)\b/.test(text))
    return 'ANALYZE_STATS';

  if (/(?:fa schifo|orribile|pessimo|disastro|deluso|frustrat|demotivat|arrabbiato|non miglioro)/.test(text))
    return 'DIAGNOSE';

  return 'COACH_CHAT';
}

// ── Part 2 — Core Identity ────────────────────────────────────────────────────

function buildCoreIdentity(profile) {
  return `You are an elite boxing S&C coach. 15+ years preparing amateur and pro fighters.
You combine tactical boxing knowledge with NSCA-CSCS scientific rigor.

IDENTITY:
- Think in mesocycles (4-6 wk), microcycles (1 wk), sessions
- Every session targets ONE primary energy system: alactic / lactic / aerobic
- Every week has ONE dominant quality: power, capacity, technique, recovery
- Never two CNS-intensive sessions back-to-back without buffer day
- Match athlete's equipment and locations — never program unavailable gear
- Speak athlete's language (Italian if they write Italian)
- Direct, concise, expert — never generic motivational fluff
- When data shows a problem, name it and fix it immediately

PHILOSOPHY:
- Aerobic base is the foundation — poor Zone 2 = gas in late rounds regardless of technique
- Alactic power (<10s, ATP-PC) = knockout power, first-combo explosiveness
- Lactic capacity (30s-2min, glycolytic) = most boxing-specific system, round-to-round survival
- Technique ACQUISITION before conditioning; technique CONSOLIDATION under fatigue is valid in SPP/Pre-comp only
- Strength for boxing = rotational, anti-rotational, hip-hinge — not bench/biceps
- Neck training is mandatory for concussion prevention
- Sparring is max CNS demand — buffer 48h before AND after
- On same day: if boxing is TECHNICAL → boxing first, strength after; if boxing is CONDITIONING → strength first, boxing after
- Amateur boxing = 3x3min (elite) or 3x2min (novice) — all interval work anchored to these structures
- BODY MAP RULE: Distinguish clearly between normal muscle DOMS/Fatigue (scores 1-6) and actual injury risks (scores 8-10).`;
}

// ── Part 3 — Athlete Snapshot ──────────────────────────────────────────────────

function detectBodyMapPatterns(logs) {
  const recent = (logs || []).slice(0, 10);
  const areaCount = {};

  recent.forEach(log => {
    if (!log.bodyMap) return;
    Object.entries(log.bodyMap).forEach(([area, data]) => {
      if (data.intensity >= 6) { // Focus solo da 6 in su per non ingolfare
        if (!areaCount[area]) areaCount[area] = { label: data.label, count: 0, maxIntensity: 0, dates: [], intensities: [] };
        areaCount[area].count++;
        areaCount[area].maxIntensity = Math.max(areaCount[area].maxIntensity, data.intensity);
        areaCount[area].dates.push(log.date);
        areaCount[area].intensities.push(data.intensity);
      }
    });
  });

  const recurring = Object.values(areaCount).filter(a => a.count >= 2);
  if (recurring.length === 0) return '';

  const lines = recurring.map(a => {
    if (a.maxIntensity >= 8) {
      return `  🚨 INJURY RISK: ${a.label} (intensities: ${a.intensities.join(', ')}) — dates: ${a.dates.join(', ')} → Reduce load heavily. Possible injury.`;
    } else {
      return `  ℹ️ FATIGUE/DOMS: ${a.label} (intensities: ${a.intensities.join(', ')}) — dates: ${a.dates.join(', ')} → Normal muscle soreness/fatigue. Athlete simply felt the work. No major modifications needed.`;
    }
  });

  return `BODY MAP PATTERNS:\n${lines.join('\n')}`;
}

function buildAthleteSnapshot(profile, logs, availability, locations, weeks, currentWeekId) {
  const recent = (logs || []).filter(l => l.energy > 0).slice(0, 7);
  const last = recent[0];
  const avg = (key) => recent.length > 0
    ? (recent.reduce((a, l) => a + (l[key] || 0), 0) / recent.length).toFixed(1)
    : '-';

  const withWeight = logs.filter(l => l.bodyWeight);
  const withSleep = logs.filter(l => l.sleepHours);
  const lastWeight = withWeight[0]?.bodyWeight || profile.weight;
  const avgSleep = withSleep.length > 0
    ? (withSleep.slice(0, 7).reduce((a, l) => a + l.sleepHours, 0) / Math.min(withSleep.length, 7)).toFixed(1)
    : null;

  const daysSinceLast = getDaysSinceLastLog(logs);
  const consecutiveLowEnergy = recent.length >= 3 && recent.slice(0, 3).every(l => l.energy <= 5);
  const highSoreness = last?.musclesSoreness >= 8;

  const bodyMapAlerts = detectBodyMapPatterns(logs);

  const avgE = parseFloat(avg('energy'));
  const safeAvgEnergy = isNaN(avgE) ? 5 : avgE;
  const rawFatigue = (
    (10 - safeAvgEnergy) * 0.35 +
    (last?.musclesSoreness || 0) * 0.25 +
    (avgSleep ? Math.max(0, 8 - parseFloat(avgSleep)) * 0.4 : 0) +
    (consecutiveLowEnergy ? 1.5 : 0) +
    (daysSinceLast <= 1 ? 0.5 : 0)
  );
  const fatigueScore = Math.min(10, rawFatigue).toFixed(1);

  return `═══ ATHLETE SNAPSHOT ═══
Profile: ${profile.age}y · ${lastWeight}kg · ${profile.height}cm · ${profile.stance}
Experience: ${profile.experience} | Style: ${profile.style} | Primary: ${profile.primaryPunch}
Resting HR: ${profile.restingHR}bpm${profile.vo2max ? ` | VO2max: ${profile.vo2max}` : ''}

Levels (1-5): Cardio:${profile.levels?.cardio} | Tech:${profile.levels?.technique} | Footwork:${profile.levels?.footwork} | Defense:${profile.levels?.defense} | Jab:${profile.levels?.jab} | Ring IQ:${profile.levels?.reading}

State (last ${recent.length} sessions):
  Avg Energy:${avg('energy')}/10 | Avg Cardio:${avg('cardio')}/10 | Avg Focus:${avg('focus')}/10
  ${avgSleep ? `Avg Sleep: ${avgSleep}h` : 'No sleep data'} | Last soreness: ${last?.musclesSoreness || '-'}/10
  Days since last session: ${daysSinceLast}

FATIGUE: ${fatigueScore}/10 ${parseFloat(fatigueScore) >= 7 ? '⚠️ HIGH' : parseFloat(fatigueScore) >= 5 ? '⚡ MODERATE' : '✅ RECOVERED'}
  Formula: (10-avgEnergy)*0.35 + lastSoreness*0.25 + sleepDebt*0.4 + lowEnergyStreak*1.5 + backToBack*0.5

${consecutiveLowEnergy ? '🚨 3+ sessions energy ≤5 — DELOAD REQUIRED\n' : ''}${highSoreness ? `🚨 Soreness ${last.musclesSoreness}/10 — reduce volume tomorrow\n` : ''}${daysSinceLast >= 5 ? `⚠️ ${daysSinceLast} days inactive — assess readiness\n` : ''}${bodyMapAlerts}
Locations:
${profile.locations?.length > 0
      ? profile.locations.map(l => `  ${l.name}: ${l.equipment}${l.schedule ? ' [FIXED COURSES — do not modify UNLESS deload/injury]' : ''}`).join('\n')
      : '  No locations — ask athlete before programming equipment work'}
${profile.chronotype ? `
Scheduling Context:
  Chronotype: ${profile.chronotype}, functional after ${profile.wakeupRampMinutes || 60}min, job load: ${profile.jobLoad || 'unknown'}` : ''}
${availability && Object.keys(availability).length > 0 ? `  Availability this week: ${compressAvailability(availability, locations || profile.locations || [], profile)}` : ''}
${(() => {
      const patterns = detectSkipPatterns(logs, weeks, currentWeekId);
      return patterns.length > 0 ? `  Skip patterns: ${patterns.join(', ')}` : '';
    })()}`;
}

// ── Part 4 — Week & Logs ──────────────────────────────────────────────────────

function buildCurrentWeek(schedule, currentWeekId) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const lines = days.map(day => {
    const exs = schedule[day] || [];
    if (exs.length === 0) return `  ${day}: REST`;
    return `  ${day}:\n` + exs.map(ex =>
      `    [${ex.done ? 'DONE' : 'TODO'}] (id:${ex.id}) ${ex.type} — "${ex.name}"${ex.plannedTime ? ` @ ${ex.plannedTime}` : ''}${ex.notes ? ` | ${ex.notes}` : ''}`
    ).join('\n');
  }).join('\n');
  return `═══ CURRENT WEEK (${currentWeekId}) ═══\n${lines}`;
}

function buildRecentLogs(logs) {
  const recent = (logs || []).filter(l => l.energy > 0).slice(0, 7);
  if (recent.length === 0) return '═══ RECENT LOGS ═══\n  No sessions logged.';
  const lines = recent.map(l => {
    let line = `  ${l.date} [${l.type}] "${l.name}" | ${l.duration || '-'}min | E:${l.energy} C:${l.cardio || '-'} I:${l.intensity || '-'} F:${l.focus || '-'} L:${l.legs || '-'}`;
    if (l.musclesSoreness) line += ` | Sore:${l.musclesSoreness}`;
    if (l.sleepHours) line += ` | Sleep:${l.sleepHours}h`;
    if (l.skippedSteps > 0) line += ` | Skipped:${l.skippedSteps}`;
    if (l.bodyMap) {
      // Changed label da Pain a BodyMap per i valori sotto l'8 per non allarmare l'AI
      const hotspots = Object.values(l.bodyMap).filter(b => b.intensity >= 6);
      if (hotspots.length > 0) line += ` | BodyMap: ${hotspots.map(b => `${b.label}(${b.intensity})`).join(',')}`;
    }
    if (l.notes) line += ` | "${l.notes.slice(0, 80)}"`;
    return line;
  });
  return `═══ RECENT LOGS ═══\n${lines.join('\n')}`;
}

// ── Part 5 — S&C Knowledge Base ───────────────────────────────────────────────

function buildSandCKnowledge() {
  return `═══ BOXING S&C KNOWLEDGE BASE ═══

── ENERGY SYSTEMS ──

ALACTIC (<10s | ATP-PC | KO power, explosive starts):
  • Heavy bag power: 5-6 MAXIMAL shots, full stop, 90-120s rest × 5-6 sets (beginners), 8 sets (advanced)
  • Explosive combo bursts: 3-punch max combo × 8 reps, 2min rest × 5
  • Sprint: 6" all-out / 54" walk × 8-10 reps
  • Med ball rotational throw: 4×8/side, 2min rest
  • Plyo push-ups: 4×5, full reset between reps
  Selection: athlete has jab level <3, lacks KO power, slow first combo
  Recovery: 48h minimum before next alactic session
  Progression: add 1 set/week for 3 weeks, then reset with heavier resistance

LACTIC (30s-2min | glycolytic | round endurance, between-round recovery):
  • Boxing intervals 3×2 format: 2min hard bag/pads / 1min active rest × 6 rounds (novice match simulation)
  • Boxing intervals 3×3 format: 3min hard bag/pads / 1min active rest × 4-6 rounds (elite match simulation)
  • Pyramid: 30/30 → 45/30 → 60/30 → 90/30 → 60/30 → 45/30 → 30/30, 2min between sets
  • Fighter circuit: 6-8 stations × 45s/15s × 3 circuits (bag/shadow/skip/sprawl/push-up/squat jump/plank/ladder)
  • Gas Tank Builder: 3min HARD bag / 1min active shadow × 6 rounds
  Selection: gases in rounds 3-4, cardio <3, poor between-round recovery
  Recovery: 36-48h before next high-lactic session
  Progression: add 1 round/week OR reduce rest 10s/week (not both)

AEROBIC (>3min | oxidative | engine size, recovery speed):
  • Zone 2 roadwork: 30-50min at conversational pace (full sentences)
  • Aerobic shadow: 6-8 rds × 3min/1min @ 65-70% HRmax (structure below)
  • Jump rope continuous: 15-20min steady
  • Fartlek boxing run: 40min with 6-8 random 30s surges
  • LOW-IMPACT alternatives: cycling, swimming, shadow boxing (for athletes with lower limb pain)
  Selection: high resting HR, low VO2max, fatigue accumulates over sessions, GPP phase
  Recovery: 24h sufficient for low-intensity
  Progression: add 5min/week to total duration (cap at 50min for amateurs)

SHADOW BOXING ROUND STRUCTURE (use when programming shadow sessions):
  R1-2: Jab only + footwork, lateral movement, distance management
  R3-4: Add cross, focus on weight transfer and hip rotation
  R5-6: Full combinations, work ring cutting and angles
  R7-8: Defense emphasis — slips, rolls, pivots, counter combinations

── STRENGTH FOR BOXING ──

Rotational power: Landmine rotation 4×8/side | Cable woodchop 4×10/side | Med ball rotational slam 4×8/side
Hip hinge: KB swing 5×10 | RDL 4×6 | Single-leg RDL 3×8/side | Broad jump 4×5
Anti-rotation: Pallof press 3×12/side | Suitcase carry 3×20m/side | Dead bug 3×8/side
Pulling/guard: Band pull-apart 4×15 | Face pull 3×15 | TRX row 3×12
Upper push: Explosive push-up 4×8 | Push-up variations 3×12
Neck (MANDATORY): Neck flexion/extension/lateral isometric holds 3×10s each direction, 2-3×/week

── PERIODIZATION ──

GPP (4-6 wk): Build aerobic base, movement quality, general strength
  Intensity 60-70% | Volume HIGH
  Week: 2× aerobic + 1× general strength + 1-2× technical boxing + 1× active recovery
  Progression: +5-10% aerobic volume/week

SPP (4-6 wk): Boxing-specific conditioning, lactic capacity, power
  Intensity 70-85% | Volume MODERATE-HIGH
  Week: 1× alactic + 1× lactic + 1× aerobic maintenance + 1-2× technical boxing + 1× strength
  Technique consolidation under controlled fatigue is valid here
  Progression: increase lactic density, add 1 alactic session

PRE-COMP (3-4 wk): Sharpen skills, maintain fitness, reduce injury risk
  Intensity 80-90% boxing work | Volume DECREASING
  Week: 2× hard sparring/technical max + 1× lactic maintenance + 1× aerobic easy
  Minimal strength (maintenance only). Priority: ring time > conditioning
  Progression: reduce volume 10%/week, maintain intensity

TAPER (1-2 wk pre-competition):
  Cut volume 40-60%, keep intensity 90%+
  Last hard session 5-7 days before. No new exercises.
  Last sparring 7-10 days before. Light tech only final 3 days.

DELOAD (1 wk every 4-6 wk, or fatigue score >7):
  Volume -40-50% | Intensity -20-30%
  Keep all session types but shorten. Focus technique and recovery.

── LOAD BALANCE RULES ──
1. Never alactic + lactic on consecutive days
2. Sparring: 48h buffer before AND after any hard CNS session
3. Minimum 1 full rest day per week
4. Fixed gym courses: build around them. ONLY replace if deload/injury state
5. Roadwork can go before/after almost anything (low-impact)
6. High load Fri/Sat → Sunday must be rest/mobility
7. If body map shows recurring INJURY risks (8+) in lower limbs → replace running with low-impact aerobic. (Ignore DOMS 1-7).`;
}

// ── Part 6 — Conditional Modules ──────────────────────────────────────────────

function buildLastFourWeeks(weeks, currentWeekId) {
  if (!weeks || !currentWeekId) return '';
  const [y, w] = currentWeekId.split('-W').map(Number);
  const pastWeeks = [];
  for (let i = 1; i <= 4; i++) {
    let pw = w - i, py = y;
    if (pw < 1) { pw += 52; py--; }
    const wId = `${py}-W${pw.toString().padStart(2, '0')}`;
    if (weeks[wId]) pastWeeks.push({ id: wId, schedule: weeks[wId] });
  }
  if (pastWeeks.length === 0) return '═══ PAST 4 WEEKS ═══\n  No history.';

  const lines = pastWeeks.map(({ id, schedule }) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const sessions = days.flatMap(d => (schedule[d] || []).map(ex =>
      `    ${d.slice(0, 3)}: [${ex.done ? '✓' : '○'}] ${ex.type} — "${ex.name}"`
    ));
    const done = days.flatMap(d => schedule[d] || []).filter(e => e.done).length;
    const total = days.flatMap(d => schedule[d] || []).length;
    return `  ${id} (${done}/${total} done):\n${sessions.join('\n')}`;
  });
  return `═══ PAST 4 WEEKS ═══\n${lines.join('\n\n')}`;
}

function buildPeriodizationState(coachMemory) {
  const p = coachMemory?.periodization;
  if (!p) return `═══ PERIODIZATION ═══
  No mesocycle tracked. After creating this week, use update_coach_memory (category: decisions) to save state.
  Format: "PERIODIZATION: phase=GPP, week=1, totalWeeks=4, dominantQuality=aerobic_base, nextWeekFocus=increase_volume_10pct"`;

  const rules = {
    GPP: 'Increase aerobic volume 5-10%/week. Keep intensity 60-70%. Add general strength.',
    SPP: 'Increase lactic density. Add 1 alactic session. Maintain aerobic. Allow technique under fatigue.',
    PRE_COMP: 'Reduce volume 10%/week. Maintain intensity. Prioritize ring time.',
    TAPER: 'Cut volume 40-60%. Keep intensity. No new movements.',
    DELOAD: 'All volumes -40%. Technique and recovery focus.'
  };

  return `═══ PERIODIZATION ═══
  Phase: ${p.phase} | Week ${p.weekInCycle}/${p.totalWeeks}
  Dominant quality: ${p.dominantQuality} | Next week: ${p.nextWeekFocus}
  Updated: ${p.updatedAt}
  RULE: ${rules[p.phase] || 'Unknown phase'}`;
}

function buildPlanningRules(profile, schedule) {
  const hasFixed = profile.locations?.some(l => l.schedule?.length > 0);
  return `═══ PROGRAMMING RULES ═══
1. FIXED COURSES: ${hasFixed
      ? 'Athlete has gym courses. DO NOT modify them. Build around them. Replace ONLY if deload/injury.'
      : 'No fixed courses. You own the full week.'}
2. PROGRESSION: Each week must differ from the last. Check past 4 weeks. Never repeat same structure.
3. EQUIPMENT: Only program what athlete has. Available: ${profile.locations?.map(l => `${l.name}: ${l.equipment}`).join(' | ') || 'Unknown — ASK'}
4. EVERY SESSION MUST HAVE: clear primary objective in name, correct energy system for phase, warm-up/cool-down steps, realistic duration. Step durations always in seconds.
5. WEEKLY BALANCE (adapt to available days):
   High commitment (5-6d): 1-2× tech boxing + 1× aerobic + 1× lactic or alactic + 1× strength + 1× recovery
   Moderate (3-4d): 1× tech boxing + 1× aerobic + 1× conditioning + 1× recovery
6. BODY MAP: Check recent logs. If there are severe INJURY alerts (8+/10) in lower limbs → replace running with low-impact alternatives. Ignore standard DOMS (≤7).
7. After creating week, ALWAYS save periodization via update_coach_memory.
8. Exercise IDs: use Date.now().toString(). Durations in seconds.`;
}

function buildInjuryModule() {
  return `═══ INJURY PROTOCOL ═══
⚠️ FIRST RESPONSE MUST BE: "Consiglio di farti vedere da un fisioterapista sportivo per una diagnosi precisa."
Only THEN provide training modifications as interim measure while waiting for professional assessment.

RULES:
- NEVER suggest pushing through pain
- Remove ALL exercises loading injured area
- Find substitutes maintaining fitness on uninjured areas
- Save injury to coach memory immediately

SUBSTITUTION GUIDE (interim modifications only):
  HAND/WRIST: Remove bag/pad/resistance shadow → Keep running, footwork, core, legs, shadow no-impact
  SHOULDER: Remove punching, push, overhead → Keep running, legs, core, footwork
  KNEE: Remove running, rope, squats, lateral footwork → Keep upper tech, seated bag, upper strength
  LOWER BACK: Remove heavy rotation, loaded hinge → Keep upper body, light tech, McGill Big 3, walking
  RIB/CORE: Remove rotation, sparring, heavy bag → Keep running, legs, straight-plane upper
  SHIN/FOOT/ANKLE (from body map): Reduce running frequency/volume, switch to cycling/shadow/rope if tolerated

ALWAYS save to memory: injury area, date, severity, modifications applied.`;
}

function buildDeloadModule(logs) {
  const recent = (logs || []).filter(l => l.energy > 0).slice(0, 5);
  const avgEnergy = recent.length > 0
    ? (recent.reduce((a, l) => a + l.energy, 0) / recent.length).toFixed(1) : '-';
  return `═══ DELOAD PROTOCOL ═══
Avg energy last ${recent.length} sessions: ${avgEnergy}/10
${recent.some(l => l.musclesSoreness >= 7) ? '⚠️ High soreness in recent logs' : ''}

RULES:
- Volume -40-50%, intensity -20-30%
- Keep session frequency (shorter/easier, don't skip)
- Technical boxing only — no conditioning, no heavy strength
- Duration: 1 week standard, 2 weeks if cumulative

TEMPLATE:
  Mon: 20min easy shadow + mobility
  Tue: 25min Zone 2 easy run/bike (conversational)
  Wed: REST or gentle mobility
  Thu: 20min light technical bag at 60%
  Fri: 20min aerobic shadow + stretching
  Sat-Sun: REST / light walk

After deload: re-check energy/soreness before resuming. Save deload to memory.`;
}

function buildTaperModule(logs, goals) {
  const comp = (goals || []).find(g =>
    /gara|competizione|match|combattimento/i.test(g.text) && g.targetDate);
  const daysTo = comp?.targetDate
    ? Math.ceil((new Date(comp.targetDate) - new Date()) / 86400000) : null;

  return `═══ TAPER PROTOCOL ═══
${daysTo ? `Days to competition: ${daysTo}` : 'Competition date: ASK athlete if not set'}
${comp ? `Goal: "${comp.text}"` : ''}

PHASES:
  -3 weeks: Volume -20%. Intensity maintained. Last hard sparring.
  -2 weeks: Volume -40%. Short sharp sessions. Technical sharpening.
  -1 week: Volume -60%. Light technical only. Sleep 9+h. Mental prep.
  Final 3 days: Shadow + light pads only. No bag/sparring.

RULES:
- Cut VOLUME, never intensity — sharp athlete needs sharp sessions
- Last sparring 7-10 days before
- No new techniques or exercises
- Weight cut if needed: start 3 weeks out, never crash
- No heavy legs in final week
- OVERRIDE fixed courses in taper — replace with technical/light work

MISTAKES TO CATCH: over-training "to feel ready", sparring too close, drastic diet change.`;
}

function buildAnalysisModule(logs, topic) {
  const all = logs || [];

  if (topic === 'running') {
    const runs = all.filter(l => l.type === 'Running' && (l.distance || l.pace));
    if (runs.length === 0) return '═══ RUNNING DATA ═══\n  No running sessions.';
    const distances = runs.filter(l => l.distance).map(l => parseFloat(String(l.distance).replace(',', '.')) || 0);
    const avgDist = distances.length > 0 ? (distances.reduce((a, b) => a + b, 0) / distances.length).toFixed(1) : '-';
    const bodyMapRunning = runs.filter(l => l.bodyMap && Object.values(l.bodyMap).some(b => b.intensity >= 6));
    return `═══ RUNNING ANALYSIS ═══
  Runs: ${runs.length} | Avg dist: ${avgDist}km | Total: ${distances.reduce((a, b) => a + b, 0).toFixed(1)}km
  Recent:\n${runs.slice(0, 5).map(l => `    ${l.date}: ${l.distance || '-'}km @ ${l.pace || '-'}/km | C:${l.cardio} | L:${l.legs || '-'}${l.bodyMap ? ' | BodyMap: ' + Object.values(l.bodyMap).filter(b => b.intensity >= 6).map(b => `${b.label}(${b.intensity})`).join(',') : ''}`).join('\n')}
  ${bodyMapRunning.length > 0 ? `ℹ️ Note: some runs had higher muscle fatigue/DOMS logs.` : ''}
  INSTRUCTION: Identify pace trend, distance progression. Give specific protocol recommendations.`;
  }

  if (topic === 'energy') {
    const rated = all.filter(l => l.energy > 0).slice(0, 20);
    return `═══ ENERGY ANALYSIS ═══
  Sessions: ${rated.length}
  Data:\n${rated.slice(0, 10).map(l => `    ${l.date} [${l.type}]: E:${l.energy} | Sleep:${l.sleepHours || '?'}h | Sore:${l.musclesSoreness || '?'}`).join('\n')}
  INSTRUCTION: Identify trend, sleep-energy correlation, type-specific patterns, fatigue accumulation.`;
  }

  const recent = all.filter(l => l.energy > 0).slice(0, 15);
  return `═══ STATS DATA (${recent.length} sessions) ═══
${recent.map(l => `  ${l.date} [${l.type}] E:${l.energy} C:${l.cardio || '-'} I:${l.intensity || '-'} F:${l.focus || '-'} Sleep:${l.sleepHours || '?'}h Sore:${l.musclesSoreness || '?'}`).join('\n')}
INSTRUCTION: Answer the specific question with data. Be quantitative. Clear verdict + actionable fix.`;
}

function buildDiagnoseModule(logs, messages) {
  const text = (messages || []).slice(-3).map(m => m.content || '').join(' ').toLowerCase();
  const recent = (logs || []).filter(l => l.energy > 0).slice(0, 10);

  let focus = '';
  if (/round [3-9]|quart|terz|gas|fiato/.test(text))
    focus = 'FOCUS: Athlete gases in mid-late rounds. Check: lactic capacity, between-round recovery, technical efficiency, session type balance.';
  else if (/jab|cross|hook|tecnica|colpo|combinaz/.test(text))
    focus = 'FOCUS: Technical problem. Check: technique level, ratio of tech vs conditioning sessions, fatigue during tech sessions.';
  else if (/motivaz|demotiv|frustrat|deluso|non miglioro/.test(text))
    focus = 'FOCUS: Motivation/frustration. Acknowledge briefly (1 sentence), then pivot to data. Show concrete progress or explain what needs to change.';

  return `═══ DIAGNOSIS ═══
${focus}
APPROACH:
1. Physical, technical, or mental problem?
2. Cross-reference with log data — what do numbers say?
3. Is this a programming problem or athlete compliance problem?
4. Clear verdict: "The data suggests X because Y"
5. Specific prescription — not generic advice

Recent data:
${recent.slice(0, 7).map(l => `  ${l.date} [${l.type}] E:${l.energy} C:${l.cardio || '-'} Sore:${l.musclesSoreness || '-'} | "${(l.notes || '').slice(0, 60)}"`).join('\n')}`;
}

function buildTechniqueModule(profile) {
  return `═══ TECHNIQUE DRILLS ═══
Athlete levels: Tech:${profile.levels?.technique}/5 | Footwork:${profile.levels?.footwork}/5 | Defense:${profile.levels?.defense}/5 | Jab:${profile.levels?.jab}/5

DRILL PROTOCOLS BY AREA:

Jab improvement (level <3):
  Shadow: 3 rds jab-only, focus on extension/retraction speed, non-telegraphing
  Bag: 2 rds single jab power, 2 rds double jab rhythm
  Drill: "Metronome jab" — set timer beeps, jab exactly on each beep, increase tempo

Footwork (level <3):
  Shadow: 3 rds movement-only (no punches), lateral/pivot/circle
  Drill: "Box step" — move in square pattern, 4 corners, pivot at each
  Drill: "Cut the ring" — shadow with imaginary opponent retreating

Defense (level <3):
  Shadow: 2 rds slip-only (imagine jabs coming), 2 rds roll-under
  Drill: "Pendulum" — slip left-right continuously for 30s, rest 30s × 6
  Partner/wall: Practice catch-and-return with wall-bounce tennis ball

Combinations (level 3+):
  Shadow: 3 rds building combos (1-2, 1-2-3, 1-2-3-2, 1-2-5-2)
  Bag: 3 rds at 70% focusing on flow between punches
  Drill: "Combo clock" — 6 different combos, switch every 30s for 3min round

IMPORTANT: For athletes with tech level <3, NEVER program more than 2 new technical concepts per session. Quality over quantity.
Only program equipment drills the athlete has access to.`;
}

function buildTravelModule(profile) {
  return `═══ TRAVEL/REDUCED WEEK ═══
Athlete is away or has limited availability. Rules:
1. ASK: how many days available, what equipment (hotel gym? none? bands?)
2. PRIORITY ORDER when days are limited:
   - 1 day: Full-body maintenance (shadow + bodyweight strength + core)
   - 2 days: Day1 = technical shadow + core, Day2 = bodyweight conditioning circuit
   - 3 days: Add aerobic session (run if possible, or hotel treadmill/bike)
3. BODYWEIGHT-ONLY SESSIONS:
   Shadow boxing 6-8 rds (use round structure from knowledge base)
   Push-up variations: standard, diamond, archer, explosive × 3-4 sets
   Squat jump / lunge / pistol progression × 3-4 sets
   Core: dead bug, hollow hold, plank, mountain climbers
   Neck isometrics (no equipment needed)
4. Never try to compress a full week into 2 days with double intensity
5. Save travel period to memory so progression accounts for the gap`;
}

function buildRealTimeModule(schedule, logs) {
  const now = new Date();
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const todaySessions = schedule[dayName] || [];
  const todayDone = todaySessions.filter(s => s.done);
  const todayTodo = todaySessions.filter(s => !s.done);
  const lastLog = (logs || [])[0];

  return `═══ REAL-TIME SESSION CONTEXT ═══
Today is ${dayName}. Planned today: ${todaySessions.length} session(s).
  Done: ${todayDone.map(s => s.name).join(', ') || 'none'}
  Upcoming: ${todayTodo.map(s => `${s.name}${s.plannedTime ? ' @ ' + s.plannedTime : ''}`).join(', ') || 'none'}

Last logged session: ${lastLog ? `${lastLog.date} "${lastLog.name}" E:${lastLog.energy} C:${lastLog.cardio || '-'}` : 'none'}

PRE-SESSION ADVICE RULES:
- Check fatigue score and last session's soreness
- If fatigue >6: suggest reducing today's intensity 10-20%
- Remind hydration/nutrition if session is within 2 hours
- Quick mobility suggestions specific to today's session type

POST-SESSION ADVICE RULES:
- Ask for quick feedback (energy, any pain)
- Compare to plan: did they complete all steps?
- Recovery recommendations for tomorrow based on what they did
- If tomorrow has a planned session: preview and prep advice

DURING SESSION:
- If athlete messages mid-session, give SHORT tactical advice
- Modify remaining steps if they report fatigue or pain
- Keep responses under 3 sentences during active training`;
}

// ── Part 7 — System Prompt Builder ────────────────────────────────────────────

function parsePeriodizationEntry(text) {
  if (!text) return null;
  const get = (key) => {
    const m = text.match(new RegExp(`${key}=([^,\\s]+)`));
    return m ? m[1] : null;
  };
  return {
    phase: get('phase'),
    weekInCycle: get('week'),
    totalWeeks: get('totalWeeks'),
    dominantQuality: get('dominantQuality'),
    nextWeekFocus: get('nextWeekFocus'),
    updatedAt: new Date().toLocaleDateString('it-IT')
  };
}

export function pruneMemory(coachMemory) {
  const pruned = {};
  const categories = ['preferences', 'observations', 'decisions', 'injuries'];
  categories.forEach(cat => {
    const entries = coachMemory[cat] || [];
    if (entries.length <= 20) {
      pruned[cat] = entries;
    } else {
      pruned[cat] = [...entries]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20);
    }
  });
  return pruned;
}

export function buildSystemPrompt({ profile, schedule, currentWeekId, logs, goals, coachMemory, weeks, messages, availability, availabilityTemplate, locations }) {
  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const intent = detectIntent(messages, { schedule, logs, weeks, currentWeekId });
  const analysisTopic = detectAnalysisTopic(messages);

  const active = (goals || []).filter(g => g.status === 'active');
  const goalsText = active.length > 0
    ? active.map(g => `  [${g.type.toUpperCase()}] "${g.text}"${g.targetDate ? ` → ${g.targetDate}` : ''}`).join('\n')
    : '  No active goals.';

  const prunedMemory = pruneMemory(coachMemory || {});
  const memText = Object.entries(prunedMemory).map(([cat, entries]) => {
    if (!entries?.length) return '';
    return `  ${cat.toUpperCase()}:\n${entries.map(e => `    - ${typeof e === 'string' ? e : e.text}`).join('\n')}`;
  }).filter(Boolean).join('\n');

  const periodEntry = (coachMemory?.decisions || [])
    .map(e => typeof e === 'string' ? e : e.text)
    .find(t => /PERIODIZATION:/i.test(t));
  const parsed = periodEntry ? parsePeriodizationEntry(periodEntry) : null;

  const modules = [
    buildCoreIdentity(profile),
    `TODAY: ${today} | DETECTED INTENT: ${intent}
NOTE: If this intent doesn't match what the athlete actually asked, ignore the label and respond to their real question.`,
    buildAthleteSnapshot(profile, logs, availability, locations || profile.locations || [], weeks, currentWeekId),
    buildCurrentWeek(schedule, currentWeekId),
    buildRecentLogs(logs),
    `═══ GOALS ═══\n${goalsText}`,
    memText ? `═══ COACH MEMORY ═══\n${memText}` : '',

    ['PLAN_WEEK', 'PROACTIVE_SUNDAY', 'TAPER', 'DELOAD', 'MODIFY_SESSION', 'COMPARE_WEEKS'].includes(intent) ? buildSandCKnowledge() : '',
    ['PLAN_WEEK', 'PROACTIVE_SUNDAY', 'COMPARE_WEEKS', 'ANALYZE_PROGRESS'].includes(intent) ? buildLastFourWeeks(weeks, currentWeekId) : '',
    ['PLAN_WEEK', 'PROACTIVE_SUNDAY', 'TAPER', 'DELOAD'].includes(intent) ? buildPeriodizationState({ periodization: parsed }) : '',
    ['PLAN_WEEK', 'PROACTIVE_SUNDAY'].includes(intent) ? buildPlanningRules(profile, schedule) : '',

    intent === 'ANALYZE_STATS' ? buildAnalysisModule(logs, analysisTopic) : '',
    intent === 'INJURY' ? buildInjuryModule() : '',
    intent === 'DELOAD' ? buildDeloadModule(logs) : '',
    intent === 'TAPER' ? buildTaperModule(logs, goals) : '',
    intent === 'TECHNIQUE' ? buildTechniqueModule(profile) : '',
    intent === 'TRAVEL_WEEK' ? buildTravelModule(profile) : '',
    intent === 'REAL_TIME' ? buildRealTimeModule(schedule, logs) : '',

    ['PLAN_WEEK', 'MODIFY_SESSION', 'TRAVEL_WEEK'].includes(intent) ? `═══ SCHEDULING PRINCIPLES ═══
1. BUFFERS FIRST: Calculate backwards from every hard commitment. Sweat session = 20min shower + (travelMinutes × 2) + 15min buffer. If session doesn't fit mathematically, use home alternative or rest. Never schedule a session that cannot complete with all buffers intact.
2. ENERGY MATCHING: Fresh window = any session type valid. Post-work drained = technical or mobility only, never conditioning or sparring. After 20:00 or before chronotype peak window = no high CNS demand. Family commitments = buffer both sides, athlete must arrive mentally fresh not physically tired.
3. WINDOW FITTING: Under 20min = micro only (neck protocol, visualization, grip work, light rope technique). 20-45min = home or shadow only. 45-75min = single focus one location. 75min+ = full structured session. When 10-20min short: compress rest max 15 seconds, remove warm-up if athlete traveled to location, move cool-down to home with a note. Never compress main work block below 20min.
4. SHIFT BEFORE COMPRESS: Prime window tomorrow always beats compressed window today. Shifting preferred over compressing. Three or more compressed sessions this week = next prime window is recovery regardless of periodization plan. Tell athlete explicitly when you shift something and why.
5. FIXED ANCHORS AND PATTERNS: Gym courses defined in a location's schedule are sacred, never move or schedule conflicts in adjacent slots that affect travel time. Recurring skip pattern on specific day/time slot = treat as soft-unavailable, do not force sessions there, mention pattern to athlete. A completed 20min session beats a skipped 75min session.
6. CONTEXT OVERRIDES: Competition goal under 8 weeks = protect rest windows even if technically free, taper logic takes precedence. Travel week = check travelTrainingStyle before planning, if null ask athlete first. Meal conflict within 90min of likely meal time = flag in session notes only, do not block. Weather likely poor for outdoor session = always prepare indoor alternative in session notes. Soft commitments can be flagged for rescheduling if they conflict with critical windows. Hard commitments are sacred.
7. COURSES AND FIXED CLASSES: If a session is a fixed gym class, ALWAYS set 'isCourse: true' in the exercise object. You MUST select the specific course by setting 'courseIdx'. IMPORTANT: You CANNOT change the 'plannedTime' of a course; it must strictly match the time defined in the profile's course schedule. Courses are anchors and cannot be rescheduled.` : '',

    intent === 'ANALYZE_SCHEDULE' ? `═══ SCHEDULE ANALYSIS CONTEXT ═══
Review the current week schedule against the athlete's availability. Check and comment on: hard commitment buffer violations (session ends too close to commitment), session type mismatches with energy state of that window, fixed anchor conflicts, overloaded consecutive days given athlete's consecutiveDaysPreference. Explain your reasoning clearly for each issue found. Do not rebuild or modify the week unless explicitly asked to do so.` : '',

    ['DIAGNOSE', 'COACH_CHAT'].includes(intent) ? buildDiagnoseModule(logs, messages) : '',

    intent === 'PROACTIVE_SUNDAY' ? `═══ PROACTIVE SUNDAY ═══
Create next week's plan NOW using create_next_week tool.
Base on: all logs this week, fatigue score, periodization phase, body map alerts, equipment.
This is a PROPOSAL — write it as "Propongo per la settimana [weekId]:" not "Ho programmato".
Summary must explain EACH day's choice. Athlete will approve/reject.` : '',

    intent === 'PROACTIVE_INACTIVITY' ? `═══ INACTIVITY CHECK ═══
${getDaysSinceLastLog(logs)}+ days since last session. Open with a brief practical check-in (not motivational). Ask what happened. Offer to adjust the current week.` : '',

    intent === 'PROACTIVE_OVERLOAD' ? `═══ OVERLOAD ALERT ═══
Data shows overtraining signs (low energy + high soreness). Name the problem. Propose deload immediately. Don't wait for athlete to ask.` : '',

    intent === 'PROACTIVE_GOAL' ? `═══ GOAL CHECK ═══
Data suggests athlete may have reached a goal. Bring it up. Ask if they want to update or set a new one.` : '',

    `═══ MANDATORY RULES ═══
1. ACT FIRST, explain after. No apologies. No long intros.
2. ALWAYS call update_coach_memory for any preference, pattern, injury, or milestone.
3. ALWAYS save periodization state after creating/modifying a week.
4. NEVER program equipment the athlete doesn't have.
5. Frustration → acknowledge 1 sentence, then data + fixes.
6. Every session MUST have structured steps for the guided timer.
7. Step durations in seconds. Exercise IDs: Date.now() as string. For any gym/fixed class, include 'isCourse: true' and 'courseLocationId: [index]' in the exercise object.
8. Body map alerts → immediate load reduction ONLY on affected areas if risk >= 8.
9. TOOLS AVAILABLE: create_next_week, add_exercise, remove_exercise, reschedule_exercise, modify_session, update_coach_memory, update_goals, update_skill_level.
10. PAIN, SORENESS & BODY MAP SCALE:
    1-6/10 (DOMS/Fatigue): Normal muscle work. The athlete just "felt the work" in this area. DO NOT modify the program. DO NOT treat as an injury.
    7/10 (High Fatigue): Monitor. Maybe reduce load on this specific area by 10-20% for the next session, but do NOT trigger injury protocol.
    8-10/10 (Severe/Sharp Pain): Real injury risk. Trigger full INJURY protocol. Modify week immediately.
    Never escalate fatigue (≤7) to an injury just because it repeats. Repetitive DOMS is normal.
11. INTERVAL & SETS INSTRUCTIONS — MANDATORY FORMAT: For ANY interval or sets step with 2+ rounds, the instruction field MUST use this exact format: 'R1: [specific cue] | R2: [specific cue] | R3: [specific cue]' with one cue per round, each different from the others. R1 = establish rhythm or technique focus. R2 = add intensity or tactical element. R3+ = maintain quality under fatigue or escalate challenge. NEVER write a single generic sentence for multi-round steps. If a step has 5 rounds write R1 through R5. The pipe separator | is mandatory between rounds. This applies to every tool call that creates or modifies sessions: create_next_week, add_exercise, modify_session.`
  ];

  return modules.filter(Boolean).join('\n\n');
}

// ── Part 8 — Tool Definitions ──────────────────────────────────────────────────

export const coachTools = [
  {
    name: 'create_next_week',
    description: 'Create the full training schedule for next week. Replaces any existing schedule for that weekId. Each session must have structured steps for the guided timer. Always include a summary explaining each day choice — it will be shown to athlete for approval before applying.',
    input_schema: {
      type: 'object',
      required: ['weekId', 'schedule', 'summary'],
      properties: {
        weekId: { type: 'string', description: 'ISO week ID, e.g. "2026-W14"' },
        summary: { type: 'string', description: 'Explanation of choices for each day — shown to athlete for approval. Format: "Settimana proposta per [weekId]: [brief overview]. Lunedì: [reason]. Martedì: [reason]..." etc.' },
        schedule: {
          type: 'object',
          required: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          properties: {
            monday: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'steps'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['Boxing', 'Running', 'Strength', 'Recovery', 'Conditioning'] }, name: { type: 'string' }, notes: { type: 'string' }, plannedTime: { type: 'string' }, steps: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'instruction'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['timer', 'interval', 'sets', 'text'] }, name: { type: 'string' }, instruction: { type: 'string' }, duration: { type: 'number' }, rounds: { type: 'number' }, work: { type: 'number' }, rest: { type: 'number' }, sets: { type: 'number' }, reps: { type: 'string' } } } } } } },
            tuesday: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'steps'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['Boxing', 'Running', 'Strength', 'Recovery', 'Conditioning'] }, name: { type: 'string' }, notes: { type: 'string' }, plannedTime: { type: 'string' }, steps: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'instruction'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['timer', 'interval', 'sets', 'text'] }, name: { type: 'string' }, instruction: { type: 'string' }, duration: { type: 'number' }, rounds: { type: 'number' }, work: { type: 'number' }, rest: { type: 'number' }, sets: { type: 'number' }, reps: { type: 'string' } } } } } } },
            wednesday: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'steps'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['Boxing', 'Running', 'Strength', 'Recovery', 'Conditioning'] }, name: { type: 'string' }, notes: { type: 'string' }, plannedTime: { type: 'string' }, steps: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'instruction'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['timer', 'interval', 'sets', 'text'] }, name: { type: 'string' }, instruction: { type: 'string' }, duration: { type: 'number' }, rounds: { type: 'number' }, work: { type: 'number' }, rest: { type: 'number' }, sets: { type: 'number' }, reps: { type: 'string' } } } } } } },
            thursday: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'steps'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['Boxing', 'Running', 'Strength', 'Recovery', 'Conditioning'] }, name: { type: 'string' }, notes: { type: 'string' }, plannedTime: { type: 'string' }, steps: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'instruction'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['timer', 'interval', 'sets', 'text'] }, name: { type: 'string' }, instruction: { type: 'string' }, duration: { type: 'number' }, rounds: { type: 'number' }, work: { type: 'number' }, rest: { type: 'number' }, sets: { type: 'number' }, reps: { type: 'string' } } } } } } },
            friday: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'steps'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['Boxing', 'Running', 'Strength', 'Recovery', 'Conditioning'] }, name: { type: 'string' }, notes: { type: 'string' }, plannedTime: { type: 'string' }, steps: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'instruction'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['timer', 'interval', 'sets', 'text'] }, name: { type: 'string' }, instruction: { type: 'string' }, duration: { type: 'number' }, rounds: { type: 'number' }, work: { type: 'number' }, rest: { type: 'number' }, sets: { type: 'number' }, reps: { type: 'string' } } } } } } },
            saturday: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'steps'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['Boxing', 'Running', 'Strength', 'Recovery', 'Conditioning'] }, name: { type: 'string' }, notes: { type: 'string' }, plannedTime: { type: 'string' }, steps: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'instruction'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['timer', 'interval', 'sets', 'text'] }, name: { type: 'string' }, instruction: { type: 'string' }, duration: { type: 'number' }, rounds: { type: 'number' }, work: { type: 'number' }, rest: { type: 'number' }, sets: { type: 'number' }, reps: { type: 'string' } } } } } } },
            sunday: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'steps'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['Boxing', 'Running', 'Strength', 'Recovery', 'Conditioning'] }, name: { type: 'string' }, notes: { type: 'string' }, plannedTime: { type: 'string' }, steps: { type: 'array', items: { type: 'object', required: ['id', 'type', 'name', 'instruction'], properties: { id: { type: 'string' }, type: { type: 'string', enum: ['timer', 'interval', 'sets', 'text'] }, name: { type: 'string' }, instruction: { type: 'string' }, duration: { type: 'number' }, rounds: { type: 'number' }, work: { type: 'number' }, rest: { type: 'number' }, sets: { type: 'number' }, reps: { type: 'string' } } } } } } }
          }
        }
      }
    }
  },
  {
    name: 'add_exercise',
    description: 'Add a new exercise/session to a specific day in the current week schedule.',
    input_schema: {
      type: 'object',
      required: ['day', 'exercise'],
      properties: {
        day: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        exercise: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['Boxing', 'Running', 'Strength', 'Recovery', 'Conditioning'] },
            notes: { type: 'string' },
            plannedTime: { type: 'string', description: 'HH:mm format' },
            steps: { type: 'array', items: { type: 'object', required: ['type', 'name'], properties: { type: { type: 'string', enum: ['timer', 'interval', 'sets', 'text'] }, name: { type: 'string' }, instruction: { type: 'string' }, duration: { type: 'number' }, rounds: { type: 'number' }, work: { type: 'number' }, rest: { type: 'number' }, sets: { type: 'number' }, reps: { type: 'string' } } } }
          }
        }
      }
    }
  },
  {
    name: 'remove_exercise',
    description: 'Remove an exercise from a specific day in the current week.',
    input_schema: {
      type: 'object',
      required: ['day', 'exerciseId'],
      properties: {
        day: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        exerciseId: { type: 'string', description: 'ID of the exercise to remove' }
      }
    }
  },
  {
    name: 'reschedule_exercise',
    description: 'Move an exercise from one day to another in the current week.',
    input_schema: {
      type: 'object',
      required: ['fromDay', 'exerciseId', 'toDay'],
      properties: {
        fromDay: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        exerciseId: { type: 'string' },
        toDay: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }
      }
    }
  },
  {
    name: 'modify_session',
    description: 'Modify a specific session in the current week. Can update name, notes, steps, or remove/replace entirely.',
    input_schema: {
      type: 'object',
      required: ['day', 'sessionId', 'action'],
      properties: {
        day: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        sessionId: { type: 'string', description: 'The session ID to modify' },
        action: { type: 'string', enum: ['update', 'remove', 'replace'] },
        updates: { type: 'object', description: 'For update action: partial session fields to merge (name, notes, plannedTime, steps)' },
        replacement: { type: 'object', description: 'For replace action: full new session object with id, type, name, steps' }
      }
    }
  },
  {
    name: 'update_coach_memory',
    description: 'Save persistent information about the athlete. Use categories: preferences (likes/dislikes, constraints), observations (patterns noticed in performance), decisions (periodization state, deload history — use format PERIODIZATION: phase=X, week=N, totalWeeks=N, dominantQuality=X, nextWeekFocus=X), injuries (current/past injuries with dates and severity).',
    input_schema: {
      type: 'object',
      required: ['category', 'text'],
      properties: {
        category: { type: 'string', enum: ['preferences', 'observations', 'decisions', 'injuries'] },
        text: { type: 'string', description: 'The information to store.' }
      }
    }
  },
  {
    name: 'update_goals',
    description: 'Create, update or complete athlete goals.',
    input_schema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['add', 'update', 'complete', 'remove'] },
        goalId: { type: 'string', description: 'Required for update/complete/remove' },
        goal: { type: 'object', properties: { text: { type: 'string' }, type: { type: 'string', enum: ['fitness', 'technique', 'competition', 'weight', 'habit'] }, targetDate: { type: 'string', description: 'ISO date string' }, status: { type: 'string', enum: ['active', 'completed', 'paused'] } } }
      }
    }
  },
  {
    name: 'update_skill_level',
    description: 'Update one of the athlete technical skill levels (1-5) based on observed performance across sessions.',
    input_schema: {
      type: 'object',
      required: ['skill', 'level'],
      properties: {
        skill: { type: 'string', enum: ['cardio', 'technique', 'footwork', 'defense', 'jab', 'reading'] },
        level: { type: 'number', minimum: 1, maximum: 5, description: '1=beginner, 2=developing, 3=competent, 4=advanced, 5=elite' }
      }
    }
  }
];

// ── Stream Parsers & Communication (Internal Format Conversions) ──────────────

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
      } catch { }
    }
  }
  return { text: fullText, toolUses };
}

async function parseOpenAIStream(reader, { onTextChunk, onToolUse }) {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let toolUses = [];
  const toolCallMap = {};

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
        for (const tc of Object.values(toolCallMap)) {
          if (!tc.name) continue;
          try {
            const parsed = { id: tc.id, name: tc.name, input: JSON.parse(tc.arguments || '{}') };
            toolUses.push(parsed);
            if (onToolUse) onToolUse(parsed);
          } catch { }
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
      } catch { }
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
      } catch (e) { }
    }
  }
  return { text: fullText, toolUses };
}

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
      } catch { }
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

export async function sendToolResults({
  apiKey, model, systemPrompt, messages, toolResults,
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
      } catch { }
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