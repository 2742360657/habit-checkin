import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AddHabitModal } from '../components/AddHabitModal';
import { HabitActionModal } from '../components/HabitActionModal';
import { HabitCard } from '../components/HabitCard';
import { HabitHistoryModal } from '../components/HabitHistoryModal';
import { TextEntryModal } from '../components/TextEntryModal';
import { useHabits } from '../state/HabitStore';
import { Habit } from '../types/habit';

type HabitSection = {
  id: string;
  title: string;
  habits: Habit[];
};

export function HomeScreen() {
  const { habits, groups, settings, theme, addCheckinNow, addGroup } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isAddHabitVisible, setAddHabitVisible] = useState(false);
  const [isAddGroupVisible, setAddGroupVisible] = useState(false);
  const [actionHabit, setActionHabit] = useState<Habit | null>(null);
  const [historyHabitId, setHistoryHabitId] = useState<string | null>(null);

  const sections = useMemo<HabitSection[]>(() => {
    const sortedHabits = [...habits].sort((left, right) => right.createdAt - left.createdAt);
    const groupedHabits = new Map<string, Habit[]>();
    const ungrouped: Habit[] = [];

    for (const group of groups) {
      groupedHabits.set(group.id, []);
    }

    for (const habit of sortedHabits) {
      if (habit.groupId && groupedHabits.has(habit.groupId)) {
        groupedHabits.get(habit.groupId)?.push(habit);
      } else {
        ungrouped.push(habit);
      }
    }

    const nextSections = groups.map((group) => ({
      id: group.id,
      title: group.name,
      habits: groupedHabits.get(group.id) ?? [],
    }));

    if (ungrouped.length > 0 || groups.length === 0) {
      nextSections.push({
        id: 'ungrouped',
        title: '未分组',
        habits: ungrouped,
      });
    }

    return nextSections;
  }, [groups, habits]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{settings.homeHeroTitle}</Text>
              <Text style={styles.heroDescription}>{settings.homeHeroDescription}</Text>
            </View>
            <View style={styles.heroStats}>
              <Text style={styles.heroStatLabel}>当前活跃习惯</Text>
              <Text style={styles.heroStatValue}>{habits.length}</Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => setAddGroupVisible(true)} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>新增分组</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAddHabitVisible(true)} style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>新增习惯</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>按分组打卡</Text>
          <Text style={styles.sectionMeta}>长按习惯可打开设置、归档和历史入口</Text>
        </View>

        {sections.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>还没有习惯</Text>
            <Text style={styles.emptyDescription}>先创建分组或习惯，打卡页会按分组整理展示。</Text>
          </View>
        ) : (
          sections.map((section) => {
            const collapsed = collapsedSections[section.id] ?? false;

            return (
              <View key={section.id} style={styles.groupCard}>
                <Pressable onPress={() => toggleSection(section.id)} style={styles.groupHeader}>
                  <View style={styles.groupHeaderText}>
                    <Text style={styles.groupTitle}>{section.title}</Text>
                    <Text style={styles.groupMeta}>{section.habits.length} 个习惯</Text>
                  </View>
                  <Text style={styles.groupChevron}>{collapsed ? '展开' : '收起'}</Text>
                </Pressable>

                {!collapsed ? (
                  <View style={styles.groupBody}>
                    {section.habits.length === 0 ? (
                      <View style={styles.groupEmpty}>
                        <Text style={styles.groupEmptyText}>这个分组里还没有习惯</Text>
                      </View>
                    ) : (
                      section.habits.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          onAddCheckin={addCheckinNow}
                          onLongPress={setActionHabit}
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
      <TextEntryModal
        visible={isAddGroupVisible}
        title="新建分组"
        description="分组会作为打卡页的主要组织方式显示。"
        placeholder="例如：晨间、运动、学习"
        submitLabel="保存"
        onClose={() => setAddGroupVisible(false)}
        onSubmit={addGroup}
      />
      <HabitActionModal
        habit={actionHabit}
        visible={actionHabit !== null}
        onClose={() => setActionHabit(null)}
        onOpenHistory={(habitId) => setHistoryHabitId(habitId)}
      />
      <HabitHistoryModal
        habitId={historyHabitId}
        visible={historyHabitId !== null}
        onClose={() => setHistoryHabitId(null)}
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
      gap: 14,
    },
    heroCard: {
      borderRadius: theme.radius.large,
      padding: 18,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 14,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'flex-start',
    },
    heroText: {
      flex: 1,
      gap: 6,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    heroDescription: {
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textSecondary,
    },
    heroStats: {
      minWidth: 92,
      borderRadius: theme.radius.medium,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    heroStatLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    heroStatValue: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    heroActions: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryAction: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
    },
    primaryActionText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.white,
    },
    secondaryAction: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    secondaryActionText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    sectionHeader: {
      gap: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    sectionMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    emptyCard: {
      borderRadius: theme.radius.large,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    emptyDescription: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    groupCard: {
      borderRadius: theme.radius.large,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.colors.surfaceMuted,
    },
    groupHeaderText: {
      flex: 1,
      gap: 2,
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    groupMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    groupChevron: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    groupBody: {
      padding: 12,
      gap: 10,
    },
    groupEmpty: {
      borderRadius: theme.radius.medium,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.background,
    },
    groupEmptyText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
  });
}
