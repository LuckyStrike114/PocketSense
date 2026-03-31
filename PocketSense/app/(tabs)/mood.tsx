import AsyncStorage from "@react-native-async-storage/async-storage";
import { Accelerometer } from "expo-sensors";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { useRerenderCounter } from "../../src/hooks/useRerenderCounter";
import { useRollingAverage } from "../../src/hooks/useRollingAverage";
import { incCounter, setAvgMs } from "../../src/profilingStore";
import { THEME } from "../../src/theme";

type MoodLabel = "Calm" | "Active" | "Stressed";

const STORAGE_KEY = "pocketsense:moodHistory";

function classify(activity: number): MoodLabel {
  if (activity < 0.15) return "Calm";
  if (activity < 0.45) return "Active";
  return "Stressed";
}

function magnitude3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}


export default function MoodScreen() {
  const renders = useRerenderCounter();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [activity, setActivity] = useState(0);
  const [history, setHistory] = useState<{ ts: number; mood: MoodLabel; activity: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const { avg, push, reset } = useRollingAverage(25);
  const lastMag = useRef<number | null>(null);

  const mood = useMemo(() => classify(activity), [activity]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30,
        onPanResponderRelease: (_, g) => {
          if (history.length === 0) return;
          if (g.dx < -30) setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
          if (g.dx > 30) setHistoryIndex((i) => Math.max(0, i - 1));
        },
      }),
    [history.length]
  );

  useEffect(() => {
    (async () => {
      const isAvail = await Accelerometer.isAvailableAsync();
      setAvailable(isAvail);
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setHistory(parsed);
      setHistoryIndex(0);
    })();
  }, []);

  useEffect(() => {
    if (!available) return;
    Accelerometer.setUpdateInterval(200);

    const sub = Accelerometer.addListener((d) => {
      const t0 = Date.now();

      const mag = magnitude3(d.x, d.y, d.z);
      const prev = lastMag.current;
      lastMag.current = mag;

      // activity = avg absolute difference (simple, stabilno)
      const diff = prev == null ? 0 : Math.abs(mag - prev);
      push(diff);

      setActivity(avg);

      incCounter("accelEvents", 1);
      setAvgMs("moodProcessingAvgMs", (Date.now() - t0));
    });

    return () => sub.remove();
  }, [available, avg, push]);

  const bg = mood === "Calm" ? THEME.bg2 : mood === "Active" ? "rgba(255,209,102,0.10)" : "rgba(255,92,119,0.10)";

  async function saveMood() {
    const entry = { ts: Date.now(), mood, activity };
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    setHistoryIndex(0);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function resetLive() {
    lastMag.current = null;
    reset();
    setActivity(0);
  }

  const shown = history[historyIndex];

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg1 }]} {...pan.panHandlers}>
      <View style={[styles.hero, { backgroundColor: bg }]}>
        <Text style={styles.title}>Mood from Movement</Text>
        <Text style={styles.value}>{mood}</Text>
        <Text style={styles.small}>Activity score (avg): {activity.toFixed(3)}</Text>
        <Text style={styles.small}>Re-renders (debug): {renders}</Text>

        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={saveMood}>
            <Text style={styles.btnText}>Save mood</Text>
          </Pressable>
          <Pressable style={styles.btn2} onPress={resetLive}>
            <Text style={styles.btnText}>Reset</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>Swipe left/right za povijest (gesture).</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved history</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>Nema zapisa još. Klikni “Save mood”.</Text>
        ) : (
          <>
            <Text style={styles.item}>
              {new Date(shown.ts).toLocaleString()} — {shown.mood} — {shown.activity.toFixed(3)}
            </Text>
            <Text style={styles.muted}>Index: {historyIndex + 1}/{history.length}</Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.muted}>
          Accelerometer available: {String(available)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  hero: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  title: { color: THEME.text, fontSize: 18, fontWeight: "800" },
  value: { color: THEME.text, fontSize: 34, fontWeight: "900", marginTop: 8 },
  small: { color: THEME.muted, marginTop: 6 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, backgroundColor: THEME.card2, padding: 12, borderRadius: 12, alignItems: "center" },
  btn2: { width: 110, backgroundColor: THEME.card, padding: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: THEME.text, fontWeight: "800" },
  hint: { color: THEME.muted, marginTop: 10, fontSize: 12 },
  card: { backgroundColor: THEME.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  cardTitle: { color: THEME.text, fontWeight: "800", marginBottom: 6 },
  item: { color: THEME.text, lineHeight: 20 },
  muted: { color: THEME.muted },
});
