import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { TodoInput, useHabits } from '../state/HabitStore';
import { TodoItem, TodoPriority } from '../types/habit';
import { addDaysToDateKey, getTodayKey, isValidDateKey } from '../utils/date';

type DueMode = 'none' | 'today' | 'tomorrow' | 'custom';

type TodoEditorModalProps = {
  visible: boolean;
  todo?: TodoItem | null;
  onClose: () => void;
};

export function TodoEditorModal({ visible, todo = null, onClose }: TodoEditorModalProps) {
  const { theme, addTodo, updateTodo, deleteTodo } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueMode, setDueMode] = useState<DueMode>('none');
  const [customDate, setCustomDate] = useState(getTodayKey());
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('normal');

  useEffect(() => {
    if (!visible) {
      return;
    }

    const todayKey = getTodayKey();
    const tomorrowKey = addDaysToDateKey(todayKey, 1);
    setTitle(todo?.title ?? '');
    setNote(todo?.note ?? '');
    setCustomDate(todo?.dueDateKey ?? todayKey);
    setDueTime(todo?.dueTime ?? '');
    setPriority(todo?.priority ?? 'normal');
    setDueMode(
      !todo?.dueDateKey
        ? 'none'
        : todo.dueDateKey === todayKey
          ? 'today'
          : todo.dueDateKey === tomorrowKey
            ? 'tomorrow'
            : 'custom'
    );
  }, [todo, visible]);

  const handleSubmit = () => {
    const todayKey = getTodayKey();
    const dueDateKey =
      dueMode === 'none'
        ? null
        : dueMode === 'today'
          ? todayKey
          : dueMode === 'tomorrow'
            ? addDaysToDateKey(todayKey, 1)
            : customDate.trim();

    if (dueDateKey && !isValidDateKey(dueDateKey)) {
      Alert.alert('日期格式有误', '请按 YYYY-MM-DD 输入，例如 2026-09-13。');
      return;
    }
    if (dueTime.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime.trim())) {
      Alert.alert('时间格式有误', '请按 HH:MM 输入，例如 18:30。');
      return;
    }

    const input: TodoInput = {
      title,
      note,
      dueDateKey,
      dueTime: dueDateKey && dueTime.trim() ? dueTime.trim() : null,
      priority,
    };
    const success = todo ? updateTodo(todo.id, input) : addTodo(input);
    if (success) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (!todo) {
      return;
    }
    Alert.alert('删除待办', `确认删除“${todo.title}”吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteTodo(todo.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{todo ? '编辑待办' : '新建待办'}</Text>
          <TouchableOpacity onPress={handleSubmit} style={[styles.headerButton, styles.saveButton]}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>要做什么</Text>
            <TextInput
              autoFocus
              maxLength={80}
              placeholder="例如：提交报销材料"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>截止时间</Text>
            <View style={styles.chips}>
              <Choice label="无日期" active={dueMode === 'none'} onPress={() => setDueMode('none')} />
              <Choice label="今天" active={dueMode === 'today'} onPress={() => setDueMode('today')} />
              <Choice label="明天" active={dueMode === 'tomorrow'} onPress={() => setDueMode('tomorrow')} />
              <Choice label="自定义" active={dueMode === 'custom'} onPress={() => setDueMode('custom')} />
            </View>
            {dueMode === 'custom' ? (
              <TextInput
                value={customDate}
                onChangeText={setCustomDate}
                maxLength={10}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
              />
            ) : null}
            {dueMode !== 'none' ? (
              <View style={styles.timeRow}>
                <View style={styles.timeCopy}>
                  <Text style={styles.timeTitle}>具体时间（可选）</Text>
                  <Text style={styles.hint}>留空时按当天结束前处理</Text>
                </View>
                <TextInput
                  value={dueTime}
                  onChangeText={setDueTime}
                  maxLength={5}
                  placeholder="18:30"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.timeInput}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>优先级</Text>
            <View style={styles.chips}>
              <Choice label="普通" active={priority === 'normal'} onPress={() => setPriority('normal')} />
              <Choice label="重要" active={priority === 'high'} onPress={() => setPriority('high')} danger />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>备注</Text>
            <TextInput
              multiline
              maxLength={300}
              value={note}
              onChangeText={setNote}
              placeholder="补充说明、地址或下一步（可选）"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.noteInput]}
            />
          </View>

          {todo ? (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>删除这个待办</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  function Choice({
    label,
    active,
    onPress,
    danger = false,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    danger?: boolean;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.chip, active && styles.chipActive, active && danger && styles.chipDanger]}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive, active && danger && styles.chipTextDanger]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    headerButton: { minWidth: 60, paddingHorizontal: 10, paddingVertical: 10, alignItems: 'center' },
    headerButtonText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
    saveButton: { borderRadius: 12, backgroundColor: theme.colors.primary },
    saveButtonText: { fontSize: 14, fontWeight: '800', color: theme.colors.white },
    content: { padding: 20, gap: 22, paddingBottom: 44 },
    field: { gap: 10 },
    label: { fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary },
    titleInput: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: 14,
      fontSize: 21,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    noteInput: { minHeight: 112, textAlignVertical: 'top' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: theme.colors.surface,
    },
    chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
    chipDanger: { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft },
    chipText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
    chipTextActive: { color: theme.colors.primary },
    chipTextDanger: { color: theme.colors.danger },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
    },
    timeCopy: { flex: 1, gap: 3 },
    timeTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
    hint: { fontSize: 11, color: theme.colors.textSecondary },
    timeInput: {
      width: 76,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      textAlign: 'center',
      fontSize: 15,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    deleteButton: {
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 14,
      backgroundColor: theme.colors.dangerSoft,
    },
    deleteButtonText: { fontSize: 14, fontWeight: '800', color: theme.colors.danger },
  });
}
