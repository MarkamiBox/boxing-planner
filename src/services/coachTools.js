/**
 * Coach Tools — Executes tool calls from Claude against app state
 */

/**
 * Execute a single tool call and return the result
 * @param {string} toolName - Name of the tool
 * @param {object} toolInput - Input parameters from Claude
 * @param {object} appState - All app state setters and getters
 * @returns {{ success: boolean, message: string, diff?: object }}
 */
export function executeToolCall(toolName, toolInput, appState) {
  const { schedule, setSchedule, weeks, setWeeks, currentWeekId, setCurrentWeekId,
    profile, setProfile, goals, setGoals, coachMemory, setCoachMemory } = appState;

  switch (toolName) {
    case 'modify_exercise': {
      const { exerciseId, fields } = toolInput;
      const day = toolInput.day?.toLowerCase();
      const dayExercises = schedule[day];
      if (!dayExercises) return { success: false, message: `Day "${day}" not found in schedule.` };

      const exIdx = dayExercises.findIndex(e => e.id === exerciseId);
      if (exIdx === -1) return { success: false, message: `Exercise with id "${exerciseId}" not found on ${day}.` };

      const oldName = dayExercises[exIdx].name;
      const newSchedule = { ...schedule };

      // Normalize steps with IDs
      if (fields.steps) {
        fields.steps = fields.steps.map((s, i) => ({
          ...s,
          id: s.id || `s${i + 1}`
        }));
      }

      newSchedule[day] = [...newSchedule[day]];
      newSchedule[day][exIdx] = { ...newSchedule[day][exIdx], ...fields };
      setSchedule(newSchedule);

      return { success: true, message: `Modified "${oldName}" on ${day}.`, diff: { day, exerciseId, changes: fields } };
    }

    case 'add_exercise': {
      const { exercise } = toolInput;
      const day = toolInput.day?.toLowerCase();
      const newSchedule = { ...schedule };
      const newId = Date.now().toString();

      // Normalize steps
      const steps = (exercise.steps || []).map((s, i) => ({
        ...s,
        id: s.id || `s${i + 1}`
      }));

      const newExercise = {
        id: newId,
        type: exercise.type || 'Boxing',
        name: exercise.name,
        done: false,
        notes: exercise.notes || '',
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

    case 'replace_exercise': {
      const { exerciseId, newExercise } = toolInput;
      const day = toolInput.day?.toLowerCase();
      const dayExercises = schedule[day];
      if (!dayExercises) return { success: false, message: `Day "${day}" not found.` };

      const exIdx = dayExercises.findIndex(e => e.id === exerciseId);
      if (exIdx === -1) return { success: false, message: `Exercise "${exerciseId}" not found on ${day}.` };

      const oldName = dayExercises[exIdx].name;
      const newId = Date.now().toString();
      const steps = (newExercise.steps || []).map((s, i) => ({ ...s, id: s.id || `s${i + 1}` }));

      const newSchedule = { ...schedule };
      newSchedule[day] = [...newSchedule[day]];
      newSchedule[day][exIdx] = {
        id: newId,
        type: newExercise.type || 'Boxing',
        name: newExercise.name,
        done: false,
        notes: newExercise.notes || '',
        steps
      };
      setSchedule(newSchedule);

      return { success: true, message: `Replaced "${oldName}" with "${newExercise.name}" on ${day}.`, diff: { day, replaced: { old: oldName, new: newExercise.name } } };
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

    case 'rewrite_week': {
      const { schedule: newWeekSchedule } = toolInput;

      // Normalize all exercises with IDs
      const normalized = {};
      const now = Date.now();
      let counter = 0;

      for (const [day, exercises] of Object.entries(newWeekSchedule)) {
        normalized[day] = (exercises || []).map(ex => {
          counter++;
          const steps = (ex.steps || []).map((s, i) => ({ ...s, id: s.id || `s${i + 1}` }));
          return {
            id: ex.id || (now + counter).toString(),
            type: ex.type || 'Boxing',
            name: ex.name || 'Unnamed Exercise',
            done: false,
            notes: ex.notes || '',
            steps
          };
        });
      }

      setSchedule(normalized);

      const totalExercises = Object.values(normalized).reduce((a, d) => a + d.length, 0);
      return { success: true, message: `Rewrote entire week: ${totalExercises} exercises across 7 days.`, diff: { type: 'full_rewrite' } };
    }

    case 'create_next_week': {
      const { schedule: nextWeekSchedule } = toolInput;

      if (!currentWeekId) return { success: false, message: 'No current week ID set.' };

      // Parse current week and compute next
      const [y, w] = currentWeekId.split('-W').map(Number);
      let newY = y, newW = w + 1;
      if (newW > 52) { newW = 1; newY++; }
      const nextWeekId = `${newY}-W${newW.toString().padStart(2, '0')}`;

      // Normalize
      const normalized = {};
      const now = Date.now();
      let counter = 0;

      for (const [day, exercises] of Object.entries(nextWeekSchedule)) {
        normalized[day] = (exercises || []).map(ex => {
          counter++;
          const steps = (ex.steps || []).map((s, i) => ({ ...s, id: s.id || `s${i + 1}` }));
          return {
            id: ex.id || (now + counter).toString(),
            type: ex.type || 'Boxing',
            name: ex.name || 'Unnamed Exercise',
            done: false,
            notes: ex.notes || '',
            steps
          };
        });
      }

      setWeeks(prev => ({ ...prev, [nextWeekId]: normalized }));
      setCurrentWeekId(nextWeekId);

      const totalExercises = Object.values(normalized).reduce((a, d) => a + d.length, 0);
      return { success: true, message: `Created next week (${nextWeekId}) with ${totalExercises} exercises. Switched to the new week.`, diff: { type: 'next_week', weekId: nextWeekId } };
    }

    case 'update_goal': {
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
      const { category, entry } = toolInput;
      if (!coachMemory[category]) return { success: false, message: `Unknown memory category: ${category}` };

      const newEntry = {
        id: Date.now().toString(),
        text: entry,
        createdAt: new Date().toISOString(),
        source: 'coach'
      };

      setCoachMemory({
        ...coachMemory,
        [category]: [...coachMemory[category], newEntry]
      });

      return { success: true, message: `Stored in ${category}: "${entry}"` };
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

    default:
      return { success: false, message: `Unknown tool: ${toolName}` };
  }
}
