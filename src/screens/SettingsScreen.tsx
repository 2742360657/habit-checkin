import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TextEntryModal } from '../components/TextEntryModal';
import {
  exportBackupFile,
  getGroupUsageCount,
  importBackupFile,
  pickBackupFile,
} from '../storage/habitStorage';
import { useHabits } from '../state/HabitStore';
import { THEME_PRESETS, ThemeId } from '../theme';

export function SettingsScreen() {
  const {
    appData,
    allHabits,
    hiddenHabits,
    groups,
    settings,
    theme,
    addGroup,
    deleteGroup,
    replaceAppData,
    restoreHabit,
    setThemeId,
  } = useHabits();

  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isAddGroupModalVisible, setAddGroupModalVisible] = useState(false);
  const [busyAction, setBusyAction] = useState<'backup' | 'restore' | null>(null);

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

  const handleBackup = async () => {
    try {
      setBusyAction('backup');
      await exportBackupFile(appData);
      Alert.alert('导出备份', '已打开系统分享面板，请将备份 JSON 保存到文件、网盘或聊天工具中。');
    } catch (error) {
      Alert.alert('导出失败', error instanceof Error ? error.message : '导出备份失败，请稍后重试。');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRestore = async () => {
    try {
      setBusyAction('restore');
      const fileAsset = await pickBackupFile();
      if (!fileAsset) {
        setBusyAction(null);
        return;
      }

      const importedData = await importBackupFile(fileAsset.uri);
      setBusyAction(null);

      Alert.alert(
        '覆盖恢复确认',
        `即将使用“${fileAsset.name ?? '所选文件'}”覆盖当前本地全部数据，包括习惯、分组、主题和首页文案。此操作无法撤销。`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确认恢复',
            style: 'destructive',
            onPress: () => {
              replaceAppData(importedData);
              Alert.alert('恢复成功', '本地数据已覆盖恢复。');
            },
          },
        ]
      );
    } catch (error) {
      setBusyAction(null);
      Alert.alert('恢复失败', error instanceof Error ? error.message : '恢复数据失败，请检查备份文件。');
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>主题颜色</Text>
          <Text style={styles.sectionDescription}>选择一次后会长期保留，下次打开 app 仍使用该配色。</Text>
          <View style={styles.themeList}>
            {(Object.keys(THEME_PRESETS) as ThemeId[]).map((themeId) => {
              const preset = THEME_PRESETS[themeId];
              const isActive = settings.themeId === themeId;
              return (
                <TouchableOpacity
                  key={themeId}
                  onPress={() => setThemeId(themeId)}
                  style={[styles.themeCard, isActive && styles.themeCardActive]}
                >
                  <View style={styles.themeSwatches}>
                    <View style={[styles.swatch, { backgroundColor: preset.colors.primary }]} />
                    <View style={[styles.swatch, { backgroundColor: preset.colors.primarySoft }]} />
                    <View style={[styles.swatch, { backgroundColor: preset.colors.surfaceMuted }]} />
                  </View>
                  <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>{preset.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>数据备份与恢复</Text>
          <Text style={styles.sectionDescription}>备份格式为可读 JSON，恢复前会先做版本和关键字段校验。</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              disabled={busyAction !== null}
              onPress={handleBackup}
              style={[styles.primaryAction, busyAction !== null && styles.disabledAction]}
            >
              <Text style={styles.primaryActionText}>
                {busyAction === 'backup' ? '正在导出…' : '数据备份'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busyAction !== null}
              onPress={handleRestore}
              style={[styles.secondaryAction, busyAction !== null && styles.disabledAction]}
            >
              <Text style={styles.secondaryActionText}>
                {busyAction === 'restore' ? '正在读取…' : '数据恢复'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>分组管理</Text>
              <Text style={styles.sectionDescription}>删除分组时，该分组下的习惯会自动转为“未分组”。</Text>
            </View>
            <TouchableOpacity onPress={() => setAddGroupModalVisible(true)} style={styles.inlineButton}>
              <Text style={styles.inlineButtonText}>新建分组</Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>还没有分组</Text>
              <Text style={styles.emptyDescription}>可以先创建几个常用分组，例如晨间、运动、学习。</Text>
            </View>
          ) : (
            <View style={styles.groupList}>
              {groups.map((group) => {
                const usageCount = getGroupUsageCount(allHabits, group.id);
                return (
                  <View key={group.id} style={styles.groupRow}>
                    <View style={styles.groupMeta}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupUsage}>{usageCount} 个习惯</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteGroup(group.id, group.name)}
                      style={styles.groupDeleteButton}
                    >
                      <Text style={styles.groupDeleteButtonText}>删除</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>已隐藏的习惯</Text>
          <Text style={styles.sectionDescription}>隐藏后的习惯会从首页和历史页移除，但数据会保留，可在这里恢复。</Text>
          {hiddenHabits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>没有隐藏的习惯</Text>
              <Text style={styles.emptyDescription}>如果你把习惯隐藏了，会在这里看到恢复入口。</Text>
            </View>
          ) : (
            <View style={styles.groupList}>
              {hiddenHabits.map((habit) => (
                <View key={habit.id} style={styles.groupRow}>
                  <View style={styles.groupMeta}>
                    <Text style={styles.groupName}>{habit.name}</Text>
                    <Text style={styles.groupUsage}>{habit.checkins.length} 条历史记录</Text>
                  </View>
                  <TouchableOpacity onPress={() => restoreHabit(habit.id)} style={styles.inlineButton}>
                    <Text style={styles.inlineButtonText}>恢复</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <TextEntryModal
        visible={isAddGroupModalVisible}
        title="新建分组"
        description="分组用于首页归类展示习惯，保持简短清晰即可。"
        placeholder="例如：晨间、运动、学习"
        submitLabel="保存"
        onClose={() => setAddGroupModalVisible(false)}
        onSubmit={addGroup}
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
    sectionCard: {
      borderRadius: theme.radius.large,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 14,
      ...theme.shadow,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    sectionHeaderText: {
      flex: 1,
      gap: 6,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    sectionDescription: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    themeList: {
      gap: 10,
    },
    themeCard: {
      borderRadius: theme.radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      padding: 14,
      gap: 10,
    },
    themeCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    themeSwatches: {
      flexDirection: 'row',
      gap: 8,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    themeLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    themeLabelActive: {
      color: theme.colors.primary,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryAction: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
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
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    secondaryActionText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    disabledAction: {
      opacity: 0.6,
    },
    inlineButton: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.primary,
    },
    inlineButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.white,
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
    groupList: {
      gap: 12,
    },
    groupRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      borderRadius: theme.radius.medium,
      padding: 14,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    groupMeta: {
      flex: 1,
      gap: 4,
    },
    groupName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    groupUsage: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    groupDeleteButton: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.dangerSoft,
    },
    groupDeleteButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.danger,
    },
  });
}
