type Counters = Record<string, number>;
type Timings = Record<string, number>;

type Store = {
  counters: Counters;
  avgMs: Timings;
};

declare global {
  // eslint-disable-next-line no-var
  var __POCKETSENSE_PROFILING__: Store | undefined;
}

const store: Store =
  globalThis.__POCKETSENSE_PROFILING__ ??
  (globalThis.__POCKETSENSE_PROFILING__ = {
    counters: {},
    avgMs: {},
  });

export function incCounter(key: string, by = 1) {
  store.counters[key] = (store.counters[key] ?? 0) + by;
}

export function setAvgMs(key: string, value: number) {
  store.avgMs[key] = value; // zadnja izmjerena vrijednost je dovoljno
}

export function snapshot() {
  return {
    counters: { ...store.counters },
    avgMs: { ...store.avgMs },
  };
}

export function resetAll() {
  for (const k of Object.keys(store.counters)) store.counters[k] = 0;
  for (const k of Object.keys(store.avgMs)) store.avgMs[k] = 0;
}
