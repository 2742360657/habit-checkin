import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import {
  DEFAULT_HOME_HERO_DESCRIPTION,
  DEFAULT_HOME_HERO_TITLE,
  loadAppDataFromDisk,
  saveAppDataToDisk,
} from '../storage/habitStorage';
import { DEFAULT_THEME_ID, getTheme, ThemeId } from '../theme';
import {
  AppData,
  AppSettings,
  CheckinRecord,
  Habit,
  HabitCadence,
  HabitGroup,
  TodoItem,
  TodoPriority,
} from '../types/habit';
import { clampToMinute, getTodayKey, toLocalDateKey } from '../utils/date';
import { createId } from '../utils/id';

type HabitState = {
  appData: AppData;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
};

type HabitAction =
  | { type: 'hydrate'; appData: AppData }
  | { type: 'set-error'; error: string | null }
  | { type: 'clear-error' }
  | { type: 'replace-app-data'; appData: AppData }
  | { type: 'set-theme-id'; themeId: ThemeId }
  | { type: 'update-home-copy'; title: string; description: string }
  | { type: 'add-group'; group: HabitGroup }
  | { type: 'rename-group'; groupId: string; name: string }
  | { type: 'delete-group'; groupId: string }
  | { type: 'reorder-groups'; groupIds: string[] }
  | { type: 'add-habit'; habit: Habit }
  | {
      type: 'update-habit';
      habitId: string;
      name: string;
      groupId: string | null;
      cadence: HabitCadence;
      targetCount: number;
      order: number;
    }
  | { type: 'reorder-habits'; groupId: string | null; habitIds: string[] }
  | { type: 'archive-habit'; habitId: string }
  | { type: 'restore-archived-habit'; habitId: string }
  | { type: 'delete-habit'; habitId: string }
  | { type: 'add-checkin-now'; habitId: string; record: CheckinRecord }
  | { type: 'add-checkin'; habitId: string; dateKey: string; timestamp: number; note: string }
  | {
      type: 'update-checkin';
      habitId: string;
      recordId: string;
      timestamp: number;
      note: string;
    }
  | { type: 'delete-checkin'; habitId: string; recordId: string }
  | { type: 'add-todo'; todo: TodoItem }
  | {
      type: 'update-todo';
      todoId: string;
      title: string;
      note: string;
      dueDateKey: string | null;
      dueTime: string | null;
      priority: TodoPriority;
    }
  | { type: 'set-todo-completed'; todoId: string; completedAt: number | null }
  | { type: 'delete-todo'; todoId: string }
  | { type: 'reorder-todos'; todoIds: string[] };

export type HabitInput = {
  name: string;
  groupId: string | null;
  cadence: HabitCadence;
  targetCount: number;
};

export type TodoInput = {
  title: string;
  note: string;
  dueDateKey: string | null;
  dueTime: string | null;
  priority: TodoPriority;
};

type HabitContextValue = HabitState & {
  allHabits: Habit[];
  habits: Habit[];
  archivedHabits: Habit[];
  groups: HabitGroup[];
  todos: TodoItem[];
  settings: AppSettings;
  theme: ReturnType<typeof getTheme>;
  clearError: () => void;
  addGroup: (name: string) => boolean;
  renameGroup: (groupId: string, name: string) => boolean;
  deleteGroup: (groupId: string) => void;
  reorderGroups: (groupIds: string[]) => void;
  addHabit: (input: HabitInput) => boolean;
  updateHabit: (habitId: string, input: HabitInput) => boolean;
  reorderHabits: (groupId: string | null, habitIds: string[]) => void;
  archiveHabit: (habitId: string) => void;
  restoreArchivedHabit: (habitId: string) => void;
  deleteHabit: (habitId: string) => void;
  addCheckinNow: (habitId: string) => string;
  addCheckin: (habitId: string, dateKey: string, timestamp: number, note: string) => void;
  updateCheckin: (habitId: string, recordId: string, timestamp: number, note: string) => void;
  deleteCheckin: (habitId: string, recordId: string) => void;
  setThemeId: (themeId: ThemeId) => void;
  updateHomeCopy: (title: string, description: string) => boolean;
  replaceAppData: (appData: AppData) => void;
  addTodo: (input: TodoInput) => boolean;
  updateTodo: (todoId: string, input: TodoInput) => boolean;
  setTodoCompleted: (todoId: string, completed: boolean) => void;
  deleteTodo: (todoId: string) => void;
  reorderTodos: (todoIds: string[]) => void;
};

const HabitContext = createContext<HabitContextValue | null>(null);

