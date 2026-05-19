/**
 * BuilderOverridesContext — Phase 1 of the Visual Admin Builder.
 *
 * Stores per-element overrides keyed by stable element id. Persisted to
 * localStorage; the same JSON shape will later move to a Supabase
 * `builder_overrides` table (Phase 4) without breaking consumers.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserRole } from "@/context/AuthContext";

export type StylePreset = "default" | "clean" | "bordered" | "elevated" | "highlighted";
export type LayoutWidth = "full" | "half" | "third";
export type LayoutDensity = "compact" | "regular" | "expanded";

export interface ElementOverride {
  label?: string;
  subtitle?: string;
  helper?: string;
  visible?: boolean;
  stylePreset?: StylePreset;
  layoutWidth?: LayoutWidth;
  density?: LayoutDensity;
  order?: number;
  roleVisibility?: UserRole[];
  iconName?: string;
}

export type OverridesMap = Record<string, ElementOverride>;

const STORAGE_KEY = "wingate_builder_overrides_v1";

interface Ctx {
  overrides: OverridesMap;
  getOverride: (id: string) => ElementOverride | undefined;
  setOverride: (id: string, patch: Partial<ElementOverride>) => void;
  resetOverride: (id: string) => void;
  resetAll: () => void;
}

const BuilderOverridesContext = createContext<Ctx | null>(null);

export const BuilderOverridesProvider = ({ children }: { children: ReactNode }) => {
  const [overrides, setOverrides] = useState<OverridesMap>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as OverridesMap) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try {
      if (Object.keys(overrides).length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, [overrides]);

  const getOverride = useCallback((id: string) => overrides[id], [overrides]);

  const setOverride = useCallback((id: string, patch: Partial<ElementOverride>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const resetOverride = useCallback((id: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setOverrides({}), []);

  const value = useMemo<Ctx>(() => ({ overrides, getOverride, setOverride, resetOverride, resetAll }),
    [overrides, getOverride, setOverride, resetOverride, resetAll]);

  return <BuilderOverridesContext.Provider value={value}>{children}</BuilderOverridesContext.Provider>;
};

export const useBuilderOverrides = (): Ctx => {
  const ctx = useContext(BuilderOverridesContext);
  if (!ctx) return {
    overrides: {}, getOverride: () => undefined, setOverride: () => {}, resetOverride: () => {}, resetAll: () => {},
  };
  return ctx;
};

export const STYLE_PRESET_CLASS: Record<StylePreset, string> = {
  default: "",
  clean: "bg-card",
  bordered: "border border-border rounded-xl",
  elevated: "bg-card shadow-md rounded-xl",
  highlighted: "bg-primary/5 border border-primary/20 rounded-xl",
};
