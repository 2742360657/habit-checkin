const pad = (value: number) => String(value).padStart(2, '0');

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export function toLocalDateKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toMonthKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

export function formatMonthLabel(year: number, monthIndex: number) {
  return `${year}年${monthIndex + 1}月`;
}

export function formatYearLabel(year: number) {
  return `${year}年`;
}

export function getTodayKey() {
  return toLocalDateKey(Date.now());
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return toLocalDateKey(new Date(year, month - 1, day + days, 12, 0, 0, 0).getTime());
}

export function isValidDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return false;
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatFriendlyDate(dateKey: string) {
  const todayKey = getTodayKey();
  if (dateKey === todayKey) {
    return '今天';
  }
  if (dateKey === addDaysToDateKey(todayKey, 1)) {
    return '明天';
  }
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}月${day}日`;
}

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getMonthStartWeekday(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).getDay();
}

export function compareDateKeys(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function isFutureDateKey(dateKey: string) {
  return compareDateKeys(dateKey, getTodayKey()) > 0;
}

export function getHourMinuteFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

export function buildTimestampForDateTime(dateKey: string, hour: number, minute: number) {
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const next = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    next.getFullYear() !== year ||
    next.getMonth() !== month - 1 ||
    next.getDate() !== day
  ) {
    return null;
  }

  return next.getTime();
}

export function buildFallbackTimestamp(dateKey: string) {
  return buildTimestampForDateTime(dateKey, 12, 0) ?? Date.now();
}

export function clampToMinute(timestamp: number) {
  const date = new Date(timestamp);
  date.setSeconds(0, 0);
  return date.getTime();
}
