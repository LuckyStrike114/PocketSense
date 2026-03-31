import { useEffect, useMemo, useState } from "react";
import { AppState, AppStateStatus, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRerenderCounter } from "../src/hooks/useRerenderCounter";
import { THEME } from "../src/theme";

export default function ProfilingScreen() {
  const renders = useRerenderCounter();

  const [jsFps, setJsFps] = useState(0);
  const [loopLagMs, setLoopLagMs] = useState(0);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [samples, setSamples] = useState<{ t: number; fps: number; lag: number }[]>([]);

  // JS FPS (requestAnimationFrame)
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = Date.now();
    let alive = true;

    const tick = () => {
      frames += 1;
      const now = Date.now();
      if (now - last >= 1000) {
        const fps = frames; // approx frames per last ~1s
        setJsFps(fps);
        frames = 0;
        last = now;
      }
      if (!alive) return;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  // Event loop lag (setInterval drift)
  useEffect(() => {
    const intervalMs = 200;
    let expected = Date.now() + intervalMs;

    const id = setInterval(() => {
      const now = Date.now();
      const drift = now - expected; // koliko kasni
      expected = now + intervalMs;

      const lag = Math.max(0, drift);
      setLoopLagMs(Math.round(lag));

      setSamples((prev) => {
        const next = [...prev, { t: now, fps: jsFps, lag }];
        return next.slice(-20);
      });
    }, intervalMs);

    return () => clearInterval(id);
  }, [jsFps]);

  // AppState changes
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppState(s));
    return () => sub.remove();
  }, []);

  const quality = useMemo(() => {
    if (jsFps >= 55 && loopLagMs < 20) return "Smooth";
    if (jsFps >= 40 && loopLagMs < 60) return "OK";
    return "Laggy";
  }, [jsFps, loopLagMs]);

  function resetSamples() {
    setSamples([]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profiling</Text>
      <Text style={styles.subtitle}>
        Osnovno profiliranje (bez posebnih alata): JS FPS, event-loop lag, app state i re-render count.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live metrics</Text>
        <Row left="JS FPS (approx)" right={`${jsFps}`} accent />
        <Row left="Event loop lag" right={`${loopLagMs} ms`} accent />
        <Row left="Quality" right={quality} accent />
        <Row left="AppState" right={appState} />
        <Row left="Re-renders (this screen)" right={`${renders}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last samples (20)</Text>
        {samples.length === 0 ? (
          <Text style={styles.muted}>Nema uzoraka još (pričekaj 2–3 sek).</Text>
        ) : (
          samples
            .slice()
            .reverse()
            .map((s, idx) => (
              <Text key={idx} style={styles.sample}>
                {new Date(s.t).toLocaleTimeString()} — fps: {s.fps} — lag: {Math.round(s.lag)}ms
              </Text>
            ))
        )}

        <View style={styles.rowBtns}>
          <Pressable style={styles.btn} onPress={resetSamples}>
            <Text style={styles.btnText}>Reset samples</Text>
          </Pressable>
        </View>
      </View>

    </ScrollView>
  );
}

function Row({ left, right, accent }: { left: string; right: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.left}>{left}</Text>
      <Text style={[styles.right, accent && { color: THEME.green }]}>{right}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: THEME.bg1, minHeight: "100%", gap: 12 },
  title: { color: THEME.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: THEME.muted, lineHeight: 18 },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardTitle: { color: THEME.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
  muted: { color: THEME.muted },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  left: { color: THEME.text, flex: 1, paddingRight: 10 },
  right: { color: THEME.text, fontWeight: "900" },

  sample: { color: THEME.muted, lineHeight: 18 },

  rowBtns: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  btn: {
    backgroundColor: THEME.purple,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  btnText: { color: THEME.text, fontWeight: "900" },

  note: { color: THEME.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },
});
