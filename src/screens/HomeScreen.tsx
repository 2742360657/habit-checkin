import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AddHabitModal } from '../components/AddHabitModal';
import { HabitActionModal } from '../components/HabitActionModal';
import { HabitCard } from '../components/HabitCard';
import { HabitHistoryModal } from '../components/HabitHistoryModal';
import { ReorderItem, ReorderModal } from '../components/ReorderModal';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextEntryModal } from '../components/TextEntryModal';
import { UndoToast } from '../components/UndoToast';
import { useHabits } from '../state/HabitStore';
import { Habit } from '../types/habit';

type HabitSection = {
  id: string;
  groupId: string | null;
  title: string;
  habits: Habit[];
};

type ReorderTarget = { kind: 'groups' } | { kind: 'habits'; groupId: string | null; title: string } | null;

export function HomeScreen() {
  const {
    habits,
    groups,
    theme,
    addCheckinNow,
    deleteCheckin,
    addGroup,
    reorderGroups,
    reorderHabits,
  } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isAddHabitVisible, setAddHabitVisible] = useState(false);
  const [isAddGroupVisible, setAddGroupVisible] = useState(false);
  const [actionHabit, setActionHabit] = useState<Habit | null>(null);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [historyHabitId, setHistoryHabitId] = useState<string | null>(null);
  const [reorderTarget, setReorderTarget] = useState<ReorderTarget>(null);
  const [undoState, setUndoState] = useState<{ habitId: string; recordId: string } | null>(null);

  const orderedGroups = useMemo(
    () => [...groups].sort((left, right) => left.order - right.order),
    [groups]
  );
  const sections = useMemo<HabitSection[]>(() => {
    const orderedHabits = [...habits].sort((left, right) => left.order - right.order);
    const result: HabitSection[] = orderedGroups.map((group) => ({
      id: group.id,
      groupId: group.id,
      title: group.name,
      habits: orderedHabits.filter((habit) => habit.groupId === group.id),
    }));
    const ungrouped = orderedHabits.filter((habit) => habit.groupId === null);
    if (ungrouped.length > 0 || orderedGroups.length === 0) {
      result.push({ id: 'ungrouped', groupId: null, title: '未分组', habits: ungrouped });
    }
    return result;
  }, [habits, orderedGroups]);

  const editingHabit = habits.find((habit) => habit.id === editingHabitId) ?? null;
  const reorderItems = useMemo<ReorderItem[]>(() => {
    if (!reorderTarget) {
      return [];
    }
    if (reorderTarget.kind === 'groups') {
      return orderedGroups.map((group) => ({
        id: group.id,
        label: group.name,
        subtitle: `${habits.filter((habit) => habit.groupId === group.id).length} 个习惯`,
      }));
    }
    const section = sections.find((item) => item.groupId === reorderTarget.groupId);
    return (section?.habits ?? []).map((habit) => ({
      id: habit.id,
      label: habit.name,
      subtitle: habit.cadence === 'daily' ? '每天' : habit.cadence === 'weekly' ? '每周' : '每月',
    }));
  }, [habits, orderedGroups, reorderTarget, sections]);

  const handleAddCheckin = (habitId: string) => {
    const recordId = addCheckinNow(habitId);
    setUndoState({ habitId, recordId });
  };

  const dismissUndo = useCallback(() => setUndoState(null), []);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="习惯"
          action={(
            <TouchableOpacity onPress={() => setAddHabitVisible(true)} style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>＋ 习惯</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => setAddGroupVisible(true)} style={styles.toolButton}>
            <Text style={styles.toolButtonText}>＋ 分组</Text>
          </TouchableOpacity>
        </View>

        {habits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>还没有习惯</Text>
            <TouchableOpacity onPress={() => setAddHabitVisible(true)} style={styles.emptyAction}>
              <Text style={styles.emptyActionText}>新建第一个习惯</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sections.map((section) => {
            const collapsed = collapsedSections[section.id] ?? false;
            return (
              <View key={section.id} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Pressable
                    onPress={() =>
                      setCollapsedSections((current) => ({ ...current, [section.id]: !current[section.id] }))
                    }
                    delayLongPress={360}
                    onLongPress={() => {
                      if (orderedGroups.length > 1 && section.groupId !== null) {
                        setReorderTarget({ kind: 'groups' });
                      }
                    }}
                    style={styles.groupHeaderMain}
                  >
                    <Text style={styles.groupTitle}>{section.title}</Text>
                    <Text style={styles.groupMeta}>{section.habits.length} 个 · {collapsed ? '展开' : '收起'}</Text>
                  </Pressable>
                </View>
                {!collapsed ? (
                  <View style={styles.habitList}>
                    {section.habits.length === 0 ? (
                      <Text style={styles.groupEmpty}>这个分组里还没有习惯</Text>
                    ) : (
                      section.habits.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          onAddCheckin={handleAddCheckin}
                          onOpenDetails={setHistoryHabitId}
                          onOpenActions={setActionHabit}
                          onLongPress={() => {
                            if (section.habits.length > 1) {
                              setReorderTarget({
                                kind: 'habits',
                                groupId: section.groupId,
                                title: section.title,
                              });
                            }
                          }}
                        />
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <AddHabitModal visible={isAddHabitVisible} onClose={() => setAddHabitVisible(false)} />
      <AddHabitModal habit={editingHabit} visible={editingHabitId !== null} onClose={() => setEditingHabitId(null)} />
      <TextEntryModal
        visible={isAddGroupVisible}
        title="新建分组"
        placeholder="分组名称"
        submitLabel="保存"
        onClose={() => setAddGroupVisible(false)}
        onSubmit={addGroup}
      />
      <HabitActionModal
        habit={actionHabit}
        visible={actionHabit !== null}
        onClose={() => setActionHabit(null)}
        onEdit={setEditingHabitId}
        onOpenHistory={setHistoryHabitId}
      />
      <HabitHistoryModal
        habitId={historyHabitId}
        visible={historyHabitId !== null}
        onClose={() => setHistoryHabitId(null)}
      />
      <ReorderModal
        visible={reorderTarget !== null}
        title="调整顺序"
        items={reorderItems}
        onClose={() => setReorderTarget(null)}
        onSave={(ids) => {
          if (reorderTarget?.kind === 'groups') {
            reorderGroups(ids);
          } else if (reorderTarget?.kind === 'habits') {
            reorderHabits(reorderTarget.groupId, ids);
          }
        }}
      />
      <UndoToast
        message={undoState ? '已记录一次打卡' : null}
        onDismiss={dismissUndo}
        onUndo={() => {
          if (undoState) {
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
    scrollView: { flex: 1 },
    content: { padding: 20, paddingBottom: 38, gap: 20 },
    primaryAction: { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 11, backgroundColor: theme.colors.primary },
    primaryActionText: { fontSize: 13, fontWeight: '800', color: theme.colors.white },
    toolbar: { flexDirection: 'row' },
    toolButton: {
      alignSelf: 'flex-start',
      borderRadius: 13,
      paddingVertical: 9,
      paddingHorizontal: 13,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    toolButtonText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
    emptyCard: { borderRadius: 20, padding: 20, gap: 8, backgroundColor: theme.colors.surface },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    emptyAction: { marginTop: 8, alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.primarySoft },
    emptyActionText: { fontSize: 13, fontWeight: '800', color: theme.colors.primary },
    groupSection: { gap: 10 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    groupHeaderMain: { flex: 1, gap: 3, paddingVertical: 3 },
    groupTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
    groupMeta: { fontSize: 11, color: theme.colors.textSecondary },
    habitList: { gap: 9 },
    groupEmpty: { paddingVertical: 14, fontSize: 13, color: theme.colors.textSecondary },
  });
}
