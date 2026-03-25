import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useHabits } from '../state/HabitStore';
import {
  compareDateKeys,
  formatMonthLabel,
  formatYearLabel,
  getTodayKey,
} from '../utils/date';
import {
  buildDateCountMap,
  getActiveDayCountInMonth,
  getMonthTotal,
  getYearTotal,
} from '../utils/habit';
import { CheckinDetailModal } from './CheckinDetailModal';
import { HistoryCalendar } from './HistoryCalendar';

type HabitHistoryModalProps = {
  habitId: string | null;
  visible: boolean;
  readonly?: boolean;
  onClose: () => void;
};

type ViewMode = 'year' | 'month';

export function HabitHistoryModal({
  habitId,
  visible,
  readonly = false,
  onClose,
}: HabitHistoryModalProps) {
  const { allHabits, theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [focusYear, setFocusYear] = useState(today.getFullYear());
  const [focusMonthIndex, setFocusMonthIndex] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const habit = useMemo(
    () => allHabits.find((item) => item.id === habitId) ?? null,
    [allHabits, habitId]
  );
  const dateCountMap = useMemo(() => (habit ? buildDateCountMap(habit) : {}), [habit]);

  useEffect(() => {
    if (visible) {
      const now = new Date();
      setViewMode('year');
      setFocusYear(now.getFullYear());
      setFocusMonthIndex(now.getMonth());
      setSelectedDateKey(null);
    }
  }, [visible, habitId]);

  const canPressDay = (dateKey: string) => compareDateKeys(dateKey, getTodayKey()) <= 0;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{habit?.name ?? '习惯历史'}</Text>
                <Text style={styles.subtitle}>
                  {readonly ? '归档习惯，只读查看' : '可查看并打开任意日期详情'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>关闭</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modeSwitch}>
              <TouchableOpacity
                onPress={() => setViewMode('year')}
                style={[styles.modeButton, viewMode === 'year' && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, viewMode === 'year' && styles.modeButtonTextActive]}>
                  年视图
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode('month')}
                style={[styles.modeButton, viewMode === 'month' && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, viewMode === 'month' && styles.modeButtonTextActive]}>
                  月视图
                </Text>
              </TouchableOpacity>
            </View>

            {viewMode === 'year' ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.periodHeader}>
                  <TouchableOpacity onPress={() => setFocusYear((current) => current - 1)} style={styles.periodButton}>
                    <Text style={styles.periodButtonText}>上一年</Text>
                  </TouchableOpacity>
                  <View style={styles.periodCenter}>
                    <Text style={styles.periodTitle}>{formatYearLabel(focusYear)}</Text>
                    <Text style={styles.periodMeta}>
                      全年共 {habit ? getYearTotal(habit, focusYear) : 0} 次
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setFocusYear((current) => current + 1)} style={styles.periodButton}>
                    <Text style={styles.periodButtonText}>下一年</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.monthList}>
                  {Array.from({ length: 12 }).map((_, monthIndex) => (
                    <Pressable
                      key={`${focusYear}-${monthIndex}`}
                      onPress={() => {
                        setFocusMonthIndex(monthIndex);
                        setViewMode('month');
                      }}
                      style={styles.monthCard}
                    >
                      <Text style={styles.monthTitle}>{formatMonthLabel(focusYear, monthIndex)}</Text>
                      <Text style={styles.monthMeta}>
                        {habit ? getMonthTotal(habit, focusYear, monthIndex) : 0} 次 ·
                        {habit ? getActiveDayCountInMonth(habit, focusYear, monthIndex) : 0} 天
                      </Text>
                      <HistoryCalendar
                        year={focusYear}
                        monthIndex={monthIndex}
                        dateCountMap={dateCountMap}
                        compact
                        selectedDateKey={selectedDateKey}
                        canPressDay={canPressDay}
                        onPressDay={(dateKey) => setSelectedDateKey(dateKey)}
                      />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.content}>
                <View style={styles.periodHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      if (focusMonthIndex === 0) {
                        setFocusYear((current) => current - 1);
                        setFocusMonthIndex(11);
                      } else {
                        setFocusMonthIndex((current) => current - 1);
                      }
                    }}
                    style={styles.periodButton}
                  >
                    <Text style={styles.periodButtonText}>上个月</Text>
                  </TouchableOpacity>
                  <View style={styles.periodCenter}>
                    <Text style={styles.periodTitle}>{formatMonthLabel(focusYear, focusMonthIndex)}</Text>
                    <Text style={styles.periodMeta}>
                      {habit ? getMonthTotal(habit, focusYear, focusMonthIndex) : 0} 次打卡
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (focusMonthIndex === 11) {
                        setFocusYear((current) => current + 1);
                        setFocusMonthIndex(0);
                      } else {
                        setFocusMonthIndex((current) => current + 1);
                      }
                    }}
                    style={styles.periodButton}
                  >
                    <Text style={styles.periodButtonText}>下个月</Text>
                  </TouchableOpacity>
                </View>

                <HistoryCalendar
                  year={focusYear}
                  monthIndex={focusMonthIndex}
                  dateCountMap={dateCountMap}
                  selectedDateKey={selectedDateKey}
                  canPressDay={canPressDay}
                  onPressDay={(dateKey) => setSelectedDateKey(dateKey)}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      <CheckinDetailModal
        habitId={habitId}
        dateKey={selectedDateKey}
        visible={selectedDateKey !== null}
        readonly={readonly}
        onClose={() => setSelectedDateKey(null)}
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
      padding: 20,
      backgroundColor: 'rgba(18, 31, 24, 0.22)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: '100%',
      maxHeight: '88%',
      borderRadius: theme.radius.large,
      padding: 18,
      backgroundColor: theme.colors.surface,
      gap: 14,
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
      gap: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.surfaceMuted,
    },
    closeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    modeSwitch: {
      flexDirection: 'row',
      gap: 10,
    },
    modeButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    modeButtonActive: {
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    modeButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    modeButtonTextActive: {
      color: theme.colors.primary,
    },
    content: {
      gap: 14,
    },
    periodHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    periodButton: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.surfaceMuted,
    },
    periodButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    periodCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    periodTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    periodMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    monthList: {
      gap: 12,
      paddingBottom: 12,
    },
    monthCard: {
      borderRadius: theme.radius.medium,
      padding: 14,
      backgroundColor: theme.colors.background,
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    monthTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    monthMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
  });
}
