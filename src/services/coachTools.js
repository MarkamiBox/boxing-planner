/**
 * Coach Tools — Executes tool calls against app state
 */

export function executeToolCall(toolName, toolInput, appState) {
  const { schedule, setSchedule, weeks, setWeeks, currentWeekId, setCurrentWeekId,
    profile, setProfile, goals, setGoals, coachMemory, setCoachMemory } = appState;

  const sanitizeStep = (s, i) => ({
    ...s,
    id: s.id || `s${i + 1}`,
    duration: s.duration !== undefined ? (Number(s.duration) || 0) : undefined,
    work: s.work !== undefined ? (Number(s.work) || 0) : undefined,
    rest: s.rest !== undefined ? (Number(s.rest) || 0) : undefined,
    rounds: s.rounds !== undefined ? (Number(s.rounds) || 1) : undefined,
    sets: s.sets !== undefined ? (Number(s.sets) || 1) : undefined,
    prepTime: s.prepTime !== undefined ? (Number(s.prepTime) || 0) : undefined
  });

  switch (toolName) {

    case 'create_next_week': {
      const { schedule: nextWeekSchedule, weekId } = toolInput;

      let nextWeekId = weekId;
      if (!nextWeekId) {
        if (!currentWeekId) return { success: false, message: 'No current week ID set.' };
        const [y, w] = currentWeekId.split('-W').map(Number);
        let newY = y, newW = w + 1;
        if (newW > 52) { newW = 1; newY++; }
        nextWeekId = `${newY}-W${newW.toString().padStart(2, '0')}`;
      }

      const normalized = {};
      const now = Date.now();
      let counter = 0;

      for (const [day, exercises] of Object.entries(nextWeekSchedule)) {
        normalized[day] = (exercises || []).map(ex => {
          counter++;
          const steps = (ex.steps || []).map(sanitizeStep);
          return {
            id: ex.id || (now + counter).toString(),
            type: ex.type || 'Boxing',
            name: ex.name || 'Unnamed Exercise',
            done: false,
            notes: ex.notes || '',
            plannedTime: ex.plannedTime || '',
            steps
          };
        });
      }

      setWeeks(prev => ({ ...prev, [nextWeekId]: normalized }));
      setCurrentWeekId(nextWeekId);

      const totalExercises = Object.values(normalized).reduce((a, d) => a + d.length, 0);
      return { success: true, message: `Created next week (${nextWeekId}) with ${totalExercises} exercises. Switched to the new week.`, diff: { type: 'next_week', weekId: nextWeekId } };
    }

    case 'add_exercise': {
      const { exercise } = toolInput;
      const day = toolInput.day?.toLowerCase();
      const newSchedule = { ...schedule };
      const newId = Date.now().toString();

      const steps = (exercise.steps || []).map(sanitizeStep);
      const newExercise = {
        id: newId,
        type: exercise.type || 'Boxing',
        name: exercise.name,
        done: false,
        notes: exercise.notes || '',
        plannedTime: exercise.plannedTime || '',
        steps
      };

      newSchedule[day] = [...(newSchedule[day] || []), newExercise];
      setSchedule(newSchedule);

      return { success: true, message: `Added "${exercise.name}" to ${day}.`, diff: { day, added: newExercise } };
    }

    case 'remove_exercise': {
      const { exerciseId } = toolInput;
      const day = toolInput.day?.toLowerCase();
      const dayExercises = schedule[day];
      if (!dayExercises) return { success: false, message: `Day "${day}" not found.` };

      const ex = dayExercises.find(e => e.id === exerciseId);
      if (!ex) return { success: false, message: `Exercise "${exerciseId}" not found on ${day}.` };

      const newSchedule = { ...schedule };
      newSchedule[day] = newSchedule[day].filter(e => e.id !== exerciseId);
      setSchedule(newSchedule);

      return { success: true, message: `Removed "${ex.name}" from ${day}.`, diff: { day, removed: ex.name } };
    }

    case 'reschedule_exercise': {
      const { exerciseId } = toolInput;
      const fromDay = toolInput.fromDay?.toLowerCase();
      const toDay = toolInput.toDay?.toLowerCase();
      const fromExercises = schedule[fromDay];
      if (!fromExercises) return { success: false, message: `Day "${fromDay}" not found.` };

      const ex = fromExercises.find(e => e.id === exerciseId);
      if (!ex) return { success: false, message: `Exercise "${exerciseId}" not found on ${fromDay}.` };

      const newSchedule = { ...schedule };
      newSchedule[fromDay] = newSchedule[fromDay].filter(e => e.id !== exerciseId);
      newSchedule[toDay] = [...(newSchedule[toDay] || []), { ...ex, done: false }];
      setSchedule(newSchedule);

      return { success: true, message: `Moved "${ex.name}" from ${fromDay} to ${toDay}.`, diff: { fromDay, toDay, exercise: ex.name } };
    }

    case 'modify_session': {
      const { day, sessionId, action, updates, replacement } = toolInput;
      const d = day?.toLowerCase();
      if (!schedule[d]) return { success: false, message: `Day not found.` };
      const exIdx = schedule[d].findIndex(e => e.id === sessionId);
      if (exIdx === -1) return { success: false, message: `Session not found.` };

      const newSchedule = { ...schedule };

      if (action === 'remove') {
        newSchedule[d] = newSchedule[d].filter(e => e.id !== sessionId);
        setSchedule(newSchedule);
        return { success: true, message: `Removed session.` };
      } else if (action === 'replace' && replacement) {
        const steps = (replacement.steps || []).map(sanitizeStep);
        newSchedule[d][exIdx] = {
          id: Date.now().toString(),
          type: replacement.type || 'Boxing',
          name: replacement.name,
          done: false,
          notes: replacement.notes || '',
          plannedTime: replacement.plannedTime || '',
          steps
        };
        setSchedule(newSchedule);
        return { success: true, message: `Replaced session on ${d}.` };
      } else if (action === 'update' && updates) {
        const target = newSchedule[d][exIdx];
        if (updates.steps) {
          updates.steps = updates.steps.map(sanitizeStep);
        }
        newSchedule[d][exIdx] = { ...target, ...updates };
        setSchedule(newSchedule);
        return { success: true, message: `Updated session on ${d}.` };
      }
      return { success: false, message: `Invalid action or missing payload for modify_session.` };
    }

    case 'update_goals': {
      const { action, goalId, goal } = toolInput;
      switch (action) {
        case 'add': {
          const newGoal = {
            id: Date.now().toString(),
            text: goal?.text || '',
            type: goal?.type || 'short',
            targetDate: goal?.targetDate || '',
            status: 'active',
            createdAt: new Date().toISOString()
          };
          setGoals([...goals, newGoal]);
          return { success: true, message: `Added goal: "${newGoal.text}"` };
        }
        case 'update': {
          if (!goalId) return { success: false, message: 'goalId required for update.' };
          setGoals(goals.map(g => g.id === goalId ? { ...g, ...goal } : g));
          return { success: true, message: `Updated goal ${goalId}.` };
        }
        case 'complete': {
          if (!goalId) return { success: false, message: 'goalId required for complete.' };
          setGoals(goals.map(g => g.id === goalId ? { ...g, status: 'completed' } : g));
          const completed = goals.find(g => g.id === goalId);
          return { success: true, message: `Completed goal: "${completed?.text || goalId}"` };
        }
        case 'remove': {
          if (!goalId) return { success: false, message: 'goalId required for remove.' };
          setGoals(goals.filter(g => g.id !== goalId));
          return { success: true, message: `Removed goal ${goalId}.` };
        }
        default:
          return { success: false, message: `Unknown goal action: ${action}` };
      }
    }

    case 'update_coach_memory': {
      const { category, text } = toolInput;

      const newEntry = {
        id: Date.now().toString(),
        text: text || toolInput.entry, // Fallback for safety
        createdAt: new Date().toISOString(),
        source: 'coach'
      };

      let newCategoryArray = [...(coachMemory[category] || []), newEntry];
      if (newCategoryArray.length > 20) {
        console.info(`Pruning coach memory category "${category}": removing ${newCategoryArray.length - 20} old entries.`);
        newCategoryArray = newCategoryArray
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          .slice(-20);
      }

      setCoachMemory({
        ...coachMemory,
        [category]: newCategoryArray
      });

      return { success: true, message: `Stored in ${category}: "${newEntry.text}"` };
    }

    case 'update_skill_level': {
      const { skill, level } = toolInput;
      if (!profile.levels.hasOwnProperty(skill)) return { success: false, message: `Unknown skill: ${skill}` };

      const oldLevel = profile.levels[skill];
      setProfile({
        ...profile,
        levels: { ...profile.levels, [skill]: level }
      });

      return { success: true, message: `Updated ${skill}: ${oldLevel} → ${level}` };
    }

    case 'analyze_data': {
      return { success: true, message: 'Analysis completed' };
    }

    default:
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}