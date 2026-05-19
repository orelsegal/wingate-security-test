/**
 * UiLabelsContext — global, admin-editable UI labels.
 *
 * Phase B of the Admin Builder. Persisted in localStorage as a partial
 * override map merged on top of `defaultUiLabels`. Phase E will move
 * persistence to a backend `app_settings` row.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultUiLabels, cloneDefaults, type UiLabels } from "@/config/uiLabels";

const STORAGE_KEY = "wingate_ui_labels_overrides_v1";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

interface UiLabelsContextValue {
  labels: UiLabels;
  /** Update a single leaf path, e.g. setLabel(["nav","students"], "אתלטים") */
  setLabel: (path: (string | number)[], value: string | boolean) => void;
  /** Reset a single path back to default */
  resetPath: (path: (string | number)[]) => void;
  /** Reset everything */
  resetAll: () => void;
  /** True if any override exists */
  hasOverrides: boolean;
}

const UiLabelsContext = createContext<UiLabelsContextValue | null>(null);

const deepMerge = <T,>(base: T, patch: DeepPartial<T>): T => {
  if (patch === null || patch === undefined) return base;
  if (typeof base !== "object" || base === null || Array.isArray(base)) return (patch as unknown as T) ?? base;
  const out: any = { ...base };
  for (const k of Object.keys(patch as object)) {
    const pv = (patch as any)[k];
    if (pv && typeof pv === "object" && !Array.isArray(pv)) {
      out[k] = deepMerge((base as any)[k] ?? {}, pv);
    } else if (pv !== undefined) {
      out[k] = pv;
    }
  }
  return out;
};

const setDeep = (obj: any, path: (string | number)[], value: unknown) => {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const next = obj && typeof obj === "object" ? { ...obj } : {};
  next[head] = setDeep(next[head], rest, value);
  return next;
};

const unsetDeep = (obj: any, path: (string | number)[]) => {
  if (!obj || typeof obj !== "object") return obj;
  if (path.length === 0) return undefined;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    const next = { ...obj };
    delete next[head];
    return Object.keys(next).length ? next : undefined;
  }
  const child = unsetDeep(obj[head], rest);
  const next = { ...obj };
  if (child === undefined) delete next[head];
  else next[head] = child;
  return Object.keys(next).length ? next : undefined;
};

export const UiLabelsProvider = ({ children }: { children: ReactNode }) => {
  const [overrides, setOverrides] = useState<DeepPartial<UiLabels>>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as DeepPartial<UiLabels>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      if (overrides && Object.keys(overrides).length > 0) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [overrides]);

  const labels = useMemo<UiLabels>(() => deepMerge(cloneDefaults(), overrides), [overrides]);

  const setLabel = useCallback((path: (string | number)[], value: string | boolean) => {
    setOverrides((prev) => setDeep(prev ?? {}, path, value));
  }, []);

  const resetPath = useCallback((path: (string | number)[]) => {
    setOverrides((prev) => (unsetDeep(prev ?? {}, path) ?? {}) as DeepPartial<UiLabels>);
  }, []);

  const resetAll = useCallback(() => setOverrides({}), []);

  const value = useMemo<UiLabelsContextValue>(
    () => ({
      labels,
      setLabel,
      resetPath,
      resetAll,
      hasOverrides: !!overrides && Object.keys(overrides).length > 0,
    }),
    [labels, setLabel, resetPath, resetAll, overrides],
  );

  return <UiLabelsContext.Provider value={value}>{children}</UiLabelsContext.Provider>;
};

export const useUiLabels = (): UiLabelsContextValue => {
  const ctx = useContext(UiLabelsContext);
  if (!ctx) {
    // Safe fallback so components don't crash if provider is missing.
    return {
      labels: defaultUiLabels,
      setLabel: () => {},
      resetPath: () => {},
      resetAll: () => {},
      hasOverrides: false,
    };
  }
  return ctx;
};

/** Convenience hook returning only the labels object. */
export const useLabels = (): UiLabels => useUiLabels().labels;
