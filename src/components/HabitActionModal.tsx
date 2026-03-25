import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useHabits } from '../state/HabitStore';
import { Habit } from '../types/habit';
import { GroupPickerModal } from './GroupPickerModal';
import { TextEntryModal } from './TextEntryModal';

type HabitActionModalProps = {
  habit: Habit | null;
  visible: boolean;
  onClose: () => void;
  onOpenHistory: (habitId: string) => void;
};

export function HabitActionModal({
  habit,
  visible,
  onClose,
  onOpenHistory,
}: HabitActionModalProps) {
  const { theme, renameHabit, moveHabitToGroup, archiveHabit, deleteHabit } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editingName, setEditingName] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);

  if (!habit) {
    return null;
  }

  const handleArchive = () => {
    Alert.alert('归档习惯', `归档“${habit.name}”后，它会从打卡页移除，并在设置页的归档习惯中只读查看。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认归档',
        onPress: () => {
          archiveHabit(habit.id);
          onClose();
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('确认删除习惯', `删除“${habit.name}”后，相关全部打卡历史会一并清除，且无法恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认删除',
        style: 'destructive',
        onPress: () => {
          deleteHabit(habit.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={styles.card}>
            <Text style={styles.title}>{habit.name}</Text>
            <Text style={styles.description}>长按后统一在这里处理习惯设置、归档和历史入口。</Text>

            <View style={styles.actionList}>
              <ActionButton label="修改名称" onPress={() => setEditingName(true)} />
              <ActionButton label="修改所属分组" onPress={() => setEditingGroup(true)} />
              <ActionButton
                label="打开年视图"
                onPress={() => {
                  onOpenHistory(habit.id);
                  onClose();
                }}
              />
              <ActionButton label="归档" danger onPress={handleArchive} />
              <ActionButton label="删除习惯" danger onPress={handleDelete} />
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TextEntryModal
        visible={editingName}
        title="修改习惯名称"
        description="更新后会立即反映在打卡页和历史视图中。"
        placeholder="输入新的习惯名称"
        submitLabel="保存"
        initialValue={habit.name}
        onClose={() => setEditingName(false)}
        onSubmit={(value) => renameHabit(habit.id, value)}
      />

      <GroupPickerModal
        visible={editingGroup}
        title="修改所属分组"
        selectedGroupId={habit.groupId}
        onClose={() => setEditingGroup(false)}
        onSubmit={(groupId) => moveHabitToGroup(habit.id, groupId)}
      />
    </>
  );

  function ActionButton({
    label,
    onPress,
    danger = false,
  }: {
    label: string;
    onPress: () => void;
    danger?: boolean;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.actionButton, danger && styles.actionButtonDanger]}
      >
        <Text style={[styles.actionButtonText, danger && styles.actionButtonTextDanger]}>{label}</Text>
      </TouchableOpacity>
    );
  }
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
      borderRadius: theme.radius.large,
      padding: 20,
      backgroundColor: theme.colors.surface,
      gap: 14,
      ...theme.shadow,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    description: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    actionList: {
      gap: 10,
    },
    actionButton: {
      borderRadius: theme.radius.medium,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionButtonDanger: {
      backgroundColor: theme.colors.dangerSoft,
      borderColor: theme.colors.dangerSoft,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    actionButtonTextDanger: {
      color: theme.colors.danger,
    },
    closeButton: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });
}
