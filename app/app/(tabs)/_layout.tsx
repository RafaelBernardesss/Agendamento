import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';
import { colors, fonts } from '../../src/theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

const icon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) =>
    <Feather name={name} size={22} color={color as string} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 11 },
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F3E4EB' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="agendar" options={{ title: 'Agendar', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="notificacoes" options={{ title: 'Notificações', tabBarIcon: icon('bell') }} />
      <Tabs.Screen name="agendamentos" options={{ title: 'Agendamentos', tabBarIcon: icon('clipboard') }} />
      <Tabs.Screen name="informacoes" options={{ href: null }} />
      <Tabs.Screen name="contato" options={{ href: null }} />
    </Tabs>
  );
}
