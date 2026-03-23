import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AddHabitModal } from '../components/AddHabitModal';
import { EditHomeCopyModal } from '../components/EditHomeCopyModal';
import { HabitCard } from '../components/HabitCard';
import { TodayCheckinsModal } from '../components/TodayCheckinsModal';
import { useHabits } from '../state/HabitStore';
import { Habit } from '../types/habit';

type HomeScreenProps = {
  onOpenHistory: (habitId: string) => void;
};

type HabitSection = {
  id: string;
  title: string;
  habits: Habit[];
};

export function HomeScreen({ onOpenHistory }: HomeScreenProps) {
  const {
    habits,
    groups,
    settings,
    theme,
    hideHabit,
    deleteHabit,
    addCheckin,
    removeLatestTodayCheckin,
  } = useHabits();

  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isCopyModalVisible, setCopyModalVisible] = useState(false);
  const [todayHabit, setTodayHabit] = useState<Habit | null>(null);

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

    const nextSections = groups
      .map((group) => ({
        id: group.id,
        title: group.name,
        habits: groupedHabits.get(group.id) ?? [],
      }))
      .filter((section) => section.habits.length > 0);

    if (ungrouped.length > 0) {
      nextSections.push({
        id: 'ungrouped',
        title: '未分组',
        habits: ungrouped,
      });
    }

    return nextSections;
  }, [groups, habits]);

  const handleHideHabit = (habitId: string, habitName: string) => {
    Alert.alert(
      '隐藏习惯',
      `隐藏“${habitName}”后，它会从首页和历史页移除，但不会删除数据，可在设置中恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认隐藏',
          onPress: () => {
            hideHabit(habitId);
          },
        },
      ]
    );
  };

  const handleDeleteHabit = (habitId: string, habitName: string) => {
    Alert.alert(
      '确认删除习惯',
      `删除“${habitName}”后，相关全部打卡历史会一并清除，且无法恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认删除',
          style: 'destructive',
          onPress: () => {
            deleteHabit(habitId);
          },
        },
      ]
    );
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
            <View style={styles.heroActionRow}>
              <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>新建习惯</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCopyModalVisible(true)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>修改文案</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>习惯列表</Text>
          {sections.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>还没有可显示的习惯</Text>
              <Text style={styles.emptyDescription}>
                先创建一个习惯，或者到设置页恢复已隐藏的习惯。
              </Text>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.id} style={styles.groupSection}>
                <Text style={styles.groupTitle}>{section.title}</Text>
                <View style={styles.groupHabitList}>
                  {section.habits.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      groupName={section.id === 'ungrouped' ? null : section.title}
                      onAddCheckin={addCheckin}
                      onRemoveCheckin={removeLatestTodayCheckin}
                      onHideHabit={handleHideHabit}
                      onDeleteHabit={handleDeleteHabit}
                      onOpenToday={setTodayHabit}
                      onOpenHistory={onOpenHistory}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AddHabitModal visible={isAddModalVisible} onClose={() => setAddModalVisible(false)} />
      <EditHomeCopyModal visible={isCopyModalVisible} onClose={() => setCopyModalVisible(false)} />
      <TodayCheckinsModal
        visible={todayHabit !== null}
        habit={todayHabit}
        onClose={() => setTodayHabit(null)}
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
      gap: 18,
    },
    heroCard: {
      borderRadius: theme.radius.large,
      padding: 18,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    heroHeader: {
      gap: 16,
    },
    heroText: {
      gap: 8,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    heroDescription: {
      fontSize: 14,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    heroActionRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    primaryButton: {
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.white,
    },
    secondaryButton: {
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    section: {
      gap: 14,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
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
    groupSection: {
      gap: 10,
    },
    groupTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    groupHabitList: {
      gap: 12,
    },
  });
}
