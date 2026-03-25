import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { DEFAULT_THEME_ID, THEME_PRESETS, ThemeId } from '../theme';
import {
  AppBackupFile,
  AppData,
  AppSettings,
  CheckinRecord,
  Habit,
  HabitGroup,
  LegacyV1HabitDataFile,
  LegacyV2AppDataFile,
  LegacyV3AppDataFile,
  LegacyV3CheckinRecord,
} from '../types/habit';
import { buildFallbackTimestamp, clampToMinute, toLocalDateKey } from '../utils/date';
import { createId } from '../utils/id';

const DATA_DIRECTORY = `${FileSystem.documentDirectory}habit-checkin/`;
const DATA_FILE = `${DATA_DIRECTORY}data.json`;
const BACKUP_FILE_PREFIX = 'habit-checkin-backup';

export const DEFAULT_HOME_HERO_TITLE = '今天只管打卡，记录会留在习惯里';
export const DEFAULT_HOME_HERO_DESCRIPTION =
  '点击右侧 +1 会新增当前本地时间的真实记录，更多编辑统一放到习惯详情里处理。';

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in THEME_PRESETS;
}

function migrateTimestampToRecord(timestamp: number): CheckinRecord {
  return {
    id: createId(),
    dateKey: toLocalDateKey(timestamp),
    timestamp,
    note: '',
    createdAt: timestamp,
  };
}

function migrateLegacyRecord(record: LegacyV3CheckinRecord): CheckinRecord {
  const timestamp =
    typeof record.timestamp === 'number' ? record.timestamp : buildFallbackTimestamp(record.dateKey);

  return {
    id: record.id,
    dateKey: record.dateKey,
    timestamp,
    note: '',
    createdAt: record.createdAt,
  };
}

function sanitizeCheckinRecord(candidate: unknown): CheckinRecord | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const raw = candidate as Partial<CheckinRecord> & Partial<LegacyV3CheckinRecord>;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.dateKey !== 'string' ||
    typeof raw.createdAt !== 'number'
  ) {
    return null;
  }

  if (typeof raw.timestamp === 'number') {
    return {
      id: raw.id,
      dateKey: raw.dateKey,
      timestamp: raw.timestamp,
      note: typeof raw.note === 'string' ? raw.note : '',
      createdAt: raw.createdAt,
    };
  }

  if (typeof raw.hasTime === 'boolean') {
    return migrateLegacyRecord({
      id: raw.id,
      dateKey: raw.dateKey,
      hasTime: raw.hasTime,
      timestamp: raw.timestamp ?? null,
      createdAt: raw.createdAt,
    });
  }

  return null;
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

  const raw = candidate as Partial<Habit> & {
    hiddenAt?: unknown;
    archivedAt?: unknown;
    checkins?: unknown;
  };
  if (
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.createdAt !== 'number' ||
    !Array.isArray(raw.checkins)
  ) {
    return null;
  }

  const normalizedCheckins = raw.checkins
    .map((item) => {
      if (typeof item === 'number') {
        return migrateTimestampToRecord(item);
      }
      return sanitizeCheckinRecord(item);
    })
    .filter((record): record is CheckinRecord => record !== null)
    .map((record) => ({
      ...record,
      dateKey: toLocalDateKey(record.timestamp),
      timestamp: clampToMinute(record.timestamp),
      note: record.note.trim(),
    }));

  return {
    id: raw.id,
    name: raw.name.trim(),
    groupId: typeof raw.groupId === 'string' ? raw.groupId : null,
    createdAt: raw.createdAt,
    archivedAt:
      typeof raw.archivedAt === 'number'
        ? raw.archivedAt
        : typeof raw.hiddenAt === 'number'
          ? raw.hiddenAt
          : null,
    checkins: normalizedCheckins,
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
    version: 4,
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
    version: 4,
    habits,
    groups,
    settings: sanitizeSettings(raw.settings),
  };
}

function migrateLegacyV1Data(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('旧版数据格式无效。');
  }

  const raw = candidate as LegacyV1HabitDataFile;
  if (raw.version !== 1 || !Array.isArray(raw.habits)) {
    throw new Error('旧版数据格式无效。');
  }

  const habits = raw.habits
    .map((habit) =>
      sanitizeHabit({
        ...habit,
        groupId: null,
        archivedAt: null,
      })
    )
    .filter((habit): habit is Habit => habit !== null)
    .sort((left, right) => left.createdAt - right.createdAt);

  return {
    version: 4,
    habits,
    groups: [],
    settings: sanitizeSettings(null),
  };
}

function migrateLegacyV2Data(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('旧版数据格式无效。');
  }

  const raw = candidate as LegacyV2AppDataFile;
  if (raw.version !== 2) {
    throw new Error('旧版数据格式无效。');
  }

  return normalizeAppData({
    ...raw,
    version: 4,
    habits: raw.habits.map((habit) => ({
      ...habit,
      archivedAt: habit.hiddenAt ?? null,
    })),
  });
}

function migrateLegacyV3Data(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('旧版数据格式无效。');
  }

  const raw = candidate as LegacyV3AppDataFile;
  if (raw.version !== 3) {
    throw new Error('旧版数据格式无效。');
  }

  return normalizeAppData({
    ...raw,
    version: 4,
  });
}

export function coerceAppData(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('数据格式无效。');
  }

  const raw = candidate as { version?: unknown };
  if (raw.version === 4) {
    return normalizeAppData(candidate);
  }
  if (raw.version === 3) {
    return migrateLegacyV3Data(candidate);
  }
  if (raw.version === 2) {
    return migrateLegacyV2Data(candidate);
  }
  if (raw.version === 1) {
    return migrateLegacyV1Data(candidate);
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
