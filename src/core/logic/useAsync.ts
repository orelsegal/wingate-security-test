import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (value: T) => void;
}

/** Small loader hook: gives every screen a real loading / error / empty state. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    run()
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "משהו השתבש");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [run, tick]);

  return {
    data,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
    setData,
  };
}
