import { Habit } from '../types/habit';
import { getDaysInMonth, getTodayKey, toLocalDateKey, toMonthKey } from './date';

export function getTodayCheckins(habit: Habit) {
  const todayKey = getTodayKey();
  return habit.checkins
    .filter((timestamp) => toLocalDateKey(timestamp) === todayKey)
    .sort((left, right) => right - left);
}

export function getTodayCount(habit: Habit) {
  return getTodayCheckins(habit).length;
}

export function buildDateCountMap(habit: Habit) {
  return habit.checkins.reduce<Record<string, number>>((result, timestamp) => {
    const key = toLocalDateKey(timestamp);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

export function getMonthTotal(habit: Habit, year: number, monthIndex: number) {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  return habit.checkins.reduce((count, timestamp) => {
    return count + (toMonthKey(timestamp) === monthKey ? 1 : 0);
  }, 0);
}

export function getYearTotal(habit: Habit, year: number) {
  return habit.checkins.reduce((count, timestamp) => {
    return count + (new Date(timestamp).getFullYear() === year ? 1 : 0);
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
