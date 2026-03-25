import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useHabits } from '../state/HabitStore';
import { buildFallbackTimestamp, buildTimestampForDateTime, getHourMinuteFromTimestamp } from '../utils/date';

type CheckinRecordEditorModalProps = {
  visible: boolean;
  dateKey: string;
  title: string;
  initialTimestamp?: number;
  initialNote?: string;
  onClose: () => void;
  onSubmit: (timestamp: number, note: string) => void;
};

function getInitialParts(dateKey: string, initialTimestamp?: number) {
  const baseTimestamp = initialTimestamp ?? buildFallbackTimestamp(dateKey);
  return getHourMinuteFromTimestamp(baseTimestamp);
}

export function CheckinRecordEditorModal({
  visible,
  dateKey,
  title,
  initialTimestamp,
  initialNote = '',
  onClose,
  onSubmit,
}: CheckinRecordEditorModalProps) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const next = getInitialParts(dateKey, initialTimestamp);
    setHour(next.hour);
    setMinute(next.minute);
    setNote(initialNote);
  }, [dateKey, initialNote, initialTimestamp, visible]);

  const handleSubmit = () => {
    const timestamp = buildTimestampForDateTime(dateKey, hour, minute);
    if (timestamp === null) {
      return;
    }

    onSubmit(timestamp, note);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>时间通过选择器设置，精确到分钟；备注可以为空。</Text>

          <View style={styles.timePicker}>
            <TimeColumn
              title="小时"
              values={Array.from({ length: 24 }, (_, index) => index)}
              selectedValue={hour}
              onSelect={setHour}
            />
            <TimeColumn
              title="分钟"
              values={Array.from({ length: 60 }, (_, index) => index)}
              selectedValue={minute}
              onSelect={setMinute}
            />
          </View>

          <View style={styles.noteField}>
            <Text style={styles.noteLabel}>备注</Text>
            <TextInput
              multiline
              maxLength={120}
              value={note}
              onChangeText={setNote}
              placeholder="可选，例如：晚饭后、跑步机、状态一般"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.noteInput}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={[styles.button, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={[styles.button, styles.primaryButton]}>
              <Text style={styles.primaryButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  function TimeColumn({
    title,
    values,
    selectedValue,
    onSelect,
  }: {
    title: string;
    values: number[];
    selectedValue: number;
    onSelect: (value: number) => void;
  }) {
    return (
      <View style={styles.timeColumn}>
        <Text style={styles.timeColumnTitle}>{title}</Text>
        <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
          {values.map((value) => {
            const selected = selectedValue === value;
            return (
              <TouchableOpacity
                key={`${title}-${value}`}
                onPress={() => onSelect(value)}
                style={[styles.timeOption, selected && styles.timeOptionActive]}
              >
                <Text style={[styles.timeOptionText, selected && styles.timeOptionTextActive]}>
                  {String(value).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
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
      maxHeight: '84%',
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
    timePicker: {
      flexDirection: 'row',
      gap: 12,
    },
    timeColumn: {
      flex: 1,
      gap: 8,
    },
    timeColumnTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    timeList: {
      maxHeight: 180,
      borderRadius: theme.radius.medium,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    timeOption: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    timeOptionActive: {
      backgroundColor: theme.colors.primarySoft,
    },
    timeOptionText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    timeOptionTextActive: {
      fontWeight: '700',
      color: theme.colors.primary,
    },
    noteField: {
      gap: 8,
    },
    noteLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    noteInput: {
      minHeight: 96,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.small,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.background,
      textAlignVertical: 'top',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    button: {
      minWidth: 92,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.white,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });
}
