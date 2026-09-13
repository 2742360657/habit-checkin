import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ReorderModal } from '../components/ReorderModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TodoRow } from '../components/TodoRow';
import { UndoToast } from '../components/UndoToast';
import { useHabits } from '../state/HabitStore';
import { TodoItem } from '../types/habit';
import { buildTodoBuckets, formatTodoDue } from '../utils/todo';

type SortMode = 'smart' | 'custom';

export function TasksScreen() {
  const { todos, theme, setTodoCompleted, reorderTodos } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sortMode, setSortMode] = useState<SortMode>('smart');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [reorderVisible, setReorderVisible] = useState(false);
  const [undoTodoId, setUndoTodoId] = useState<string | null>(null);

  const openTodos = useMemo(
    () => todos.filter((todo) => todo.completedAt === null).sort((left, right) => left.order - right.order),
    [todos]
  );
  const completedTodos = useMemo(
    () => todos.filter((todo) => todo.completedAt !== null).sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0)),
    [todos]
  );
  const buckets = useMemo(() => buildTodoBuckets(todos), [todos]);

  const openEditor = (todo: TodoItem | null) => {
    setEditingTodo(todo);
    setEditorVisible(true);
  };
  const handleToggle = (todo: TodoItem) => {
    const completing = todo.completedAt === null;
    setTodoCompleted(todo.id, completing);
    if (completing) {
      setUndoTodoId(todo.id);
    }
  };
  const dismissUndo = useCallback(() => setUndoTodoId(null), []);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={`${openTodos.length} 项未完成`}
          title="待办"
          description="有截止时间时自动按紧急程度排列；无日期也可以安心收在这里。"
          action={(
            <TouchableOpacity onPress={() => openEditor(null)} style={styles.addButton}>
              <Text style={styles.addButtonText}>＋ 新建</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.sortBar}>
          <SortButton label="智能排序" active={sortMode === 'smart'} onPress={() => setSortMode('smart')} />
          <SortButton label="自定义" active={sortMode === 'custom'} onPress={() => setSortMode('custom')} />
          {sortMode === 'custom' ? (
            <TouchableOpacity
              disabled={openTodos.length < 2}
              onPress={() => setReorderVisible(true)}
              style={[styles.reorderButton, openTodos.length < 2 && styles.disabled]}
            >
              <Text style={styles.reorderButtonText}>拖动排序</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {openTodos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>暂时没有未完成待办</Text>
            <Text style={styles.emptyText}>记下一件事，不必现在就决定截止时间。</Text>
            <TouchableOpacity onPress={() => openEditor(null)} style={styles.emptyAction}>
              <Text style={styles.emptyActionText}>新建待办</Text>
            </TouchableOpacity>
          </View>
        ) : sortMode === 'smart' ? (
          buckets.map((bucket) => (
            <View key={bucket.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, bucket.id === 'overdue' && styles.overdueTitle]}>{bucket.title}</Text>
                <Text style={styles.sectionCount}>{bucket.todos.length}</Text>
              </View>
              <View style={styles.list}>
                {bucket.todos.map((todo) => (
                  <TodoRow key={todo.id} todo={todo} onToggle={handleToggle} onPress={openEditor} />
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.list}>
            {openTodos.map((todo) => (
              <TodoRow key={todo.id} todo={todo} onToggle={handleToggle} onPress={openEditor} />
            ))}
          </View>
        )}

        {completedTodos.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity onPress={() => setShowCompleted((current) => !current)} style={styles.completedHeader}>
              <Text style={styles.sectionTitle}>已完成</Text>
              <Text style={styles.completedAction}>{completedTodos.length} 项 · {showCompleted ? '收起' : '展开'}</Text>
            </TouchableOpacity>
            {showCompleted ? (
              <View style={styles.list}>
                {completedTodos.map((todo) => (
                  <TodoRow key={todo.id} todo={todo} onToggle={handleToggle} onPress={openEditor} />
                ))}
              </View>
            ) : null}
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
      <ReorderModal
        visible={reorderVisible}
        title="待办自定义排序"
        description="这个顺序只用于“自定义”视图；智能视图仍按截止时间排列。"
        items={openTodos.map((todo) => ({ id: todo.id, label: todo.title, subtitle: formatTodoDue(todo) }))}
        onClose={() => setReorderVisible(false)}
        onSave={reorderTodos}
      />
      <UndoToast
        message={undoTodoId ? '待办已完成' : null}
        onDismiss={dismissUndo}
        onUndo={() => {
          if (undoTodoId) {
            setTodoCompleted(undoTodoId, false);
          }
          setUndoTodoId(null);
        }}
      />
    </View>
  );

  function SortButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.sortButton, active && styles.sortButtonActive]}>
        <Text style={[styles.sortButtonText, active && styles.sortButtonTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 42, gap: 22 },
    addButton: { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 11, backgroundColor: theme.colors.primary },
    addButtonText: { fontSize: 13, fontWeight: '800', color: theme.colors.white },
    sortBar: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    sortButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: theme.colors.surfaceMuted },
    sortButtonActive: { backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: theme.colors.primary },
    sortButtonText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
    sortButtonTextActive: { color: theme.colors.primary },
    reorderButton: { marginLeft: 'auto', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: theme.colors.primary },
    reorderButtonText: { fontSize: 12, fontWeight: '800', color: theme.colors.white },
    disabled: { opacity: 0.4 },
    section: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    overdueTitle: { color: theme.colors.danger },
    sectionCount: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary },
    list: { gap: 8 },
    emptyCard: { borderRadius: 20, padding: 20, gap: 8, backgroundColor: theme.colors.surface },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    emptyText: { fontSize: 13, lineHeight: 20, color: theme.colors.textSecondary },
    emptyAction: { marginTop: 8, alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.primarySoft },
    emptyActionText: { fontSize: 13, fontWeight: '800', color: theme.colors.primary },
    completedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
    completedAction: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  });
}
