import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getGroupUsageCount } from '../storage/habitStorage';
import { useHabits } from '../state/HabitStore';
import { TextEntryModal } from './TextEntryModal';

type GroupManagerModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function GroupManagerModal({ visible, onClose }: GroupManagerModalProps) {
  const { allHabits, groups, theme, addGroup, deleteGroup } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [addingGroup, setAddingGroup] = useState(false);

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    const usageCount = getGroupUsageCount(allHabits, groupId);

    Alert.alert(
      '确认删除分组',
      usageCount > 0
        ? `删除“${groupName}”后，该分组下的 ${usageCount} 个习惯会自动移到“未分组”。`
        : `删除“${groupName}”后，该分组会被直接移除。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认删除',
          style: 'destructive',
          onPress: () => {
            deleteGroup(groupId);
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>分组管理</Text>
                <Text style={styles.description}>这里集中管理分组；新增分组也可以直接在打卡页顶部完成。</Text>
              </View>
              <TouchableOpacity onPress={() => setAddingGroup(true)} style={styles.addButton}>
                <Text style={styles.addButtonText}>新增</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {groups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>还没有分组</Text>
                  <Text style={styles.emptyDescription}>可以创建几个常用分组，例如晨间、运动、学习。</Text>
                </View>
              ) : (
                groups.map((group) => (
                  <View key={group.id} style={styles.row}>
                    <View style={styles.meta}>
                      <Text style={styles.name}>{group.name}</Text>
                      <Text style={styles.usage}>{getGroupUsageCount(allHabits, group.id)} 个习惯</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteGroup(group.id, group.name)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>删除</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TextEntryModal
        visible={addingGroup}
        title="新建分组"
        description="分组用于在打卡页归类展示习惯，名称保持简短清晰即可。"
        placeholder="例如：晨间、运动、学习"
        submitLabel="保存"
        onClose={() => setAddingGroup(false)}
        onSubmit={addGroup}
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
      padding: 24,
      backgroundColor: 'rgba(18, 31, 24, 0.22)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: '100%',
      maxHeight: '80%',
      borderRadius: theme.radius.large,
      padding: 20,
      backgroundColor: theme.colors.surface,
      gap: 14,
      ...theme.shadow,
    },
    header: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerText: {
      flex: 1,
      gap: 4,
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
    addButton: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.primary,
    },
    addButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.white,
    },
    list: {
      gap: 10,
    },
    emptyState: {
      borderRadius: theme.radius.medium,
      padding: 16,
      backgroundColor: theme.colors.background,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    emptyDescription: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    row: {
      borderRadius: theme.radius.medium,
      padding: 14,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    meta: {
      flex: 1,
      gap: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    usage: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    deleteButton: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.dangerSoft,
    },
    deleteButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.danger,
    },
    closeButton: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
  });
}
