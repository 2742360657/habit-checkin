import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useHabits } from '../state/HabitStore';
import { getDaysInMonth, getMonthStartWeekday, WEEKDAY_LABELS } from '../utils/date';

type HistoryCalendarProps = {
  year: number;
  monthIndex: number;
  dateCountMap: Record<string, number>;
  compact?: boolean;
};

type CalendarCell = {
  key: string;
  day: number | null;
  count: number;
};

function createCalendarCells(
  year: number,
  monthIndex: number,
  dateCountMap: Record<string, number>
): CalendarCell[] {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const monthStartWeekday = getMonthStartWeekday(year, monthIndex);
  const cells: CalendarCell[] = [];

  for (let blank = 0; blank < monthStartWeekday; blank += 1) {
    cells.push({ key: `blank-${blank}`, day: null, count: 0 });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      key,
      day,
      count: dateCountMap[key] ?? 0,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${cells.length}`, day: null, count: 0 });
  }

  return cells;
}

export function HistoryCalendar({
  year,
  monthIndex,
  dateCountMap,
  compact = false,
}: HistoryCalendarProps) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const cells = createCalendarCells(year, monthIndex, dateCountMap);

  return (
    <View style={styles.wrapper}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={[styles.weekdayLabel, compact && styles.weekdayLabelCompact]}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell) => {
          if (cell.day === null) {
            return <View key={cell.key} style={[styles.cell, compact && styles.cellCompact]} />;
          }

          const isActive = cell.count > 0;

          return (
            <View
              key={cell.key}
              style={[
                styles.cell,
                compact && styles.cellCompact,
                isActive ? styles.activeCell : styles.idleCell,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  compact && styles.dayTextCompact,
                  isActive && styles.activeDayText,
                ]}
              >
                {cell.day}
              </Text>
              <Text
                style={[
                  styles.countText,
                  compact && styles.countTextCompact,
                  isActive && styles.activeCountText,
                ]}
                numberOfLines={1}
              >
                {cell.count > 0 ? `${cell.count}次` : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    wrapper: {
      gap: 10,
    },
    weekdayRow: {
      flexDirection: 'row',
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    weekdayLabelCompact: {
      fontSize: 10,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderRadius: theme.radius.small,
      overflow: 'hidden',
    },
    cell: {
      width: '14.2857%',
      minHeight: 58,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 0.5,
      borderColor: theme.colors.background,
    },
    cellCompact: {
      minHeight: 42,
      paddingVertical: 6,
    },
    idleCell: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    activeCell: {
      backgroundColor: theme.colors.primarySoft,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    dayTextCompact: {
      fontSize: 11,
    },
    activeDayText: {
      color: theme.colors.primary,
    },
    countText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
    },
    countTextCompact: {
      fontSize: 8,
    },
    activeCountText: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
  });
}
