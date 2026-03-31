import { Tabs } from "expo-router";
import { THEME } from "../../src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: THEME.bg1 },
        headerTintColor: THEME.text,
        tabBarStyle: {
          backgroundColor: THEME.bg1,
          borderTopColor: "rgba(255,255,255,0.08)",
        },
        tabBarActiveTintColor: THEME.text,
        tabBarInactiveTintColor: THEME.muted,
        tabBarIcon: () => null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="mood" options={{ title: "Mood" }} />
      <Tabs.Screen name="steps" options={{ title: "Steps" }} />
      <Tabs.Screen name="light" options={{ title: "Light" }} />
      <Tabs.Screen name="stability" options={{ title: "Stability" }} />
      <Tabs.Screen name="alarm" options={{ title: "Alarm" }} />
    </Tabs>
  );
}
