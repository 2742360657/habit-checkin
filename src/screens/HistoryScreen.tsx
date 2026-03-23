import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DayCheckinsModal } from '../components/DayCheckinsModal';
import { HistoryCalendar } from '../components/HistoryCalendar';
import { useHabits } from '../state/HabitStore';
import { formatMonthLabel, formatYearLabel } from '../utils/date';
import {
  buildDateCountMap,
  getActiveDayCountInMonth,
  getMonthTotal,
  getYearTotal,
} from '../utils/habit';

export function HistoryScreen() {
  const { habits, selectedHabitId, setSelectedHabitId, theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const today = new Date();
  const [focusYear, setFocusYear] = useState(today.getFullYear());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const selectedHabit = useMemo(
    () => habits.find((habit) => habit.id === selectedHabitId) ?? habits[0] ?? null,
    [habits, selectedHabitId]
  );

  const dateCountMap = useMemo(
    () => (selectedHabit ? buildDateCountMap(selectedHabit) : {}),
    [selectedHabit]
  );

  const handleSelectHabit = (habitId: string) => {
    setSelectedHabitId(habitId);
    setSelectedDateKey(null);
  };

  if (habits.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>暂无可查看的历史</Text>
        <Text style={styles.emptyDescription}>先在“习惯”页创建习惯，或到设置页恢复已隐藏的习惯。</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择习惯</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitTabs}>
            {habits.map((habit) => {
              const isActive = selectedHabit?.id === habit.id;
              return (
                <TouchableOpacity
                  key={habit.id}
                  onPress={() => handleSelectHabit(habit.id)}
                  style={[styles.habitTab, isActive && styles.habitTabActive]}
                >
                  <Text style={[styles.habitTabText, isActive && styles.habitTabTextActive]}>{habit.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {selectedHabit ? (
          <View style={styles.panel}>
            <View style={styles.periodHeader}>
              <TouchableOpacity onPress={() => setFocusYear((current) => current - 1)} style={styles.periodButton}>
                <Text style={styles.periodButtonText}>上一年</Text>
              </TouchableOpacity>
              <View style={styles.periodCenter}>
                <Text style={styles.periodTitle}>{formatYearLabel(focusYear)}</Text>
                <Text style={styles.periodMeta}>全年共 {getYearTotal(selectedHabit, focusYear)} 次打卡</Text>
              </View>
              <TouchableOpacity onPress={() => setFocusYear((current) => current + 1)} style={styles.periodButton}>
                <Text style={styles.periodButtonText}>下一年</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>点击有记录的日期，可查看当天次数、时间并编辑。</Text>

            <View style={styles.yearGrid}>
              {Array.from({ length: 12 }).map((_, monthIndex) => (
                <View key={`${focusYear}-${monthIndex}`} style={styles.monthCard}>
                  <Text style={styles.monthCardTitle}>{formatMonthLabel(focusYear, monthIndex)}</Text>
                  <Text style={styles.monthCardMeta}>
                    {getMonthTotal(selectedHabit, focusYear, monthIndex)} 次 ·
                    {getActiveDayCountInMonth(selectedHabit, focusYear, monthIndex)} 天
                  </Text>
                  <HistoryCalendar
                    year={focusYear}
                    monthIndex={monthIndex}
                    dateCountMap={dateCountMap}
                    compact
                    selectedDateKey={selectedDateKey}
                    onPressDay={(dateKey, count) => {
                      if (count > 0) {
                        setSelectedDateKey(dateKey);
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <DayCheckinsModal
        habit={selectedHabit}
        dateKey={selectedDateKey}
        visible={selectedDateKey !== null}
        onClose={() => setSelectedDateKey(null)}
      />
    </>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 18,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    habitTabs: {
      gap: 10,
    },
    habitTab: {
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    habitTabActive: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primary,
    },
    habitTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    habitTabTextActive: {
      color: theme.colors.primary,
    },
    panel: {
      borderRadius: theme.radius.large,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 18,
      ...theme.shadow,
    },
    periodHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    periodCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    periodTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    periodMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    periodButton: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    periodButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    helperText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    yearGrid: {
      gap: 14,
    },
    monthCard: {
      borderRadius: theme.radius.medium,
      padding: 14,
      backgroundColor: theme.colors.background,
      gap: 10,
    },
    monthCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    monthCardMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    emptyDescription: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
  });
}
