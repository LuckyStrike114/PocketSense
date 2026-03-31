import { Accelerometer } from "expo-sensors";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { incCounter, setAvgMs } from "../../src/profilingStore";
import { THEME } from "../../src/theme";

function magnitude3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

export default function StabilityScreen() {
  const [available, setAvailable] = useState<boolean | null>(null);

  const [testing, setTesting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);

  const [score, setScore] = useState<number | null>(null);
  const [live, setLive] = useState(0); // trenutna “turbulencija”

  const magsRef = useRef<number[]>([]);
  const lastMagRef = useRef<number | null>(null);

  const shakeArmed = useRef(true);
  const lastShakeMs = useRef(0);

  const statusText = useMemo(() => {
    if (testing) return `Testing... ${secondsLeft}s`;
    if (score == null) return "Press Start and keep the phone steady for 10s.";
    return "Done. Press Start again, or shake to reset.";
  }, [testing, secondsLeft, score]);

  useEffect(() => {
    (async () => {
      const isAvail = await Accelerometer.isAvailableAsync();
      setAvailable(isAvail);
    })();
  }, []);

  useEffect(() => {
    if (!available) return;

    Accelerometer.setUpdateInterval(50); // 20 Hz

    const sub = Accelerometer.addListener((d) => {
      const t0 = Date.now();

      const mag = magnitude3(d.x, d.y, d.z);
      const prev = lastMagRef.current;
      lastMagRef.current = mag;

      const diff = prev == null ? 0 : Math.abs(mag - prev);
      setLive(diff);

      // Profiliranje
      incCounter("stabilityAccelEvents", 1);
      setAvgMs("stabilityProcessingMs", Date.now() - t0);

      // Ako test traje, skupljaj podatke
      if (testing) {
        magsRef.current.push(diff);
        if (magsRef.current.length > 1000) magsRef.current.shift(); // sigurnost
      }

      // Shake-to-reset (gesture)
      // Jednostavan prag: ako diff naglo skoči
      const now = Date.now();
      const shakeThreshold = 1.2; // po potrebi promijeni (ovisno o uređaju)
      if (!testing && diff > shakeThreshold && shakeArmed.current && now - lastShakeMs.current > 1200) {
        lastShakeMs.current = now;
        shakeArmed.current = false;
        resetAll();
        setTimeout(() => (shakeArmed.current = true), 800);
      }
    });

    return () => sub.remove();
  }, [available, testing]);

  useEffect(() => {
    if (!testing) return;

    setSecondsLeft(10);
    magsRef.current = [];
    lastMagRef.current = null;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, 10 - elapsed);
      setSecondsLeft(left);

      if (left === 0) {
        clearInterval(timer);
        finishTest();
      }
    }, 200);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testing]);

  function startTest() {
    setScore(null);
    setTesting(true);
  }

  function finishTest() {
    setTesting(false);

    const data = magsRef.current;
    if (data.length < 5) {
      setScore(0);
      return;
    }

    // “stability” = 100 - scaled average diff
    const avg = data.reduce((s, v) => s + v, 0) / data.length;

    // Skaliranje u score: avg diff 0.00 -> 100, 0.80+ -> 0
    const scaled = Math.max(0, Math.min(1, avg / 0.8));
    const s = Math.round(100 * (1 - scaled));

    setScore(s);
  }

  function resetAll() {
    magsRef.current = [];
    lastMagRef.current = null;
    setScore(null);
    setLive(0);
    setTesting(false);
    setSecondsLeft(10);
  }

  const badgeColor =
    score == null ? THEME.muted : score >= 80 ? THEME.green : score >= 50 ? THEME.warn : THEME.bad;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stability Test</Text>

      <View style={styles.card}>
        <Text style={styles.muted}>{statusText}</Text>

        <Text style={[styles.big, { color: badgeColor }]}>
          {score == null ? "--" : `${score}%`}
        </Text>

        <Text style={styles.small}>Live movement: {live.toFixed(3)}</Text>

        <View style={styles.row}>
          <Pressable
            style={[styles.btn, testing && { opacity: 0.6 }]}
            disabled={testing}
            onPress={startTest}
          >
            <Text style={styles.btnText}>Start 10s</Text>
          </Pressable>

          <Pressable style={styles.btn2} onPress={resetAll}>
            <Text style={styles.btnText2}>Reset</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Gesture: shake phone to reset (kad test ne radi).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.muted}>Accelerometer available: {String(available)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg1, padding: 16, gap: 12 },
  title: { color: THEME.text, fontSize: 24, fontWeight: "800" },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  muted: { color: THEME.muted, textAlign: "center" },

  big: { fontSize: 54, fontWeight: "900", textAlign: "center", marginTop: 10 },

  small: { color: THEME.muted, textAlign: "center", marginTop: 6 },

  row: { flexDirection: "row", gap: 12, marginTop: 14 },
  btn: {
    flex: 1,
    backgroundColor: THEME.green,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: "#062015", fontWeight: "900" },

  btn2: {
    width: 110,
    backgroundColor: THEME.purple,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText2: { color: THEME.text, fontWeight: "900" },

  hint: { color: THEME.muted, fontSize: 12, textAlign: "center", marginTop: 10 },
});
