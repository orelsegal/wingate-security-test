import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserRole } from "./AuthContext";

/**
 * Admin Builder — Phase 3
 *
 * Layout is stored in `builder_layouts.layout` as
 *   { published: BuilderLayout, draft: BuilderLayout | null }
 * (legacy rows of shape { sections: [...] } are auto-migrated as published).
 *
 * Behaviour:
 * - When `inBuilder === true` (i.e. admin opened the Builder workspace), all
 *   mutations are applied to a draft layout. Profile rendering inside the
 *   Builder uses the draft, so admins see their unpublished changes live.
 * - Outside the Builder workspace, the rest of the app keeps reading the
 *   published layout only, so teachers / coaches / parents / students never
 *   see in-progress work.
 * - `publish()` promotes the draft to published; `discardDraft()` throws it away.
 */

export type FieldType =
  | "text" | "textarea" | "number" | "date" | "dropdown" | "multi-select"
  | "checkbox" | "status" | "file" | "user-relation" | "subject-relation" | "sport-relation";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "טקסט קצר",
  textarea: "טקסט ארוך",
  number: "מספר",
  date: "תאריך",
  dropdown: "רשימה נפתחת",
  "multi-select": "בחירה מרובה",
  checkbox: "תיבת סימון",
  status: "סטטוס (ירוק/צהוב/אדום)",
  file: "קובץ",
  "user-relation": "קישור למשתמש",
  "subject-relation": "קישור למקצוע",
  "sport-relation": "קישור לענף",
};

export const ALL_ROLES: UserRole[] = ["admin", "teacher", "parent", "coach", "student"];

export interface BuilderField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: string[];
  visibleRoles: UserRole[];
  editRoles: UserRole[];
}

export interface BuilderTab { id: string; title: string; }

export interface BuilderSection {
  id: string;
  title: string;
  visible: boolean;
  system?: boolean;
  fields: BuilderField[];
  tabs?: BuilderTab[];
  visibleRoles: UserRole[];
}

export interface BuilderLayout {
  sections: BuilderSection[];
}

const DEFAULT_SYSTEM_SECTIONS: BuilderSection[] = [
  { id: "sys-hero",     title: "כרטיס ספורטאי",    visible: true, system: true, fields: [], visibleRoles: [...ALL_ROLES] },
  { id: "sys-math",     title: "רמת מתמטיקה",      visible: true, system: true, fields: [], visibleRoles: [...ALL_ROLES] },
  { id: "sys-subjects", title: "פירוט מקצועות",    visible: true, system: true, fields: [], visibleRoles: [...ALL_ROLES] },
  { id: "sys-roadmap",  title: "מפת דרכים",        visible: true, system: true, fields: [], visibleRoles: [...ALL_ROLES] },
];

const PAGE_KEY = "student-profile";
const uid = () => Math.random().toString(36).slice(2, 10);

const cloneLayout = (l: BuilderLayout): BuilderLayout => JSON.parse(JSON.stringify(l));

const ensureSystemSections = (l: BuilderLayout): BuilderLayout => {
  const sysIds = new Set(DEFAULT_SYSTEM_SECTIONS.map((s) => s.id));
  const storedSys = new Set(l.sections.filter((s) => s.system).map((s) => s.id));
  const missing = DEFAULT_SYSTEM_SECTIONS.filter((s) => !storedSys.has(s.id));
  return { sections: [...l.sections.filter((s) => !s.system || sysIds.has(s.id)), ...missing] };
};

interface Ctx {
  /** Resolved layout to render (draft when inBuilder, published otherwise) */
  layout: BuilderLayout;
  publishedLayout: BuilderLayout;
  draftLayout: BuilderLayout | null;
  isDirty: boolean;

  // Builder workspace state
  inBuilder: boolean;
  enterBuilder: () => void;
  exitBuilder: () => void;
  previewRole: UserRole | null;
  setPreviewRole: (r: UserRole | null) => void;

  // draft lifecycle
  publish: () => Promise<void>;
  discardDraft: () => Promise<void>;
  saveDraft: () => Promise<void>;

  loading: boolean;
  saving: boolean;

  // values (custom field values per student)
  values: Record<string, any>;
  setValue: (studentId: string, fieldKey: string, value: any) => Promise<void>;
  loadValues: (studentId: string) => Promise<void>;