const initialState: HabitState = {
  appData: {
      version: 5,
      habits: [],
      groups: [],
      todos: [],
    settings: {
      themeId: DEFAULT_THEME_ID,
      homeHeroTitle: DEFAULT_HOME_HERO_TITLE,
      homeHeroDescription: DEFAULT_HOME_HERO_DESCRIPTION,
    },
  },
  isLoading: true,
  isHydrated: false,
  error: null,
};

function sortRecords(records: CheckinRecord[]) {
  return [...records].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return right.timestamp - left.timestamp;
    }

    return right.createdAt - left.createdAt;
  });
}

function createCheckinRecord(dateKey: string, timestamp: number, note: string): CheckinRecord {
  return {
    id: createId(),
    dateKey,
    timestamp: clampToMinute(timestamp),
    note: note.trim(),
    createdAt: Date.now(),
  };
}

function withUpdatedHabit(habits: Habit[], habitId: string, updater: (habit: Habit) => Habit) {
  return habits.map((habit) => (habit.id === habitId ? updater(habit) : habit));
}

function habitReducer(state: HabitState, action: HabitAction): HabitState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        appData: action.appData,
        isLoading: false,
        isHydrated: true,
      };
    case 'set-error':
      return { ...state, error: action.error };
    case 'clear-error':
      return { ...state, error: null };
    case 'replace-app-data':
      return { ...state, appData: action.appData };
    case 'set-theme-id':
      return {
        ...state,
        appData: {
          ...state.appData,
          settings: {
            ...state.appData.settings,
            themeId: action.themeId,
          },
        },
      };
    case 'update-home-copy':
      return {
        ...state,
        appData: {
          ...state.appData,
          settings: {
            ...state.appData.settings,
            homeHeroTitle: action.title,
            homeHeroDescription: action.description,
          },
        },
      };
    case 'add-group':
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: [...state.appData.groups, action.group],
        },
      };
    case 'rename-group':
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: state.appData.groups.map((group) =>
            group.id === action.groupId ? { ...group, name: action.name } : group
          ),
        },
      };
    case 'delete-group': {
      let nextUngroupedOrder = state.appData.habits.filter((habit) => habit.groupId === null).length;
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: state.appData.groups.filter((group) => group.id !== action.groupId),
          habits: state.appData.habits.map((habit) => {
            if (habit.groupId !== action.groupId) {
              return habit;
            }
            const movedHabit = { ...habit, groupId: null, order: nextUngroupedOrder };
            nextUngroupedOrder += 1;
            return movedHabit;
          }),
        },
      };
    }
    case 'reorder-groups': {
      const orderMap = new Map(action.groupIds.map((id, index) => [id, index]));
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: state.appData.groups
            .map((group) => ({ ...group, order: orderMap.get(group.id) ?? group.order }))
            .sort((left, right) => left.order - right.order),
        },
      };
    }
    case 'add-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: [...state.appData.habits, action.habit],
        },
      };
    case 'update-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            name: action.name,
            groupId: action.groupId,
            cadence: action.cadence,
            targetCount: action.targetCount,
            order: action.order,
          })),
        },
      };
    case 'reorder-habits': {
      const orderMap = new Map(action.habitIds.map((id, index) => [id, index]));
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: state.appData.habits.map((habit) =>
            habit.groupId === action.groupId && orderMap.has(habit.id)
              ? { ...habit, order: orderMap.get(habit.id) ?? habit.order }
              : habit
          ),
        },
      };
    }
    case 'archive-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            archivedAt: Date.now(),
          })),
        },
      };
    case 'restore-archived-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            archivedAt: null,
          })),
        },
      };
    case 'delete-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: state.appData.habits.filter((habit) => habit.id !== action.habitId),
        },
      };
    case 'add-checkin-now':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => {
            return {
              ...habit,
              checkins: sortRecords([...habit.checkins, action.record]),
            };
          }),
        },
      };
    case 'add-checkin':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            checkins: sortRecords([
              ...habit.checkins,
              createCheckinRecord(action.dateKey, action.timestamp, action.note),
            ]),
          })),
        },
      };
    case 'update-checkin':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            checkins: sortRecords(
              habit.checkins.map((record) =>
                record.id === action.recordId
                  ? {
                      ...record,
                      timestamp: clampToMinute(action.timestamp),
                      dateKey: toLocalDateKey(action.timestamp),
                      note: action.note.trim(),
                    }
                  : record
              )
            ),
          })),
        },
      };
    case 'delete-checkin':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            checkins: habit.checkins.filter((record) => record.id !== action.recordId),
          })),
        },
      };
    case 'add-todo':
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: [...state.appData.todos, action.todo],
        },
      };
    case 'update-todo':
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.map((todo) =>
            todo.id === action.todoId
              ? {
                  ...todo,
                  title: action.title,
                  note: action.note,
                  dueDateKey: action.dueDateKey,
                  dueTime: action.dueTime,
                  priority: action.priority,
                }
              : todo
          ),
        },
      };
    case 'set-todo-completed':
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.map((todo) =>
            todo.id === action.todoId ? { ...todo, completedAt: action.completedAt } : todo
          ),
        },
      };
    case 'delete-todo':
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.filter((todo) => todo.id !== action.todoId),
        },
      };
    case 'reorder-todos': {
      const orderMap = new Map(action.todoIds.map((id, index) => [id, index]));
      return {
        ...state,
        appData: {
          ...state.appData,
          todos: state.appData.todos.map((todo) => ({
            ...todo,
            order: orderMap.get(todo.id) ?? todo.order,
          })),
        },
      };
    }
    default:
      return state;
  }
}

