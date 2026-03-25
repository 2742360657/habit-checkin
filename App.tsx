import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { HabitProvider, useHabits } from './src/state/HabitStore';

type AppTab = 'checkin' | 'settings';

function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>('checkin');
  const hasShownErrorRef = useRef<string | null>(null);
  const { isLoading, error, clearError, theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (!error || hasShownErrorRef.current === error) {
      return;
    }

    hasShownErrorRef.current = error;
    Alert.alert('存储提示', error, [
      {
        text: '知道了',
        onPress: () => {
          clearError();
          hasShownErrorRef.current = null;
        },
      },
    ]);
  }, [error, clearError]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>打卡喵</Text>
            <Text style={styles.subtitle}>本地打卡 · 分组整理 · 可备份恢复</Text>
          </View>
          <View style={styles.tabBar}>
            <TabButton
              label="打卡"
              isActive={activeTab === 'checkin'}
              onPress={() => setActiveTab('checkin')}
            />
            <TabButton
              label="设置"
              isActive={activeTab === 'settings'}
              onPress={() => setActiveTab('settings')}
            />
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>正在读取本地数据...</Text>
          </View>
        ) : activeTab === 'checkin' ? (
          <HomeScreen />
        ) : (
          <SettingsScreen />
        )}
      </View>
    </SafeAreaView>
  );

  function TabButton({
    label,
    isActive,
    onPress,
  }: {
    label: string;
    isActive: boolean;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
      >
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

export default function App() {
  return (
    <HabitProvider>
      <AppShell />
    </HabitProvider>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    app: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    tabBar: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      padding: 4,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      gap: 6,
    },
    tabButton: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 12,
    },
    tabButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    tabButtonTextActive: {
      color: theme.colors.white,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
  });
}
