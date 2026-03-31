import { Stack } from "expo-router";
import { THEME } from "../src/theme";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: THEME.bg1 },
        headerTintColor: THEME.text,
        contentStyle: { backgroundColor: THEME.bg1 },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profiling" options={{ title: "Profiling" }} />
    </Stack>
  );
}
