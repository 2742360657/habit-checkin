import { CheckinRecord, Habit } from '../types/habit';
import { getDaysInMonth, getTodayKey } from './date';

function sortCheckinRecords(left: CheckinRecord, right: CheckinRecord) {
  if (left.timestamp !== right.timestamp) {
    return right.timestamp - left.timestamp;
  }

  return right.createdAt - left.createdAt;
}

export function getCheckinRecordsByDate(habit: Habit, dateKey: string) {
  return habit.checkins
    .filter((record) => record.dateKey === dateKey)
    .sort(sortCheckinRecords);
}

export function getTodayCheckins(habit: Habit) {
  return getCheckinRecordsByDate(habit, getTodayKey());
}

export function getTodayCount(habit: Habit) {
  return getTodayCheckins(habit).length;
}

export function buildDateCountMap(habit: Habit) {
  return habit.checkins.reduce<Record<string, number>>((result, record) => {
    result[record.dateKey] = (result[record.dateKey] ?? 0) + 1;
    return result;
  }, {});
}

export function getMonthTotal(habit: Habit, year: number, monthIndex: number) {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  return habit.checkins.reduce((count, record) => {
    return count + (record.dateKey.slice(0, 7) === monthKey ? 1 : 0);
  }, 0);
}

export function getYearTotal(habit: Habit, year: number) {
  return habit.checkins.reduce((count, record) => {
    return count + (record.dateKey.startsWith(`${year}-`) ? 1 : 0);
  }, 0);
}

export function getActiveDayCountInMonth(habit: Habit, year: number, monthIndex: number) {
  const dateCountMap = buildDateCountMap(habit);
  const daysInMonth = getDaysInMonth(year, monthIndex);
  let activeDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateCountMap[key]) {
      activeDays += 1;
    }
  }

  return activeDays;
}
