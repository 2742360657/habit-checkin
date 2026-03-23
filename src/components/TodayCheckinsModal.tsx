import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useHabits } from '../state/HabitStore';
import { Habit } from '../types/habit';
import { formatTime } from '../utils/date';
import { getTodayCheckins } from '../utils/habit';

type TodayCheckinsModalProps = {
  habit: Habit | null;
  visible: boolean;
  onClose: () => void;
};

export function TodayCheckinsModal({ habit, visible, onClose }: TodayCheckinsModalProps) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const checkins = habit ? getTodayCheckins(habit) : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{habit?.name ?? '今日打卡时间'}</Text>
              <Text style={styles.subtitle}>仅显示今天的真实打卡时间</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {checkins.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>今天还没有打卡</Text>
                <Text style={styles.emptySubtitle}>点击首页的 +1 后，这里会按时间倒序展示真实记录。</Text>
              </View>
            ) : (
              checkins.map((timestamp) => (
                <View key={`${habit?.id}-${timestamp}`} style={styles.timeRow}>
                  <Text style={styles.timeValue}>{formatTime(timestamp)}</Text>
                  <Text style={styles.timeMeta}>真实记录</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: 'rgba(18, 31, 24, 0.22)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: '100%',
      maxHeight: '72%',
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surface,
      padding: 20,
      gap: 16,
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
      gap: 6,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceMuted,
    },
    closeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    content: {
      gap: 10,
    },
    emptyState: {
      borderRadius: theme.radius.medium,
      padding: 18,
      backgroundColor: theme.colors.background,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    emptySubtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    timeRow: {
      borderRadius: theme.radius.medium,
      padding: 16,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    timeValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    timeMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
  });
}
