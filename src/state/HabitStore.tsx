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
import { AppData, AppSettings, CheckinRecord, Habit, HabitGroup } from '../types/habit';
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
  | { type: 'add-group'; name: string }
  | { type: 'delete-group'; groupId: string }
  | { type: 'add-habit'; name: string; groupId: string | null }
  | { type: 'rename-habit'; habitId: string; name: string }
  | { type: 'move-habit'; habitId: string; groupId: string | null }
  | { type: 'archive-habit'; habitId: string }
  | { type: 'restore-archived-habit'; habitId: string }
  | { type: 'delete-habit'; habitId: string }
  | { type: 'add-checkin-now'; habitId: string }
  | { type: 'add-checkin'; habitId: string; dateKey: string; timestamp: number; note: string }
  | {
      type: 'update-checkin';
      habitId: string;
      recordId: string;
      timestamp: number;
      note: string;
    }
  | { type: 'delete-checkin'; habitId: string; recordId: string };

type HabitContextValue = HabitState & {
  allHabits: Habit[];
  habits: Habit[];
  archivedHabits: Habit[];
  groups: HabitGroup[];
  settings: AppSettings;
  theme: ReturnType<typeof getTheme>;
  clearError: () => void;
  addGroup: (name: string) => boolean;
  deleteGroup: (groupId: string) => void;
  addHabit: (name: string, groupId: string | null) => boolean;
  renameHabit: (habitId: string, name: string) => boolean;
  moveHabitToGroup: (habitId: string, groupId: string | null) => void;
  archiveHabit: (habitId: string) => void;
  restoreArchivedHabit: (habitId: string) => void;
  deleteHabit: (habitId: string) => void;
  addCheckinNow: (habitId: string) => void;
  addCheckin: (habitId: string, dateKey: string, timestamp: number, note: string) => void;
  updateCheckin: (habitId: string, recordId: string, timestamp: number, note: string) => void;
  deleteCheckin: (habitId: string, recordId: string) => void;
  setThemeId: (themeId: ThemeId) => void;
  updateHomeCopy: (title: string, description: string) => boolean;
  replaceAppData: (appData: AppData) => void;
};

const HabitContext = createContext<HabitContextValue | null>(null);

const initialState: HabitState = {
  appData: {
    version: 4,
    habits: [],
    groups: [],
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
          groups: [
            ...state.appData.groups,
            {
              id: createId(),
              name: action.name,
              createdAt: Date.now(),
            },
          ],
        },
      };
    case 'delete-group':
      return {
        ...state,
        appData: {
          ...state.appData,
          groups: state.appData.groups.filter((group) => group.id !== action.groupId),
          habits: state.appData.habits.map((habit) =>
            habit.groupId === action.groupId ? { ...habit, groupId: null } : habit
          ),
        },
      };
    case 'add-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: [
            ...state.appData.habits,
            {
              id: createId(),
              name: action.name,
              groupId: action.groupId,
              createdAt: Date.now(),
              archivedAt: null,
              checkins: [],
            },
          ],
        },
      };
    case 'rename-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            name: action.name,
          })),
        },
      };
    case 'move-habit':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: withUpdatedHabit(state.appData.habits, action.habitId, (habit) => ({
            ...habit,
            groupId: action.groupId,
          })),
        },
      };
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
            const timestamp = clampToMinute(Date.now());
            return {
              ...habit,
              checkins: sortRecords([
                ...habit.checkins,
                createCheckinRecord(getTodayKey(), timestamp, ''),
              ]),
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

      dispatch({ type: 'add-group', name: trimmed });
      return true;
    },
    [state.appData.groups]
  );

  const deleteGroup = useCallback((groupId: string) => {
    dispatch({ type: 'delete-group', groupId });
  }, []);

  const addHabit = useCallback(
    (name: string, groupId: string | null) => {
      const trimmed = name.trim();
      if (!trimmed) {
        dispatch({ type: 'set-error', error: '习惯名称不能为空。' });
        return false;
      }

      const normalizedGroupId =
        groupId && state.appData.groups.some((group) => group.id === groupId) ? groupId : null;

      dispatch({ type: 'add-habit', name: trimmed, groupId: normalizedGroupId });
      return true;
    },
    [state.appData.groups]
  );

  const renameHabit = useCallback((habitId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      dispatch({ type: 'set-error', error: '习惯名称不能为空。' });
      return false;
    }

    dispatch({ type: 'rename-habit', habitId, name: trimmed });
    return true;
  }, []);

  const moveHabitToGroup = useCallback(
    (habitId: string, groupId: string | null) => {
      const normalizedGroupId =
        groupId && state.appData.groups.some((group) => group.id === groupId) ? groupId : null;
      dispatch({ type: 'move-habit', habitId, groupId: normalizedGroupId });
    },
    [state.appData.groups]
  );

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
    dispatch({ type: 'add-checkin-now', habitId });
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
      settings: state.appData.settings,
      theme: getTheme(state.appData.settings.themeId),
      clearError,
      addGroup,
      deleteGroup,
      addHabit,
      renameHabit,
      moveHabitToGroup,
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
    };
  }, [
    state,
    clearError,
    addGroup,
    deleteGroup,
    addHabit,
    renameHabit,
    moveHabitToGroup,
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
