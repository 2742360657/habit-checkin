import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useHabits } from '../state/HabitStore';
import { Habit } from '../types/habit';
import {
  formatDateLabel,
  formatEditableTime,
  formatTime,
  updateTimestampTime,
} from '../utils/date';
import { getCheckinsByDate } from '../utils/habit';
import { TextEntryModal } from './TextEntryModal';

type DayCheckinsModalProps = {
  habit: Habit | null;
  dateKey: string | null;
  visible: boolean;
  onClose: () => void;
};

export function DayCheckinsModal({ habit, dateKey, visible, onClose }: DayCheckinsModalProps) {
  const { theme, deleteCheckin, updateCheckinTime } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editingTimestamp, setEditingTimestamp] = useState<number | null>(null);

  const checkins = habit && dateKey ? getCheckinsByDate(habit, dateKey) : [];
  const editingValue =
    editingTimestamp !== null ? formatEditableTime(editingTimestamp) : '';

  const handleDelete = (timestamp: number) => {
    if (!habit) {
      return;
    }

    Alert.alert('删除这条记录', `确认删除 ${formatTime(timestamp)} 这条打卡记录吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteCheckin(habit.id, timestamp);
        },
      },
    ]);
  };

  const handleUpdateTime = (value: string) => {
    if (!habit || !dateKey || editingTimestamp === null) {
      return false;
    }

    const nextTimestamp = updateTimestampTime(dateKey, value);
    if (nextTimestamp === null) {
      Alert.alert('时间格式错误', '请输入 HH:mm 或 HH:mm:ss，例如 08:30 或 08:30:15。');
      return false;
    }

    updateCheckinTime(habit.id, editingTimestamp, nextTimestamp);
    setEditingTimestamp(null);
    return true;
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{habit?.name ?? '当天记录'}</Text>
                <Text style={styles.subtitle}>
                  {dateKey ? formatDateLabel(dateKey) : ''} · 共 {checkins.length} 次
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>关闭</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {checkins.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>当天没有记录</Text>
                  <Text style={styles.emptySubtitle}>这个日期目前没有真实打卡时间。</Text>
                </View>
              ) : (
                checkins.map((timestamp) => (
                  <View key={`${timestamp}`} style={styles.timeRow}>
                    <View style={styles.timeMeta}>
                      <Text style={styles.timeValue}>{formatTime(timestamp)}</Text>
                      <Text style={styles.timeHint}>真实打卡时间</Text>
                    </View>
                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        onPress={() => setEditingTimestamp(timestamp)}
                        style={styles.secondaryAction}
                      >
                        <Text style={styles.secondaryActionText}>编辑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(timestamp)}
                        style={styles.deleteAction}
                      >
                        <Text style={styles.deleteActionText}>删除</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <TextEntryModal
        visible={editingTimestamp !== null}
        title="编辑打卡时间"
        description="只修改当天这条记录的时间，格式支持 HH:mm 或 HH:mm:ss。"
        placeholder="例如：08:30 或 08:30:15"
        submitLabel="保存"
        initialValue={editingValue}
        onClose={() => setEditingTimestamp(null)}
        onSubmit={handleUpdateTime}
      />
    </>
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
      maxHeight: '78%',
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
      padding: 14,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    timeMeta: {
      gap: 4,
    },
    timeValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    timeHint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    rowActions: {
      flexDirection: 'row',
      gap: 10,
    },
    secondaryAction: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    secondaryActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    deleteAction: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.dangerSoft,
    },
    deleteActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.danger,
    },
  });
}
