import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useHabits } from '../state/HabitStore';
import { Habit } from '../types/habit';
import { getTodayCount } from '../utils/habit';

type HabitCardProps = {
  habit: Habit;
  groupName?: string | null;
  onAddCheckin: (habitId: string) => void;
  onRemoveCheckin: (habitId: string) => void;
  onDeleteHabit: (habitId: string, habitName: string) => void;
  onOpenToday: (habit: Habit) => void;
  onOpenHistory: (habitId: string) => void;
};

export function HabitCard({
  habit,
  groupName,
  onAddCheckin,
  onRemoveCheckin,
  onDeleteHabit,
  onOpenToday,
  onOpenHistory,
}: HabitCardProps) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const todayCount = getTodayCount(habit);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {groupName ? <Text style={styles.groupTag}>{groupName}</Text> : null}
          <Text style={styles.name}>{habit.name}</Text>
          <Text style={styles.meta}>今日打卡次数</Text>
        </View>
        <TouchableOpacity onPress={() => onDeleteHabit(habit.id, habit.name)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>删除</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.countBlock}>
        <Text style={styles.countValue}>{todayCount}</Text>
        <Text style={styles.countUnit}>次</Text>
      </View>

      <View style={styles.stepperRow}>
        <TouchableOpacity
          disabled={todayCount === 0}
          onPress={() => onRemoveCheckin(habit.id)}
          style={[styles.stepperButton, styles.stepperMinus, todayCount === 0 && styles.stepperDisabled]}
        >
          <Text style={[styles.stepperLabel, todayCount === 0 && styles.stepperDisabledLabel]}>-1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAddCheckin(habit.id)}
          style={[styles.stepperButton, styles.stepperPlus]}
        >
          <Text style={[styles.stepperLabel, styles.stepperPlusLabel]}>+1</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity onPress={() => onOpenToday(habit)} style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>查看今日时间</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onOpenHistory(habit.id)} style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>查看历史</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    card: {
      borderRadius: theme.radius.medium,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 14,
      ...theme.shadow,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    groupTag: {
      alignSelf: 'flex-start',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    name: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    meta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    deleteButton: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.dangerSoft,
    },
    deleteButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.danger,
    },
    countBlock: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },
    countValue: {
      fontSize: 44,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    countUnit: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    stepperRow: {
      flexDirection: 'row',
      gap: 10,
    },
    stepperButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.medium,
      paddingVertical: 14,
    },
    stepperMinus: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    stepperPlus: {
      backgroundColor: theme.colors.primary,
    },
    stepperDisabled: {
      opacity: 0.55,
    },
    stepperLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    stepperPlusLabel: {
      color: theme.colors.white,
    },
    stepperDisabledLabel: {
      color: theme.colors.textMuted,
    },
    footerActions: {
      flexDirection: 'row',
      gap: 10,
    },
    secondaryAction: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 11,
      alignItems: 'center',
    },
    secondaryActionText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });
}
