import type { ThemeId } from '../theme';

export type CheckinRecord = {
  id: string;
  dateKey: string;
  timestamp: number;
  note: string;
  createdAt: number;
};

export type Habit = {
  id: string;
  name: string;
  groupId: string | null;
  createdAt: number;
  archivedAt: number | null;
  checkins: CheckinRecord[];
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
  version: 4;
  habits: Habit[];
  groups: HabitGroup[];
  settings: AppSettings;
};

export type AppBackupFile = AppData & {
  exportedAt: number;
};

export type LegacyV1HabitDataFile = {
  version: 1;
  habits: Array<{
    id: string;
    name: string;
    createdAt: number;
    checkins: number[];
  }>;
};

export type LegacyV2AppDataFile = {
  version: 2;
  habits: Array<{
    id: string;
    name: string;
    groupId: string | null;
    createdAt: number;
    hiddenAt?: number | null;
    checkins: number[];
  }>;
  groups: HabitGroup[];
  settings: AppSettings;
};

export type LegacyV3CheckinRecord = {
  id: string;
  dateKey: string;
  hasTime: boolean;
  timestamp: number | null;
  createdAt: number;
};

export type LegacyV3AppDataFile = {
  version: 3;
  habits: Array<{
    id: string;
    name: string;
    groupId: string | null;
    createdAt: number;
    hiddenAt?: number | null;
    archivedAt?: number | null;
    checkins: Array<number | LegacyV3CheckinRecord>;
  }>;
  groups: HabitGroup[];
  settings: AppSettings;
};
