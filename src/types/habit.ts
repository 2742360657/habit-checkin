import type { ThemeId } from '../theme';

export type Habit = {
  id: string;
  name: string;
  groupId: string | null;
  createdAt: number;
  checkins: number[];
};

export type HabitGroup = {
  id: string;
  name: string;
  createdAt: number;
};

export type AppSettings = {
  themeId: ThemeId;
  homeHeroTitle: string;
  homeHeroDescription: string;
};

export type AppData = {
  version: 2;
  habits: Habit[];
  groups: HabitGroup[];
  settings: AppSettings;
};

export type AppBackupFile = AppData & {
  exportedAt: number;
};

export type LegacyHabitDataFile = {
  version: 1;
  habits: Array<{
    id: string;
    name: string;
    createdAt: number;
    checkins: number[];
  }>;
};
