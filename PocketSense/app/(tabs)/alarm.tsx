import { Accelerometer } from "expo-sensors";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { incCounter, setAvgMs } from "../../src/profilingStore";
import { THEME } from "../../src/theme";

function magnitude3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export default function AlarmScreen() {
  const [available, setAvailable] = useState<boolean | null>(null);

  const [hour, setHour] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => (new Date().getMinutes() + 1) % 60);

  const [armed, setArmed] = useState(false);
  const [ringing, setRinging] = useState(false);

  const [status, setStatus] = useState("Set time, arm alarm.");
  const [moveScore, setMoveScore] = useState(0);

  const alarmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMagRef = useRef<number | null>(null);
  const moveAccumRef = useRef(0);

  const timeLabel = useMemo(() => `${pad2(hour)}:${pad2(minute)}`, [hour, minute]);

  useEffect(() => {
    (async () => {
      const isAvail = await Accelerometer.isAvailableAsync();
      setAvailable(isAvail);
    })();
  }, []);

  // Check clock loop (in-app)
  useEffect(() => {
    if (!armed) return;

    setStatus(`Armed for ${timeLabel} (app must stay open).`);

    alarmTimerRef.current && clearInterval(alarmTimerRef.current);
    alarmTimerRef.current = setInterval(() => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();

      if (h === hour && m === minute) {
        setRinging(true);
        setArmed(false);
      }
    }, 1000);

    return () => {
      alarmTimerRef.current && clearInterval(alarmTimerRef.current);
      alarmTimerRef.current = null;
    };
  }, [armed, hour, minute, timeLabel]);

  // While ringing: require movement to stop
  useEffect(() => {
    if (!ringing) return;

    setStatus("RINGING! Move the phone to stop.");
    setMoveScore(0);
    moveAccumRef.current = 0;
    lastMagRef.current = null;

    Accelerometer.setUpdateInterval(80);

    const sub = Accelerometer.addListener((d) => {
      const t0 = Date.now();

      const mag = magnitude3(d.x, d.y, d.z);
      const prev = lastMagRef.current;
      lastMagRef.current = mag;

      const diff = prev == null ? 0 : Math.abs(mag - prev);

      // akumuliraj kretanje
      moveAccumRef.current += diff;
      const score = Math.min(100, Math.round(moveAccumRef.current * 35));
      setMoveScore(score);

      incCounter("alarmAccelEvents", 1);
      setAvgMs("alarmProcessingMs", Date.now() - t0);

      // prag za gašenje alarma
      if (score >= 100) {
        setRinging(false);
        setStatus("Stopped. Good morning.");
      }
    });

    return () => sub.remove();
  }, [ringing]);

  function adjustHour(delta: number) {
    setHour((h) => (h + delta + 24) % 24);
  }

  function adjustMinute(delta: number) {
    setMinute((m) => (m + delta + 60) % 60);
  }

  function arm() {
    setRinging(false);
    setArmed(true);
  }

  function disarm() {
    setArmed(false);
    setRinging(false);
    setStatus("Disarmed.");
  }

  function snooze() {
    // +5 min snooze
    const total = hour * 60 + minute + 5;
    const nh = Math.floor((total / 60) % 24);
    const nm = total % 60;
    setHour(nh);
    setMinute(nm);
    setRinging(false);
    setArmed(true);
    setStatus(`Snoozed to ${pad2(nh)}:${pad2(nm)}.`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Move-to-stop Alarm</Text>

      <View style={[styles.card, ringing && styles.ringingCard]}>
        <Text style={styles.label}>Time</Text>
        <Text style={styles.time}>{timeLabel}</Text>

        <View style={styles.row}>
          <Pressable style={styles.smallBtn} onPress={() => adjustHour(-1)}>
            <Text style={styles.smallBtnText}>Hour -</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => adjustHour(1)}>
            <Text style={styles.smallBtnText}>Hour +</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.smallBtn} onPress={() => adjustMinute(-1)}>
            <Text style={styles.smallBtnText}>Min -</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => adjustMinute(1)}>
            <Text style={styles.smallBtnText}>Min +</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable style={[styles.btn, { backgroundColor: THEME.green }]} onPress={arm} disabled={!available}>
            <Text style={styles.btnTextDark}>Arm</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: THEME.purple }]} onPress={disarm}>
            <Text style={styles.btnText}>Disarm</Text>
          </Pressable>
        </View>

        {ringing && (
          <>
            <Text style={styles.ringText}>RINGING</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFg, { width: `${moveScore}%` }]} />
            </View>
            <Text style={styles.muted}>Move score: {moveScore}/100</Text>

            <View style={styles.row}>
              <Pressable style={[styles.btn, { backgroundColor: THEME.purple }]} onPress={snooze}>
                <Text style={styles.btnText}>Snooze +5</Text>
              </Pressable>
            </View>
          </>
        )}

        <Text style={styles.status}>{status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.muted}>Accelerometer available: {String(available)}</Text>
        <Text style={styles.muted}>
          Napomena: ovo je in-app alarm (radi dok je aplikacija otvorena).
        </Text>
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
  ringingCard: {
    borderColor: "rgba(46,229,157,0.35)",
  },

  label: { color: THEME.muted, textAlign: "center" },
  time: { color: THEME.text, fontSize: 52, fontWeight: "900", textAlign: "center", marginTop: 6 },

  row: { flexDirection: "row", gap: 12, marginTop: 12, justifyContent: "center" },

  smallBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  smallBtnText: { color: THEME.text, fontWeight: "800" },

  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: THEME.text, fontWeight: "900" },
  btnTextDark: { color: "#062015", fontWeight: "900" },

  ringText: {
    color: THEME.green,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 2,
  },

  barBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 10,
    overflow: "hidden",
  },
  barFg: { height: "100%", backgroundColor: THEME.green },

  muted: { color: THEME.muted, textAlign: "center", marginTop: 8 },

  status: { color: THEME.muted, textAlign: "center", marginTop: 12, fontSize: 12 },
});
