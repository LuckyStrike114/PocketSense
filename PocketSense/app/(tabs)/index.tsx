import * as Linking from "expo-linking";
import { Href, Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { THEME } from "../../src/theme";

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>PocketSense</Text>
      <Text style={styles.subtitle}>
        Sensor dashboard: Mood, Steps, Light, Stability i Move-to-stop Alarm.
      </Text>

      <View style={styles.grid}>
  <Card
    title="Mood"
    desc="Procjena raspoloženja iz pokreta (Accelerometer)"
    href="/(tabs)/mood"
  />
  <Card
    title="Steps"
    desc="Koraci + dnevni cilj (Demo / Pedometer)"
    href="/(tabs)/steps"
  />
  <Card
    title="Light"
    desc="Auto tema prema svjetlu (Light sensor)"
    href="/(tabs)/light"
  />
  <Card
    title="Stability"
    desc="Test mirne ruke (Accelerometer)"
    href="/(tabs)/stability"
  />
  <Card
    title="Alarm"
    desc="Gasi se tek kad se krećeš"
    href="/(tabs)/alarm"
  />
  <Card
  title="Profiling"
  desc="JS FPS + event-loop lag + app state"
  href="/profiling"
  />
</View>


      <Pressable
        style={styles.linkBtn}
        onPress={() => Linking.openURL("https://docs.expo.dev/")}
      >
        <Text style={styles.linkBtnText}>Open Expo Docs (link)</Text>
      </Pressable>

    </ScrollView>
  );
}

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: Href;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: THEME.bg1,
    minHeight: "100%",
  },
  title: { color: THEME.text, fontSize: 28, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: THEME.muted, fontSize: 14, marginBottom: 16 },
  grid: { gap: 12 },
  card: {
    backgroundColor: THEME.card,
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  cardTitle: { color: THEME.text, fontSize: 18, fontWeight: "700", marginBottom: 4 },
  cardDesc: { color: THEME.muted, fontSize: 13, lineHeight: 18 },
  linkBtn: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: THEME.card2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  linkBtnText: { color: THEME.text, fontWeight: "700" },
  note: { color: THEME.muted, fontSize: 12, marginTop: 12, lineHeight: 16 },
});
