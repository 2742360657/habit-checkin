import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { DEFAULT_THEME_ID, THEME_PRESETS, ThemeId } from '../theme';
import {
  AppBackupFile,
  AppData,
  AppSettings,
  Habit,
  HabitGroup,
  LegacyHabitDataFile,
} from '../types/habit';

const DATA_DIRECTORY = `${FileSystem.documentDirectory}habit-checkin/`;
const DATA_FILE = `${DATA_DIRECTORY}data.json`;
const BACKUP_FILE_PREFIX = 'habit-checkin-backup';

export const DEFAULT_HOME_HERO_TITLE = '今天只看次数，记录保留真实时间';
export const DEFAULT_HOME_HERO_DESCRIPTION =
  '+1 会新增当前本地时间的真实记录，-1 只删除今天最近一次打卡。';

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in THEME_PRESETS;
}

function sanitizeHabitGroup(candidate: unknown): HabitGroup | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const raw = candidate as Partial<HabitGroup>;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.createdAt !== 'number'
  ) {
    return null;
  }

  return {
    id: raw.id,
    name: raw.name.trim(),
    createdAt: raw.createdAt,
  };
}

function sanitizeHabit(candidate: unknown): Habit | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const raw = candidate as Partial<Habit>;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.createdAt !== 'number' ||
    !Array.isArray(raw.checkins)
  ) {
    return null;
  }

  return {
    id: raw.id,
    name: raw.name.trim(),
    groupId: typeof raw.groupId === 'string' ? raw.groupId : null,
    createdAt: raw.createdAt,
    hiddenAt: typeof raw.hiddenAt === 'number' ? raw.hiddenAt : null,
    checkins: raw.checkins.filter((value): value is number => typeof value === 'number'),
  };
}

function sanitizeSettings(candidate: unknown): AppSettings {
  const raw = candidate && typeof candidate === 'object' ? (candidate as Partial<AppSettings>) : {};

  return {
    themeId: isThemeId(raw.themeId) ? raw.themeId : DEFAULT_THEME_ID,
    homeHeroTitle:
      typeof raw.homeHeroTitle === 'string' && raw.homeHeroTitle.trim()
        ? raw.homeHeroTitle.trim()
        : DEFAULT_HOME_HERO_TITLE,
    homeHeroDescription:
      typeof raw.homeHeroDescription === 'string' && raw.homeHeroDescription.trim()
        ? raw.homeHeroDescription.trim()
        : DEFAULT_HOME_HERO_DESCRIPTION,
  };
}

function buildDefaultAppData(): AppData {
  return {
    version: 2,
    habits: [],
    groups: [],
    settings: sanitizeSettings(null),
  };
}

function normalizeAppData(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('数据格式无效。');
  }

  const raw = candidate as Partial<AppData>;
  const groups = Array.isArray(raw.groups)
    ? raw.groups
        .map(sanitizeHabitGroup)
        .filter((group): group is HabitGroup => group !== null)
        .sort((left, right) => left.createdAt - right.createdAt)
    : [];

  const groupIds = new Set(groups.map((group) => group.id));

  const habits = Array.isArray(raw.habits)
    ? raw.habits
        .map(sanitizeHabit)
        .filter((habit): habit is Habit => habit !== null)
        .map((habit) => ({
          ...habit,
          groupId: habit.groupId && groupIds.has(habit.groupId) ? habit.groupId : null,
        }))
        .sort((left, right) => left.createdAt - right.createdAt)
    : [];

  return {
    version: 2,
    habits,
    groups,
    settings: sanitizeSettings(raw.settings),
  };
}

function migrateLegacyData(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('旧版数据格式无效。');
  }

  const raw = candidate as LegacyHabitDataFile;
  if (raw.version !== 1 || !Array.isArray(raw.habits)) {
    throw new Error('旧版数据格式无效。');
  }

  const habits = raw.habits
    .map((habit) =>
      sanitizeHabit({
        ...habit,
        groupId: null,
        hiddenAt: null,
      })
    )
    .filter((habit): habit is Habit => habit !== null)
    .sort((left, right) => left.createdAt - right.createdAt);

  return {
    version: 2,
    habits,
    groups: [],
    settings: sanitizeSettings(null),
  };
}

export function coerceAppData(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('数据格式无效。');
  }

  const raw = candidate as { version?: unknown };
  if (raw.version === 2) {
    return normalizeAppData(candidate);
  }
  if (raw.version === 1) {
    return migrateLegacyData(candidate);
  }

  throw new Error('不支持的数据版本。');
}

export function buildBackupPayload(appData: AppData): string {
  const backup: AppBackupFile = {
    ...appData,
    exportedAt: Date.now(),
  };

  return JSON.stringify(backup, null, 2);
}

async function ensureStorageDirectory() {
  const directoryInfo = await FileSystem.getInfoAsync(DATA_DIRECTORY);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(DATA_DIRECTORY, { intermediates: true });
  }
}

export async function loadAppDataFromDisk(): Promise<AppData> {
  await ensureStorageDirectory();

  const fileInfo = await FileSystem.getInfoAsync(DATA_FILE);
  if (!fileInfo.exists) {
    return buildDefaultAppData();
  }

  const fileContents = await FileSystem.readAsStringAsync(DATA_FILE);
  return coerceAppData(JSON.parse(fileContents));
}

export async function saveAppDataToDisk(appData: AppData) {
  await ensureStorageDirectory();
  await FileSystem.writeAsStringAsync(DATA_FILE, JSON.stringify(appData, null, 2));
}

export async function exportBackupFile(appData: AppData) {
  const fileName = `${BACKUP_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.json`;
  const exportUri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(exportUri, buildBackupPayload(appData));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('当前环境不支持系统分享，请在支持分享的设备上操作。');
  }

  await Sharing.shareAsync(exportUri, {
    mimeType: 'application/json',
    dialogTitle: '导出备份',
    UTI: 'public.json',
  });
}

export async function pickBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0] ?? null;
}

export async function importBackupFile(fileUri: string): Promise<AppData> {
  const fileContents = await FileSystem.readAsStringAsync(fileUri);
  return coerceAppData(JSON.parse(fileContents));
}

export function getGroupUsageCount(habits: Habit[], groupId: string) {
  return habits.filter((habit) => habit.groupId === groupId).length;
}

export function getHabitDataFilePath() {
  return DATA_FILE;
}
