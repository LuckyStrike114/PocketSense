import { LightSensor } from "expo-sensors";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { incCounter } from "../../src/profilingStore";
import { THEME } from "../../src/theme";

export default function LightScreen() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [lux, setLux] = useState<number>(0);
  const [autoMode, setAutoMode] = useState(true);

  useEffect(() => {
    let sub: any;

    (async () => {
      const isAvail = await LightSensor.isAvailableAsync();
      setAvailable(isAvail);

      if (!isAvail) return;

      LightSensor.setUpdateInterval(500);

      sub = LightSensor.addListener((data) => {
        setLux(data.illuminance ?? 0);
        incCounter("lightSensorEvents", 1);
      });
    })();

    return () => {
      sub && sub.remove();
    };
  }, []);

  const isDarkEnv = lux < 80;
  const suggestedMode = isDarkEnv ? "Dark" : "Light";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ambient Light</Text>

      <View style={styles.card}>
        <Text style={styles.big}>{lux.toFixed(0)} lx</Text>
        <Text style={styles.muted}>Current light level</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Auto mode</Text>
          <Switch
            value={autoMode}
            onValueChange={setAutoMode}
            thumbColor={autoMode ? THEME.green : "#999"}
            trackColor={{ false: "#555", true: THEME.green }}
          />
        </View>

        <Text style={styles.info}>
          Suggested mode:{" "}
          <Text style={{ color: THEME.green, fontWeight: "800" }}>
            {suggestedMode}
          </Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.muted}>
          Light sensor available: {String(available)}
        </Text>

        {!available && (
          <Text style={styles.warn}>
            Ovaj uređaj nema senzor svjetla. Koristi se ručni / demo prikaz.
          </Text>
        )}

        <Text style={styles.note}>
          Prag: &lt; 80 lx = tamno okruženje
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg1,
    padding: 16,
    gap: 12,
  },
  title: { color: THEME.text, fontSize: 24, fontWeight: "800" },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  big: {
    color: THEME.text,
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
  },
  muted: {
    color: THEME.muted,
    textAlign: "center",
    marginTop: 4,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  label: { color: THEME.text, fontSize: 16 },

  info: {
    marginTop: 12,
    textAlign: "center",
    color: THEME.muted,
  },

  warn: {
    color: THEME.warn,
    marginTop: 8,
    textAlign: "center",
  },

  note: {
    color: THEME.muted,
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
  },
});
