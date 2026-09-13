import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HabitCard } from '../components/HabitCard';
import { CheckinDetailModal } from '../components/CheckinDetailModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TodoRow } from '../components/TodoRow';
import { UndoToast } from '../components/UndoToast';
import { useHabits } from '../state/HabitStore';
import { TodoItem } from '../types/habit';
import { getTodayKey } from '../utils/date';
import { buildTodoBuckets } from '../utils/todo';

type TodayScreenProps = {
  onOpenTasks: () => void;
  onOpenHabits: () => void;
};

type UndoState =
  | { kind: 'todo'; todoId: string }
  | { kind: 'checkin'; habitId: string; recordId: string }
  | null;

export function TodayScreen({ onOpenTasks, onOpenHabits }: TodayScreenProps) {
  const { todos, habits, groups, theme, setTodoCompleted, addCheckinNow, deleteCheckin } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [detailHabitId, setDetailHabitId] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState>(null);

  const actionableBuckets = useMemo(
    () => buildTodoBuckets(todos).filter((bucket) => bucket.id === 'overdue' || bucket.id === 'today'),
    [todos]
  );
  const noDateTodos = useMemo(
    () => todos.filter((todo) => todo.completedAt === null && todo.dueDateKey === null).sort((a, b) => a.order - b.order),
    [todos]
  );
  const orderedHabits = useMemo(() => {
    const groupOrder = new Map(groups.map((group) => [group.id, group.order]));
    return [...habits].sort((left, right) => {
      const leftGroup = left.groupId ? (groupOrder.get(left.groupId) ?? 9999) : 9999;
      const rightGroup = right.groupId ? (groupOrder.get(right.groupId) ?? 9999) : 9999;
      return leftGroup - rightGroup || left.order - right.order;
    });
  }, [groups, habits]);
  const todayLabel = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  const openEditor = (todo: TodoItem | null) => {
    setEditingTodo(todo);
    setEditorVisible(true);
  };
  const handleToggleTodo = (todo: TodoItem) => {
    const completing = todo.completedAt === null;
    setTodoCompleted(todo.id, completing);
    if (completing) {
      setUndoState({ kind: 'todo', todoId: todo.id });
    }
  };
  const dismissUndo = useCallback(() => setUndoState(null), []);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={todayLabel}
          title="今天"
          action={(
            <TouchableOpacity onPress={() => openEditor(null)} style={styles.addButton}>
              <Text style={styles.addButtonText}>＋ 待办</Text>
            </TouchableOpacity>
          )}
        />

        {actionableBuckets.map((bucket) => (
          <View key={bucket.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, bucket.id === 'overdue' && styles.overdueTitle]}>{bucket.title}</Text>
              <Text style={styles.sectionCount}>{bucket.todos.length}</Text>
            </View>
            <View style={styles.list}>
              {bucket.todos.map((todo) => (
                <TodoRow key={todo.id} todo={todo} onToggle={handleToggleTodo} onPress={openEditor} compact />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>习惯</Text>
            <TouchableOpacity onPress={onOpenHabits}>
              <Text style={styles.linkText}>查看全部 ›</Text>
            </TouchableOpacity>
          </View>
          {orderedHabits.length === 0 ? (
            <TouchableOpacity onPress={onOpenHabits} style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>还没有习惯</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.list}>
              {orderedHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  compact
                  onOpenDetails={setDetailHabitId}
                  onAddCheckin={(habitId) => {
                    const recordId = addCheckinNow(habitId);
                    setUndoState({ kind: 'checkin', habitId, recordId });
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {noDateTodos.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>无日期待办</Text>
              <TouchableOpacity onPress={onOpenTasks}>
                <Text style={styles.linkText}>查看全部 ›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.list}>
              {noDateTodos.slice(0, 3).map((todo) => (
                <TodoRow key={todo.id} todo={todo} onToggle={handleToggleTodo} onPress={openEditor} compact />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <TodoEditorModal
        visible={editorVisible}
        todo={editingTodo}
        onClose={() => {
          setEditorVisible(false);
          setEditingTodo(null);
        }}
      />
      <CheckinDetailModal
        habitId={detailHabitId}
        dateKey={detailHabitId ? getTodayKey() : null}
        visible={detailHabitId !== null}
        onClose={() => setDetailHabitId(null)}
      />
      <UndoToast
        message={undoState?.kind === 'todo' ? '待办已完成' : undoState?.kind === 'checkin' ? '已记录一次打卡' : null}
        onDismiss={dismissUndo}
        onUndo={() => {
          if (undoState?.kind === 'todo') {
            setTodoCompleted(undoState.todoId, false);
          } else if (undoState?.kind === 'checkin') {
            deleteCheckin(undoState.habitId, undoState.recordId);
          }
          setUndoState(null);
        }}
      />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 42, gap: 24 },
    addButton: { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 11, backgroundColor: theme.colors.primary },
    addButtonText: { fontSize: 13, fontWeight: '800', color: theme.colors.white },
    section: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    overdueTitle: { color: theme.colors.danger },
    sectionCount: { minWidth: 26, textAlign: 'center', fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary },
    linkText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    list: { gap: 8 },
    emptyCard: { borderRadius: 18, padding: 16, gap: 5, backgroundColor: theme.colors.surface },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
  });
}
