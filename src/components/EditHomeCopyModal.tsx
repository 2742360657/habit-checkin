import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useHabits } from '../state/HabitStore';

type EditHomeCopyModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function EditHomeCopyModal({ visible, onClose }: EditHomeCopyModalProps) {
  const { theme, settings, updateHomeCopy } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState(settings.homeHeroTitle);
  const [description, setDescription] = useState(settings.homeHeroDescription);

  useEffect(() => {
    if (visible) {
      setTitle(settings.homeHeroTitle);
      setDescription(settings.homeHeroDescription);
    }
  }, [settings.homeHeroDescription, settings.homeHeroTitle, visible]);

  const handleSubmit = () => {
    const success = updateHomeCopy(title, description);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>修改首页说明文案</Text>
          <Text style={styles.description}>保持简短直接即可，保存后会长期保留。</Text>

          <View style={styles.field}>
            <Text style={styles.label}>标题</Text>
            <TextInput
              maxLength={30}
              value={title}
              onChangeText={setTitle}
              placeholder="输入标题"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>说明</Text>
            <TextInput
              multiline
              maxLength={120}
              value={description}
              onChangeText={setDescription}
              placeholder="输入说明文案"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.textarea]}
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
    field: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.small,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.background,
    },
    textarea: {
      minHeight: 110,
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
