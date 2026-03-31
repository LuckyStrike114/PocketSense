import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { THEME } from "../../src/theme";

const GOAL_KEY = "pocketsense:stepsGoal";

type PermState = "unknown" | "granted" | "denied" | "unavailable";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function StepsScreen() {
  const subRef = useRef<{ remove: () => void } | null>(null);

  const [available, setAvailable] = useState<boolean | null>(null);
  const [perm, setPerm] = useState<PermState>("unknown");

  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(8000);
  const [status, setStatus] = useState("Init...");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const savedGoal = await AsyncStorage.getItem(GOAL_KEY);
        if (savedGoal && mounted) setGoal(Number(savedGoal));

        setStatus("Checking pedometer availability...");
        const isAvail = await Pedometer.isAvailableAsync();
        if (!mounted) return;

        setAvailable(isAvail);
        if (!isAvail) {
          setPerm("unavailable");
          setStatus("Pedometer not available on this device / environment.");
          return;
        }

        // Permissions (neke verzije expo-sensors imaju request/getPermissionsAsync)
        // Ako ne postoje, nastavimo dalje (na nekim uređajima radi bez eksplicitnog requesta)
        const anyPed: any = Pedometer;

        if (typeof anyPed.getPermissionsAsync === "function") {
          setStatus("Checking permissions...");
          const p = await anyPed.getPermissionsAsync();
          if (!mounted) return;
          if (p?.granted === true) setPerm("granted");
          else setPerm("denied");
        }

        if (perm !== "granted" && typeof anyPed.requestPermissionsAsync === "function") {
          setStatus("Requesting permissions...");
          const req = await anyPed.requestPermissionsAsync();
          if (!mounted) return;
          setPerm(req?.granted ? "granted" : "denied");
          if (!req?.granted) {
            setStatus("Permission denied (Physical activity / Motion).");
            return;
          }
        } else if (perm === "unknown") {
          // ako nismo mogli provjerit/requestat, pretpostavi da je ok
          setPerm("granted");
        }

        // Fetch steps since midnight (fallback/snapshot)
        try {
          setStatus("Fetching steps since midnight...");
          const res = await Pedometer.getStepCountAsync(startOfToday(), new Date());
          if (mounted) setSteps(res?.steps ?? 0);
        } catch {
          // nije fatalno
        }

        // Live watcher
        setStatus("Starting live step watcher...");
        subRef.current?.remove?.();
        subRef.current = Pedometer.watchStepCount((res) => {
          setSteps(res.steps);
        });

        setStatus("Live updates running. Walk a bit.");
      } catch (e) {
        setStatus("Error: " + String(e));
      }
    })();

    return () => {
      mounted = false;
      subRef.current?.remove?.();
      subRef.current = null;
    };
    // namjerno prazno: inicijalizacija samo jednom
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.min(1, goal > 0 ? steps / goal : 0);

  async function changeGoal(delta: number) {
    const next = Math.max(1000, goal + delta);
    setGoal(next);
    await AsyncStorage.setItem(GOAL_KEY, String(next));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Steps</Text>

      <View style={styles.card}>
        <Text style={styles.big}>{steps}</Text>
        <Text style={styles.muted}>steps today</Text>

        <View style={styles.barBg}>
          <View style={[styles.barFg, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.muted}>
          Goal: {goal} ({Math.round(progress * 100)}%)
        </Text>

        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={() => changeGoal(-1000)}>
            <Text style={styles.btnText}>-1000</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => changeGoal(1000)}>
            <Text style={styles.btnText}>+1000</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.muted}>Platform: {Platform.OS}</Text>
        <Text style={styles.muted}>Pedometer available: {String(available)}</Text>
        <Text style={styles.muted}>Permission: {perm}</Text>
        <Text style={styles.muted}>Status: {status}</Text>

        {(perm === "denied" || perm === "unavailable") && (
          <Text style={styles.warn}>
            Ako si na Expo Go, pedometer često ne radi jer nema Physical activity permission.
            Rješenje: dev build (expo-dev-client / run:android) ili instalirana standalone app.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg1, padding: 16, gap: 12 },
  title: { color: THEME.text, fontSize: 24, fontWeight: "900" },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  big: { color: THEME.text, fontSize: 48, fontWeight: "900", textAlign: "center" },
  muted: { color: THEME.muted, textAlign: "center", marginTop: 4, lineHeight: 18 },

  barBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 12,
    overflow: "hidden",
  },
  barFg: { height: "100%", backgroundColor: THEME.green },

  row: { flexDirection: "row", gap: 12, marginTop: 14, justifyContent: "center" },
  btn: {
    backgroundColor: THEME.green,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  btnText: { color: "#062015", fontWeight: "900" },

  warn: { color: THEME.warn, marginTop: 10, textAlign: "center", lineHeight: 18 },
});
