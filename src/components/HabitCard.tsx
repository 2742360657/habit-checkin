import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useHabits } from '../state/HabitStore';
import { Habit } from '../types/habit';
import { getTodayCount } from '../utils/habit';

type HabitCardProps = {
  habit: Habit;
  onAddCheckin: (habitId: string) => void;
  onLongPress: (habit: Habit) => void;
};

export function HabitCard({ habit, onAddCheckin, onLongPress }: HabitCardProps) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const todayCount = getTodayCount(habit);

  return (
    <Pressable onLongPress={() => onLongPress(habit)} delayLongPress={240} style={styles.card}>
      <View style={styles.main}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.countText}>今日 {todayCount} 次</Text>
        </View>
        <TouchableOpacity onPress={() => onAddCheckin(habit.id)} style={styles.plusButton}>
          <Text style={styles.plusText}>+1</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    card: {
      borderRadius: theme.radius.medium,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    main: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    info: {
      flex: 1,
      gap: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    countText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    plusButton: {
      minWidth: 68,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    plusText: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.white,
    },
  });
}