export function HabitProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(habitReducer, initialState);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const appData = await loadAppDataFromDisk();
        if (!isMounted) {
          return;
        }
        dispatch({ type: 'hydrate', appData });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        dispatch({
          type: 'set-error',
          error: error instanceof Error ? error.message : '读取本地数据失败，请稍后重试。',
        });
        dispatch({ type: 'hydrate', appData: initialState.appData });
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!state.isHydrated) {
      return;
    }

    saveAppDataToDisk(state.appData).catch((error: unknown) => {
      dispatch({
        type: 'set-error',
        error: error instanceof Error ? error.message : '保存本地数据失败，请稍后重试。',
      });
    });
  }, [state.appData, state.isHydrated]);

  const clearError = useCallback(() => {
    dispatch({ type: 'clear-error' });
  }, []);

  const addGroup = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '分组名称不能为空。' });
        return false;
      }

      const exists = state.appData.groups.some(
        (group) => group.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        dispatch({ type: 'set-error', error: '分组名称已存在，请换一个。' });
        return false;
      }

      dispatch({
        type: 'add-group',
        group: {
          id: createId(),
          name: trimmed,
          order: state.appData.groups.length,
          createdAt: Date.now(),
        },
      });
      return true;
    },
    [state.appData.groups]
  );

  const renameGroup = useCallback(
    (groupId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '分组名称不能为空。' });
        return false;
      }

      const exists = state.appData.groups.some(
        (group) => group.id !== groupId && group.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        dispatch({ type: 'set-error', error: '分组名称已存在，请换一个。' });
        return false;
      }

      dispatch({ type: 'rename-group', groupId, name: trimmed });
      return true;
    },
    [state.appData.groups]
  );

  const deleteGroup = useCallback((groupId: string) => {
    dispatch({ type: 'delete-group', groupId });
  }, []);

  const reorderGroups = useCallback((groupIds: string[]) => {
    dispatch({ type: 'reorder-groups', groupIds });
  }, []);

  const addHabit = useCallback(
    (input: HabitInput) => {
      const trimmed = input.name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '习惯名称不能为空。' });
        return false;
      }

      const normalizedGroupId =
        input.groupId && state.appData.groups.some((group) => group.id === input.groupId)
          ? input.groupId
          : null;
      const nextOrder = state.appData.habits.filter(
        (habit) => habit.groupId === normalizedGroupId
      ).length;

      dispatch({
        type: 'add-habit',
        habit: {
          id: createId(),
          name: trimmed,
          groupId: normalizedGroupId,
          order: nextOrder,
          cadence: input.cadence,
          targetCount: Math.max(1, Math.floor(input.targetCount)),
          createdAt: Date.now(),
          archivedAt: null,
          checkins: [],
        },
      });
      return true;
    },
    [state.appData.groups, state.appData.habits]
  );

  const updateHabit = useCallback(
    (habitId: string, input: HabitInput) => {
      const trimmed = input.name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '习惯名称不能为空。' });
        return false;
      }
      const normalizedGroupId =
        input.groupId && state.appData.groups.some((group) => group.id === input.groupId)
          ? input.groupId
          : null;
      const currentHabit = state.appData.habits.find((habit) => habit.id === habitId);
      const nextOrder =
        currentHabit && currentHabit.groupId === normalizedGroupId
          ? currentHabit.order
          : state.appData.habits.filter((habit) => habit.groupId === normalizedGroupId).length;
      dispatch({
        type: 'update-habit',
        habitId,
        name: trimmed,
        groupId: normalizedGroupId,
        cadence: input.cadence,
        targetCount: Math.max(1, Math.floor(input.targetCount)),
        order: nextOrder,
      });
      return true;
    },
    [state.appData.groups, state.appData.habits]
  );

  const reorderHabits = useCallback((groupId: string | null, habitIds: string[]) => {
    dispatch({ type: 'reorder-habits', groupId, habitIds });
  }, []);

  const archiveHabit = useCallback((habitId: string) => {
    dispatch({ type: 'archive-habit', habitId });
  }, []);

  const restoreArchivedHabit = useCallback((habitId: string) => {
    dispatch({ type: 'restore-archived-habit', habitId });
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    dispatch({ type: 'delete-habit', habitId });
  }, []);

  const addCheckinNow = useCallback((habitId: string) => {
    const timestamp = clampToMinute(Date.now());
    const record = createCheckinRecord(getTodayKey(), timestamp, '');
    dispatch({ type: 'add-checkin-now', habitId, record });
    return record.id;
  }, []);

  const addCheckin = useCallback((habitId: string, dateKey: string, timestamp: number, note: string) => {
    dispatch({ type: 'add-checkin', habitId, dateKey, timestamp, note });
  }, []);

  const updateCheckin = useCallback(
    (habitId: string, recordId: string, timestamp: number, note: string) => {
      dispatch({ type: 'update-checkin', habitId, recordId, timestamp, note });
    },
    []
  );

  const deleteCheckin = useCallback((habitId: string, recordId: string) => {
    dispatch({ type: 'delete-checkin', habitId, recordId });
  }, []);

  const setThemeId = useCallback((themeId: ThemeId) => {
    dispatch({ type: 'set-theme-id', themeId });
  }, []);

  const updateHomeCopy = useCallback((title: string, description: string) => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      dispatch({ type: 'set-error', error: '说明文案标题和内容都不能为空。' });
      return false;
    }

    dispatch({
      type: 'update-home-copy',
      title: trimmedTitle,
      description: trimmedDescription,
    });
    return true;
  }, []);

  const replaceAppData = useCallback((appData: AppData) => {
    dispatch({ type: 'replace-app-data', appData });
  }, []);

  const addTodo = useCallback(
    (input: TodoInput) => {
      const title = input.title.trim();
      if (!title) {
        dispatch({ type: 'set-error', error: '待办标题不能为空。' });
        return false;
      }

      dispatch({
        type: 'add-todo',
        todo: {
          id: createId(),
          title,
          note: input.note.trim(),
          dueDateKey: input.dueDateKey,
          dueTime: input.dueTime,
          priority: input.priority,
          order: state.appData.todos.length,
          createdAt: Date.now(),
          completedAt: null,
        },
      });
      return true;
    },
    [state.appData.todos.length]
  );

  const updateTodo = useCallback((todoId: string, input: TodoInput) => {
    const title = input.title.trim();
    if (!title) {
      dispatch({ type: 'set-error', error: '待办标题不能为空。' });
      return false;
    }

    dispatch({
      type: 'update-todo',
      todoId,
      title,
      note: input.note.trim(),
      dueDateKey: input.dueDateKey,
      dueTime: input.dueTime,
      priority: input.priority,
    });
    return true;
  }, []);

  const setTodoCompleted = useCallback((todoId: string, completed: boolean) => {
    dispatch({ type: 'set-todo-completed', todoId, completedAt: completed ? Date.now() : null });
  }, []);

  const deleteTodo = useCallback((todoId: string) => {
    dispatch({ type: 'delete-todo', todoId });
  }, []);

  const reorderTodos = useCallback((todoIds: string[]) => {
    dispatch({ type: 'reorder-todos', todoIds });
  }, []);

  const value = useMemo(() => {
    const allHabits = state.appData.habits;
    const habits = allHabits.filter((habit) => habit.archivedAt === null);
    const archivedHabits = allHabits.filter((habit) => habit.archivedAt !== null);

    return {
      ...state,
      allHabits,
      habits,
      archivedHabits,
      groups: state.appData.groups,
      todos: state.appData.todos,
      settings: state.appData.settings,
      theme: getTheme(state.appData.settings.themeId),
      clearError,
      addGroup,
      renameGroup,
      deleteGroup,
      reorderGroups,
      addHabit,
      updateHabit,
      reorderHabits,
      archiveHabit,
      restoreArchivedHabit,
      deleteHabit,
      addCheckinNow,
      addCheckin,
      updateCheckin,
      deleteCheckin,
      setThemeId,
      updateHomeCopy,
      replaceAppData,
      addTodo,
      updateTodo,
      setTodoCompleted,
      deleteTodo,
      reorderTodos,
    };
  }, [
    state,
    clearError,
    addGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    addHabit,
    updateHabit,
    reorderHabits,
    archiveHabit,
    restoreArchivedHabit,
    deleteHabit,
    addCheckinNow,
    addCheckin,
    updateCheckin,
    deleteCheckin,
    setThemeId,
    updateHomeCopy,
    replaceAppData,
    addTodo,
    updateTodo,
    setTodoCompleted,
    deleteTodo,
    reorderTodos,
  ]);

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within HabitProvider');
  }
  return context;
}
