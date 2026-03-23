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
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
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

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function shiftMonth(year: number, monthIndex: number, delta: number) {
  const next = new Date(year, monthIndex + delta, 1);
  return {
    year: next.getFullYear(),
    monthIndex: next.getMonth(),
  };
}

export function getMonthStartWeekday(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).getDay();
}
