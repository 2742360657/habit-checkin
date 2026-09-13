import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
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
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const next = getInitialParts(dateKey, initialTimestamp);
    setHour(String(next.hour).padStart(2, '0'));
    setMinute(String(next.minute).padStart(2, '0'));
    setNote(initialNote);
  }, [dateKey, initialNote, initialTimestamp, visible]);

  const handleSubmit = () => {
    if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) {
      Alert.alert('时间格式有误', '请输入有效的小时和分钟。');
      return;
    }
    const timestamp = buildTimestampForDateTime(dateKey, Number(hour), Number(minute));
    if (timestamp === null) {
      Alert.alert('时间格式有误', '小时应为 0–23，分钟应为 0–59。');
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
          <Text style={styles.description}>直接输入时间，或使用下面的快捷分钟；备注可以为空。</Text>

          <View style={styles.timePicker}>
            <TimeField
              title="小时"
              value={hour}
              onChange={setHour}
            />
            <Text style={styles.timeColon}>:</Text>
            <TimeField
              title="分钟"
              value={minute}
              onChange={setMinute}
            />
          </View>
          <View style={styles.quickRow}>
            <TouchableOpacity
              onPress={() => {
                const now = new Date();
                setHour(String(now.getHours()).padStart(2, '0'));
                setMinute(String(now.getMinutes()).padStart(2, '0'));
              }}
              style={styles.quickButton}
            >
              <Text style={styles.quickButtonText}>现在</Text>
            </TouchableOpacity>
            {['00', '15', '30', '45'].map((value) => (
              <TouchableOpacity key={value} onPress={() => setMinute(value)} style={styles.quickButton}>
                <Text style={styles.quickButtonText}>:{value}</Text>
              </TouchableOpacity>
            ))}
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

  function TimeField({
    title,
    value,
    onChange,
  }: {
    title: string;
    value: string;
    onChange: (value: string) => void;
  }) {
    return (
      <View style={styles.timeField}>
        <Text style={styles.timeColumnTitle}>{title}</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          value={value}
          onChangeText={(next) => onChange(next.replace(/\D/g, ''))}
          style={styles.timeInput}
        />
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
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 14,
    },
    timeField: {
      width: 112,
      gap: 8,
    },
    timeColumnTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    timeInput: {
      height: 68,
      borderRadius: 18,
      textAlign: 'center',
      fontSize: 30,
      fontWeight: '800',
      color: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    timeColon: {
      paddingBottom: 16,
      fontSize: 30,
      fontWeight: '800',
      color: theme.colors.textSecondary,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 7,
    },
    quickButton: {
      flex: 1,
      borderRadius: 11,
      paddingVertical: 9,
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    quickButtonText: {
      fontSize: 12,
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
