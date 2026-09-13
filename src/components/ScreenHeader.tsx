import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useHabits } from '../state/HabitStore';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function ScreenHeader({ eyebrow, title, description, action }: ScreenHeaderProps) {
  const { theme } = useHabits();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {action}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useHabits>['theme']) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    description: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textSecondary,
    },
  });
}
