import { useRef, useState } from "react";

export function useRollingAverage(windowSize = 30) {
  const buf = useRef<number[]>([]);
  const [avg, setAvg] = useState<number>(0);

  function push(value: number) {
    const b = buf.current;
    b.push(value);
    if (b.length > windowSize) b.shift();
    const a = b.reduce((s, v) => s + v, 0) / Math.max(1, b.length);
    setAvg(a);
  }

  function reset() {
    buf.current = [];
    setAvg(0);
  }

  return { avg, push, reset };
}
