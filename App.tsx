import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ProfileBar } from './src/components/ProfileBar';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { HabitProvider, useHabits } from './src/state/HabitStore';

type AppTab = 'today' | 'tasks' | 'habits' | 'settings';

const TABS: Array<{ id: AppTab; icon: string; label: string }> = [
  { id: 'today', icon: '●', label: '今天' },
  { id: 'tasks', icon: '✓', label: '待办' },
  { id: 'habits', icon: '↗', label: '习惯' },
  { id: 'settings', icon: '◇', label: '设置' },
];

function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>('today');
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
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>正在读取本地数据...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <ProfileBar onPress={() => setActiveTab('settings')} />
            <View style={[styles.screen, activeTab !== 'today' && styles.hidden]}>
              <TodayScreen onOpenTasks={() => setActiveTab('tasks')} onOpenHabits={() => setActiveTab('habits')} />
            </View>
            <View style={[styles.screen, activeTab !== 'tasks' && styles.hidden]}>
              <TasksScreen />
            </View>
            <View style={[styles.screen, activeTab !== 'habits' && styles.hidden]}>
              <HomeScreen />
            </View>
            <View style={[styles.screen, activeTab !== 'settings' && styles.hidden]}>
              <SettingsScreen />
            </View>
          </View>
        )}

        {!isLoading ? (
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setActiveTab(tab.id)}
                  style={styles.tabButton}
                >
                  <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tab.icon}</Text>
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
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
      paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0,
      backgroundColor: theme.colors.background,
    },
    app: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, paddingBottom: 70 },
    screen: { flex: 1 },
    hidden: { display: 'none' },
    tabBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: 70,
      paddingHorizontal: 8,
      paddingTop: 7,
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    tabIcon: { fontSize: 15, fontWeight: '800', color: theme.colors.textMuted },
    tabIconActive: { color: theme.colors.primary },
    tabLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
    tabLabelActive: { color: theme.colors.primary },
    loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: theme.colors.textSecondary },
  });
}
