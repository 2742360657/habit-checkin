import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import { DEFAULT_THEME_ID, getTheme, ThemeId } from '../theme';
import { loadAppDataFromDisk, saveAppDataToDisk } from '../storage/habitStorage';
import { AppData, AppSettings, Habit, HabitGroup } from '../types/habit';
import { createId } from '../utils/id';
import { getTodayCheckins } from '../utils/habit';

type HabitState = {
  appData: AppData;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  selectedHabitId: string | null;
};

type HabitAction =
  | { type: 'hydrate'; appData: AppData }
  | { type: 'set-error'; error: string | null }
  | { type: 'clear-error' }
  | { type: 'select-habit'; habitId: string | null }
  | { type: 'replace-app-data'; appData: AppData }
  | { type: 'set-theme-id'; themeId: ThemeId }
  | { type: 'update-home-copy'; title: string; description: string }
  | { type: 'add-group'; name: string }
  | { type: 'delete-group'; groupId: string }
  | { type: 'add-habit'; name: string; groupId: string | null }
  | { type: 'delete-habit'; habitId: string }
  | { type: 'add-checkin'; habitId: string }
  | { type: 'remove-latest-today-checkin'; habitId: string };

type HabitContextValue = HabitState & {
  habits: Habit[];
  groups: HabitGroup[];
  settings: AppSettings;
  theme: ReturnType<typeof getTheme>;
  clearError: () => void;
  addGroup: (name: string) => boolean;
  deleteGroup: (groupId: string) => void;
  addHabit: (name: string, groupId: string | null) => boolean;
  deleteHabit: (habitId: string) => void;
  addCheckin: (habitId: string) => void;
  removeLatestTodayCheckin: (habitId: string) => void;
  setSelectedHabitId: (habitId: string | null) => void;
  setThemeId: (themeId: ThemeId) => void;
  updateHomeCopy: (title: string, description: string) => boolean;
  replaceAppData: (appData: AppData) => void;
};

const HabitContext = createContext<HabitContextValue | null>(null);

const initialState: HabitState = {
  appData: {
    version: 2,
    habits: [],
    groups: [],
    settings: {
      themeId: DEFAULT_THEME_ID,
      homeHeroTitle: '',
      homeHeroDescription: '',
    },
  },
  isLoading: true,
  isHydrated: false,
  error: null,
  selectedHabitId: null,
};

function resolveSelectedHabitId(
  selectedHabitId: string | null,
  habits: Habit[],
  fallbackToFirst = true
) {
  if (selectedHabitId && habits.some((habit) => habit.id === selectedHabitId)) {
    return selectedHabitId;
  }

  return fallbackToFirst ? (habits[0]?.id ?? null) : null;
}

function habitReducer(state: HabitState, action: HabitAction): HabitState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        appData: action.appData,
        isLoading: false,
        isHydrated: true,
        selectedHabitId: resolveSelectedHabitId(null, action.appData.habits),
      };
    case 'set-error':
      return {
        ...state,
        error: action.error,
      };
    case 'clear-error':
      return {
        ...state,
        error: null,
      };
    case 'select-habit':
      return {
        ...state,
        selectedHabitId: action.habitId,
      };
    case 'replace-app-data':
      return {
        ...state,
        appData: action.appData,
        selectedHabitId: resolveSelectedHabitId(state.selectedHabitId, action.appData.habits),
      };
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
    case 'add-group': {
      const nextGroup: HabitGroup = {
        id: createId(),
        name: action.name,
        createdAt: Date.now(),
      };

      return {
        ...state,
        appData: {
          ...state.appData,
          groups: [...state.appData.groups, nextGroup],
        },
      };
    }
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
    case 'add-habit': {
      const nextHabit: Habit = {
        id: createId(),
        name: action.name,
        groupId: action.groupId,
        createdAt: Date.now(),
        checkins: [],
      };

      const habits = [...state.appData.habits, nextHabit];
      return {
        ...state,
        appData: {
          ...state.appData,
          habits,
        },
        selectedHabitId: resolveSelectedHabitId(state.selectedHabitId ?? nextHabit.id, habits),
      };
    }
    case 'delete-habit': {
      const habits = state.appData.habits.filter((habit) => habit.id !== action.habitId);
      return {
        ...state,
        appData: {
          ...state.appData,
          habits,
        },
        selectedHabitId: resolveSelectedHabitId(state.selectedHabitId, habits),
      };
    }
    case 'add-checkin':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: state.appData.habits.map((habit) =>
            habit.id === action.habitId
              ? {
                  ...habit,
                  checkins: [...habit.checkins, Date.now()].sort((left, right) => left - right),
                }
              : habit
          ),
        },
      };
    case 'remove-latest-today-checkin':
      return {
        ...state,
        appData: {
          ...state.appData,
          habits: state.appData.habits.map((habit) => {
            if (habit.id !== action.habitId) {
              return habit;
            }

            const todayCheckins = getTodayCheckins(habit);
            if (todayCheckins.length === 0) {
              return habit;
            }

            const latestTimestamp = todayCheckins[0];
            const nextCheckins = [...habit.checkins];
            const removeIndex = nextCheckins.lastIndexOf(latestTimestamp);

            if (removeIndex < 0) {
              return habit;
            }

            nextCheckins.splice(removeIndex, 1);
            return {
              ...habit,
              checkins: nextCheckins,
            };
          }),
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
        dispatch({
          type: 'hydrate',
          appData: {
            version: 2,
            habits: [],
            groups: [],
            settings: {
              themeId: DEFAULT_THEME_ID,
              homeHeroTitle: '',
              homeHeroDescription: '',
            },
          },
        });
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

  const deleteHabit = useCallback((habitId: string) => {
    dispatch({ type: 'delete-habit', habitId });
  }, []);

  const addCheckin = useCallback((habitId: string) => {
    dispatch({ type: 'add-checkin', habitId });
  }, []);

  const removeLatestTodayCheckin = useCallback((habitId: string) => {
    dispatch({ type: 'remove-latest-today-checkin', habitId });
  }, []);

  const setSelectedHabitId = useCallback((habitId: string | null) => {
    dispatch({ type: 'select-habit', habitId });
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

  const value = useMemo(
    () => ({
      ...state,
      habits: state.appData.habits,
      groups: state.appData.groups,
      settings: state.appData.settings,
      theme: getTheme(state.appData.settings.themeId),
      clearError,
      addGroup,
      deleteGroup,
      addHabit,
      deleteHabit,
      addCheckin,
      removeLatestTodayCheckin,
      setSelectedHabitId,
      setThemeId,
      updateHomeCopy,
      replaceAppData,
    }),
    [
      state,
      clearError,
      addGroup,
      deleteGroup,
      addHabit,
      deleteHabit,
      addCheckin,
      removeLatestTodayCheckin,
      setSelectedHabitId,
      setThemeId,
      updateHomeCopy,
      replaceAppData,
    ]
  );

  return <HabitContext.Provider value={value}>{children}</HabitContext.Provider>;
}

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within HabitProvider');
  }
  return context;
}
