import { useRef } from "react";

export function useRerenderCounter() {
  const renders = useRef(0);
  renders.current += 1;
  return renders.current;
}
