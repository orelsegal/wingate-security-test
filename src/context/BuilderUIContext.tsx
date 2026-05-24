/**
 * BuilderUIContext — ephemeral UI state for the Visual Admin Builder.
 * Holds edit-mode toggle, current selection, preview-as-role, and the
 * in-memory element registry used to build the structure tree.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { UserRole } from "@/context/AuthContext";

export type ElementType =
  | "title"
  | "section"
  | "card"
  | "nav-item"
  | "button"
  | "badge"
  | "field"
  | "page-title"
  | "heading"
  | "stat"
  | "list"
  | "text";

export const ELEMENT_TYPE_LABEL: Record<ElementType, string> = {
  title: "כותרת",
  section: "סקציה",
  card: "כרטיס",
  "nav-item": "פריט תפריט",
  button: "כפתור",
  badge: "תגית",
  field: "שדה",
  "page-title": "כותרת עמוד",
  heading: "כותרת משנה",
  stat: "נתון",
  list: "רשימה",
  text: "טקסט",
};

export interface RegistryEntry {
  id: string;
  type: ElementType;
  pageKey: string;
  defaultLabel: string;
}

interface Ctx {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  selectedId: string | null;
  select: (id: string | null) => void;
  previewRole: UserRole | null;
  setPreviewRole: (r: UserRole | null) => void;
  structureOpen: boolean;
  setStructureOpen: (v: boolean) => void;
  registry: RegistryEntry[];
  register: (e: RegistryEntry) => void;
  unregister: (id: string) => void;
}

const BuilderUIContext = createContext<Ctx | null>(null);

export const BuilderUIProvider = ({ children }: { children: ReactNode }) => {
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const [registryVersion, bump] = useState(0);
  const registryRef = useRef<Map<string, RegistryEntry>>(new Map());

  const register = useCallback((e: RegistryEntry) => {
    const prev = registryRef.current.get(e.id);
    if (prev && prev.type === e.type && prev.defaultLabel === e.defaultLabel && prev.pageKey === e.pageKey) return;
    registryRef.current.set(e.id, e);
    bump((n) => n + 1);
  }, []);
  const unregister = useCallback((id: string) => {
    if (registryRef.current.delete(id)) bump((n) => n + 1);
  }, []);

  const registry = useMemo(() => Array.from(registryRef.current.values()), [registryVersion]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setEditMode(true);
  }, []);

  const value = useMemo<Ctx>(() => ({
    editMode, setEditMode, selectedId, select, previewRole, setPreviewRole,
    structureOpen, setStructureOpen, registry, register, unregister,
  }), [editMode, selectedId, previewRole, structureOpen, registry, select, register, unregister]);

  return <BuilderUIContext.Provider value={value}>{children}</BuilderUIContext.Provider>;
};

export const useBuilderUI = (): Ctx => {
  const ctx = useContext(BuilderUIContext);
  if (!ctx) return {
    editMode: false, setEditMode: () => {}, selectedId: null, select: () => {},
    previewRole: null, setPreviewRole: () => {}, structureOpen: false, setStructureOpen: () => {},
    registry: [], register: () => {}, unregister: () => {},
  };
  return ctx;
};