  // section ops
  addSection: (title: string) => void;
  renameSection: (id: string, title: string) => void;
  toggleSectionVisible: (id: string) => void;
  setSectionRoleVisibility: (id: string, roles: UserRole[]) => void;
  removeSection: (id: string) => void;
  reorderSections: (orderedIds: string[]) => void;

  // field ops
  addField: (sectionId: string, field: Omit<BuilderField, "id">) => void;
  updateField: (sectionId: string, fieldId: string, patch: Partial<BuilderField>) => void;
  removeField: (sectionId: string, fieldId: string) => void;
  reorderFields: (sectionId: string, orderedIds: string[]) => void;

  // tab ops
  addTab: (sectionId: string, title: string) => void;
  removeTab: (sectionId: string, tabId: string) => void;
  reorderTabs: (sectionId: string, orderedIds: string[]) => void;

  resetLayout: () => void;
}

const BuilderContext = createContext<Ctx | null>(null);
export const useBuilder = () => {
  const c = useContext(BuilderContext);
  if (!c) throw new Error("useBuilder must be used inside BuilderProvider");
  return c;
};

export const BuilderProvider = ({ children }: { children: ReactNode }) => {
  const [publishedLayout, setPublishedLayout] = useState<BuilderLayout>({ sections: DEFAULT_SYSTEM_SECTIONS });
  const [draftLayout, setDraftLayout] = useState<BuilderLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [inBuilder, setInBuilder] = useState(false);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  const inBuilderRef = useRef(inBuilder);
  inBuilderRef.current = inBuilder;

  // ---- load
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("builder_layouts" as any)
        .select("layout")
        .eq("page_key", PAGE_KEY)
        .maybeSingle();
      if (!error && data && (data as any).layout) {
        const raw = (data as any).layout;
        if (raw.published) {
          // new shape
          setPublishedLayout(ensureSystemSections(raw.published));
          setDraftLayout(raw.draft ? ensureSystemSections(raw.draft) : null);
        } else if (raw.sections) {
          // legacy shape
          setPublishedLayout(ensureSystemSections(raw));
        }
      }
      setLoading(false);
    })();
  }, []);

  const persistRaw = useCallback(async (pub: BuilderLayout, draft: BuilderLayout | null) => {
    setSaving(true);
    const { error } = await supabase
      .from("builder_layouts" as any)
      .upsert({ page_key: PAGE_KEY, layout: { published: pub, draft } as any }, { onConflict: "page_key" });
    setSaving(false);
    if (error) toast.error("שמירה נכשלה: " + error.message);
  }, []);

  const mutate = useCallback((updater: (l: BuilderLayout) => BuilderLayout) => {
    if (inBuilderRef.current) {
      setDraftLayout((prev) => {
        const base = prev ?? cloneLayout(publishedLayout);
        const next = updater(base);
        void persistRaw(publishedLayout, next);
        return next;
      });
    } else {
      setPublishedLayout((prev) => {
        const next = updater(prev);
        void persistRaw(next, draftLayout);
        return next;
      });
    }
  }, [publishedLayout, draftLayout, persistRaw]);

  // ---- draft lifecycle
  const publish = useCallback(async () => {
    if (!draftLayout) { toast("אין שינויים לפרסום"); return; }
    setPublishedLayout(draftLayout);
    setDraftLayout(null);
    await persistRaw(draftLayout, null);
    toast.success("הפריסה פורסמה");
  }, [draftLayout, persistRaw]);

  const discardDraft = useCallback(async () => {
    if (!draftLayout) return;
    setDraftLayout(null);
    await persistRaw(publishedLayout, null);
    toast.success("טיוטה נמחקה");
  }, [draftLayout, publishedLayout, persistRaw]);

  const saveDraft = useCallback(async () => {
    await persistRaw(publishedLayout, draftLayout);
    toast.success("טיוטה נשמרה");
  }, [publishedLayout, draftLayout, persistRaw]);

  // ---- builder mode
  const enterBuilder = useCallback(() => setInBuilder(true), []);
  const exitBuilder = useCallback(() => { setInBuilder(false); setPreviewRole(null); }, []);

  // ---- values
  const loadValues = useCallback(async (studentId: string) => {
    const { data, error } = await supabase
      .from("student_custom_values" as any)
      .select("field_key, value")
      .eq("student_id", studentId);
    if (error) return;
    const map: Record<string, any> = {};
    (data || []).forEach((r: any) => { map[r.field_key] = r.value; });
    setValues(map);
  }, []);

  const setValue = useCallback(async (studentId: string, fieldKey: string, value: any) => {
    setValues((v) => ({ ...v, [fieldKey]: value }));
    const { error } = await supabase
      .from("student_custom_values" as any)
      .upsert({ student_id: studentId, field_key: fieldKey, value }, { onConflict: "student_id,field_key" });
    if (error) toast.error("שמירה נכשלה: " + error.message);
    else toast.success("נשמר");
  }, []);

  // ---- ops
  const addSection = (title: string) => mutate((l) => ({
    sections: [...l.sections, { id: uid(), title, visible: true, fields: [], visibleRoles: [...ALL_ROLES] }],
  }));
  const renameSection = (id: string, title: string) => mutate((l) => ({
    sections: l.sections.map((s) => (s.id === id ? { ...s, title } : s)),
  }));
  const toggleSectionVisible = (id: string) => mutate((l) => ({
    sections: l.sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
  }));
  const setSectionRoleVisibility = (id: string, roles: UserRole[]) => mutate((l) => ({
    sections: l.sections.map((s) => (s.id === id ? { ...s, visibleRoles: roles } : s)),
  }));
  const removeSection = (id: string) => mutate((l) => ({
    sections: l.sections.filter((s) => s.id !== id || s.system),
  }));
  const reorderSections = (orderedIds: string[]) => mutate((l) => {
    const byId = new Map(l.sections.map((s) => [s.id, s] as const));
    return { sections: orderedIds.map((id) => byId.get(id)!).filter(Boolean) };
  });

  const addField = (sectionId: string, field: Omit<BuilderField, "id">) => mutate((l) => ({
    sections: l.sections.map((s) => s.id === sectionId
      ? { ...s, fields: [...s.fields, { ...field, id: uid() }] } : s),
  }));
  const updateField = (sectionId: string, fieldId: string, patch: Partial<BuilderField>) => mutate((l) => ({
    sections: l.sections.map((s) => s.id === sectionId
      ? { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) } : s),
  }));
  const removeField = (sectionId: string, fieldId: string) => mutate((l) => ({
    sections: l.sections.map((s) => s.id === sectionId
      ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s),
  }));
  const reorderFields = (sectionId: string, orderedIds: string[]) => mutate((l) => ({
    sections: l.sections.map((s) => {
      if (s.id !== sectionId) return s;
      const byId = new Map(s.fields.map((f) => [f.id, f] as const));
      return { ...s, fields: orderedIds.map((id) => byId.get(id)!).filter(Boolean) };
    }),
  }));

  const addTab = (sectionId: string, title: string) => mutate((l) => ({
    sections: l.sections.map((s) => s.id === sectionId
      ? { ...s, tabs: [...(s.tabs || []), { id: uid(), title }] } : s),
  }));
  const removeTab = (sectionId: string, tabId: string) => mutate((l) => ({
    sections: l.sections.map((s) => s.id === sectionId
      ? { ...s, tabs: (s.tabs || []).filter((t) => t.id !== tabId) } : s),
  }));
  const reorderTabs = (sectionId: string, orderedIds: string[]) => mutate((l) => ({
    sections: l.sections.map((s) => {
      if (s.id !== sectionId) return s;
      const byId = new Map((s.tabs || []).map((t) => [t.id, t] as const));
      return { ...s, tabs: orderedIds.map((id) => byId.get(id)!).filter(Boolean) };
    }),
  }));

  const resetLayout = () => mutate(() => ({ sections: DEFAULT_SYSTEM_SECTIONS }));

  const effectiveLayout = inBuilder && draftLayout ? draftLayout : publishedLayout;
  const isDirty = !!draftLayout;

  const value = useMemo<Ctx>(() => ({
    layout: effectiveLayout, publishedLayout, draftLayout, isDirty,
    inBuilder, enterBuilder, exitBuilder, previewRole, setPreviewRole,
    publish, discardDraft, saveDraft,
    loading, saving,
    values, setValue, loadValues,
    addSection, renameSection, toggleSectionVisible, setSectionRoleVisibility, removeSection, reorderSections,
    addField, updateField, removeField, reorderFields,
    addTab, removeTab, reorderTabs,
    resetLayout,
  }), [effectiveLayout, publishedLayout, draftLayout, isDirty, inBuilder, previewRole, loading, saving, values, enterBuilder, exitBuilder, publish, discardDraft, saveDraft, setValue, loadValues]);

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
};
