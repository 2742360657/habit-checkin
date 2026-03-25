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

type AddHabitModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function AddHabitModal({ visible, onClose }: AddHabitModalProps) {
  const { theme, groups, addHabit } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setName('');
      setSelectedGroupId(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    const success = addHabit(name, selectedGroupId);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>新建习惯</Text>
          <Text style={styles.description}>输入习惯名称，并为它选择一个分组。</Text>
          <TextInput
            autoFocus
            maxLength={24}
            placeholder="例如：喝水、散步、背单词"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <View style={styles.groupSection}>
            <Text style={styles.groupTitle}>所属分组</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupList}
            >
              <GroupOption
                label="未分组"
                selected={selectedGroupId === null}
                onPress={() => setSelectedGroupId(null)}
              />
              {groups.map((group) => (
                <GroupOption
                  key={group.id}
                  label={group.name}
                  selected={selectedGroupId === group.id}
                  onPress={() => setSelectedGroupId(group.id)}
                />
              ))}
            </ScrollView>
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

  function GroupOption({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.groupChip, selected && styles.groupChipActive]}>
        <Text style={[styles.groupChipText, selected && styles.groupChipTextActive]}>{label}</Text>
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
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.small,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.background,
    },
    groupSection: {
      gap: 10,
    },
    groupTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    groupList: {
      gap: 10,
    },
    groupChip: {
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    groupChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    groupChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    groupChipTextActive: {
      color: theme.colors.primary,
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
