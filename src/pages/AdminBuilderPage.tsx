/**
 * AdminBuilderPage — Full-screen Athlete Profile page builder.
 * Route: /admin/builder  (rendered outside AppLayout)
 *
 * Layout: TopBar (56px) + [Canvas (flex-1) | Sidebar (300px)]
 * RTL: sidebar is on the right (= start side in Hebrew), canvas on left (= end).
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Eye, EyeOff, GripVertical, Layers, Settings2,
  Shield, Plus, Save, Send, ChevronDown, Check, Pencil, Trash2,
  X, BookOpen, Hash, ClipboardList, LayoutTemplate, Users,
  Loader2, Zap, AlertTriangle, Activity, MessageCircle, TrendingUp,
  BarChart3, Sparkles,
} from "lucide-react";
import {
  useBuilder, ALL_ROLES, type BuilderSection, FIELD_TYPE_LABELS,
} from "@/context/BuilderContext";
import { roleLabels, type UserRole } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FieldEditorModal } from "@/components/builder/FieldEditorModal";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarTab = "blocks" | "fields" | "permissions" | "preview";
type PreviewRole = UserRole | "none";

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
  "sys-hero":     Users,
  "sys-math":     Hash,
  "sys-subjects": BookOpen,
  "sys-roadmap":  ClipboardList,
};

const ROLE_EMOJI: Record<UserRole, string> = {
  admin:   "⚙️",
  teacher: "📚",
  parent:  "👨‍👩‍👦",
  coach:   "🏃",
  student: "🎓",
};

// ─── Section mini-previews ────────────────────────────────────────────────────

const SectionPreview = ({ id }: { id: string }) => {
  if (id === "sys-hero") return (
    <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/40 pointer-events-none select-none">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">שמ</div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="h-3 bg-foreground/15 rounded-full w-32" />
          <div className="flex gap-2">
            <div className="h-2 bg-success/30 rounded-full w-14" />
            <div className="h-2 bg-muted-foreground/20 rounded-full w-16" />
            <div className="h-2 bg-muted-foreground/20 rounded-full w-12" />
          </div>
        </div>
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-[13px] font-bold text-primary/60">85</span>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {["נוכחות", "תגבור", "פניות", "מגמה"].map(l => (
          <div key={l} className="h-9 rounded-lg bg-card border border-border/50 flex items-center justify-center">
            <span className="text-[9px] text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (id === "sys-math") return (
    <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/40 pointer-events-none select-none">
      <p className="text-[10px] text-muted-foreground mb-2">בחירת רמת מתמטיקה</p>
      <div className="flex gap-1.5">
        {["3 יח״ל", "4 יח״ל", "5 יח״ל"].map((l, i) => (
          <div key={l} className={`flex-1 h-8 rounded-lg border text-[10px] flex items-center justify-center font-medium ${i === 1 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>{l}</div>
        ))}
      </div>
    </div>
  );

  if (id === "sys-subjects") return (
    <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/40 pointer-events-none select-none">
      <div className="flex gap-1.5 flex-wrap mb-2">
        {["מתמטיקה", "אנגלית", "ספרות", "היסטוריה"].map((s, i) => (
          <div key={s} className={`h-7 px-2.5 rounded-lg border text-[9.5px] flex items-center font-medium ${i === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>{s}</div>
        ))}
      </div>
      <div className="h-px bg-border/50 mb-2" />
      <div className="grid grid-cols-3 gap-1.5">
        {["אבחון", "התאמות", "ציון ספר"].map(l => (
          <div key={l} className="h-7 rounded-lg bg-card border border-border/50 flex items-center px-2">
            <span className="text-[9px] text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (id === "sys-roadmap") return (
    <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border/40 pointer-events-none select-none space-y-2">
      {[["מתמטיקה", 80, "success"], ["אנגלית", 62, "warning"], ["ספרות", 35, "destructive"]].map(([name, pct, color]) => (
        <div key={String(name)} className="flex items-center gap-2">
          <span className="text-[10px] text-foreground w-16 shrink-0">{name}</span>
          <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
            <div className={`h-full rounded-full bg-${color}/60 transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground w-7 text-end">{pct}%</span>
        </div>
      ))}
    </div>
  );

  return null;
};

// ─── CanvasBlock ──────────────────────────────────────────────────────────────

interface CanvasBlockProps {
  section: BuilderSection;
  previewMode: boolean;
  previewRole: PreviewRole;
  onToggleVisible: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddField: () => void;
  onSetRoles: (roles: UserRole[]) => void;
}

const CanvasBlock = ({
  section, previewMode, onToggleVisible, onRename, onDelete, onAddField, onSetRoles,
}: CanvasBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : 1 };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.title);
  const [rolesOpen, setRolesOpen] = useState(false);
  const Icon = (SECTION_ICONS[section.id] || Layers) as React.ElementType;
  const isHidden = !section.visible;

  const commitRename = () => {
    onRename(draft.trim() || section.title);
    setEditing(false);
  };

  const toggleRole = (role: UserRole) => {
    const next = section.visibleRoles.includes(role)
      ? section.visibleRoles.filter(r => r !== role)
      : [...section.visibleRoles, role];
    onSetRoles(next);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border bg-card transition-all duration-200 ${
        isDragging
          ? "shadow-2xl scale-[1.01] border-primary/50 ring-2 ring-primary/20"
          : isHidden
            ? "border-border/40 opacity-60"
            : "border-border hover:border-primary/30 hover:shadow-[0_4px_24px_-4px_hsla(231,55%,30%,0.12)]"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle — hidden in preview */}
        {!previewMode && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground touch-none flex-shrink-0 transition-colors"
            title="גרור לסידור מחדש"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Block icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          isHidden ? "bg-accent/40" : "bg-primary/10"
        }`}>
          <Icon
            className={`h-4 w-4 ${isHidden ? "text-muted-foreground/40" : "text-primary"}`}
            strokeWidth={1.5}
          />
        </div>

        {/* Title area */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setDraft(section.title); setEditing(false); }
              }}
              className="h-7 text-[13px] font-medium max-w-[200px]"
            />
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[13px] font-semibold ${isHidden ? "text-muted-foreground/50 line-through" : "text-foreground"}`}>
                {section.title}
              </span>
              {section.system && (
                <span className="text-[9.5px] bg-accent/80 text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                  מערכת
                </span>
              )}
              {isHidden && (
                <span className="text-[9.5px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <EyeOff className="h-2.5 w-2.5" />
                  מוסתר
                </span>
              )}
            </div>
          )}
          {!previewMode && section.fields.length > 0 && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              {section.fields.length} שד{section.fields.length === 1 ? "ה" : "ות"} מותאמ{section.fields.length === 1 ? "?" : "ות"}
            </p>
          )}
        </div>

        {/* Control buttons — appear on hover */}
        {!previewMode && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
            <button
              onClick={() => { setDraft(section.title); setEditing(true); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="שנה שם"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onToggleVisible}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-accent ${
                isHidden ? "text-warning hover:text-warning" : "text-muted-foreground hover:text-foreground"
              }`}
              title={isHidden ? "הצג בלוק" : "הסתר בלוק"}
            >
              {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onAddField}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="הוסף שדה מותאם"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {!section.system && (
              <button
                onClick={() => {
                  if (confirm(`למחוק את הבלוק "${section.title}"?`)) onDelete();
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="מחק בלוק"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mini preview (system sections only) */}
      {!previewMode && <div className="px-4 pb-1"><SectionPreview id={section.id} /></div>}

      {/* Custom fields preview */}
      {!previewMode && section.fields.length > 0 && (
        <div className="px-4 pb-3 mt-2">
          <div className="flex flex-wrap gap-1.5">
            {section.fields.slice(0, 4).map(f => (
              <span key={f.id} className="text-[10px] bg-primary/8 text-primary/70 border border-primary/15 px-2 py-0.5 rounded-full">
                {f.label}
              </span>
            ))}
            {section.fields.length > 4 && (
              <span className="text-[10px] text-muted-foreground/50 px-1 py-0.5">
                +{section.fields.length - 4} נוספים
              </span>
            )}
          </div>
        </div>
      )}

      {/* Role visibility footer */}
      {!previewMode && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setRolesOpen(v => !v)}
            className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            <span>
              {section.visibleRoles.length === ALL_ROLES.length
                ? "כל התפקידים"
                : section.visibleRoles.map(r => roleLabels[r]).join(" · ")}
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${rolesOpen ? "rotate-180" : ""}`} />
          </button>
          {rolesOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_ROLES.map(role => {
                const active = section.visibleRoles.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                      active
                        ? "bg-primary/10 text-primary border-primary/25"
                        : "bg-card text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    <span>{ROLE_EMOJI[role]}</span>
                    {roleLabels[role]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sidebar Tabs ─────────────────────────────────────────────────────────────

const BlocksTab = ({
  b,
  onAddField,
}: {
  b: ReturnType<typeof useBuilder>;
  onAddField: (sectionId: string) => void;
}) => (
  <div className="space-y-1" dir="rtl">
    <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 px-1">
      בלוקים בעמוד
    </p>
    {b.layout.sections.map(s => {
      const Icon = (SECTION_ICONS[s.id] || Layers) as React.ElementType;
      return (
        <div
          key={s.id}
          className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
            s.visible ? "hover:bg-accent/50" : "opacity-50 hover:bg-accent/30"
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.visible ? "bg-primary/10" : "bg-accent"}`}>
            <Icon className={`h-3.5 w-3.5 ${s.visible ? "text-primary" : "text-muted-foreground/50"}`} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-[12.5px] font-medium block truncate ${s.visible ? "text-foreground" : "text-muted-foreground line-through"}`}>
              {s.title}
            </span>
            {s.fields.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60">{s.fields.length} שדות</span>
            )}
          </div>
          <button
            onClick={() => onAddField(s.id)}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all"
            title="הוסף שדה"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => b.toggleSectionVisible(s.id)}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              s.visible ? "text-muted-foreground/40 hover:text-muted-foreground" : "text-warning hover:text-warning/80"
            }`}
            title={s.visible ? "הסתר" : "הצג"}
          >
            {s.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      );
    })}
  </div>
);

const FieldsTab = ({
  b,
  onFieldModal,
}: {
  b: ReturnType<typeof useBuilder>;
  onFieldModal: (sectionId: string, fieldId?: string) => void;
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState(b.layout.sections[0]?.id || "");
  const section = b.layout.sections.find(s => s.id === selectedSectionId);

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <label className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 block">
          בחר בלוק
        </label>
        <select
          value={selectedSectionId}
          onChange={e => setSelectedSectionId(e.target.value)}
          className="w-full text-[12.5px] border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          dir="rtl"
        >
          {b.layout.sections.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {section && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-foreground">
              שדות ב"{section.title}"
            </span>
            <button
              onClick={() => onFieldModal(section.id)}
              className="flex items-center gap-1 text-[11.5px] text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              הוסף שדה
            </button>
          </div>

          {section.fields.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center border-2 border-dashed border-border rounded-xl">
              <Settings2 className="h-7 w-7 text-muted-foreground/25 mb-2" strokeWidth={1} />
              <p className="text-[12px] text-muted-foreground">אין שדות מותאמים</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">לחץ "הוסף שדה" ליצירת שדה חדש</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {section.fields.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                    <Settings2 className="h-3.5 w-3.5 text-primary/60" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground truncate">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground/70">{FIELD_TYPE_LABELS[f.type]}</p>
                  </div>
                  <button
                    onClick={() => onFieldModal(section.id, f.id)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
                    title="ערוך שדה"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`למחוק שדה "${f.label}"?`)) b.removeField(section.id, f.id);
                    }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="מחק שדה"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All sections summary */}
      {b.layout.sections.some(s => s.fields.length > 0) && (
        <div className="pt-3 border-t border-border">
          <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
            כל השדות
          </p>
          {b.layout.sections.filter(s => s.fields.length > 0).map(s => (
            <div key={s.id} className="mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{s.title}</p>
              {s.fields.map(f => (
                <div key={f.id} className="flex items-center gap-2 py-1 px-2 text-[11.5px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <span className="text-foreground">{f.label}</span>
                  <span className="text-muted-foreground/50 text-[10px]">({FIELD_TYPE_LABELS[f.type]})</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PermissionsTab = ({ b }: { b: ReturnType<typeof useBuilder> }) => (
  <div className="space-y-4" dir="rtl">
    <div>
      <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
        מטריצת הרשאות
      </p>
      <p className="text-[11.5px] text-muted-foreground">
        לחץ על תא כדי להחליף הרשאת גישה לבלוק עבור כל תפקיד
      </p>
    </div>

    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-accent/50">
            <th className="text-start text-muted-foreground font-semibold py-2.5 px-3 text-[10.5px]">בלוק</th>
            {ALL_ROLES.map(r => (
              <th key={r} className="text-center text-muted-foreground font-semibold py-2.5 px-1.5 text-[9.5px] whitespace-nowrap">
                <span title={roleLabels[r]}>{ROLE_EMOJI[r]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {b.layout.sections.map((section, i) => (
            <tr key={section.id} className={i % 2 === 0 ? "" : "bg-accent/20"}>
              <td className="py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11.5px] font-medium truncate max-w-[80px] ${section.visible ? "text-foreground" : "text-muted-foreground line-through"}`}>
                    {section.title}
                  </span>
                  {!section.visible && (
                    <EyeOff className="h-3 w-3 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
                  )}
                </div>
              </td>
              {ALL_ROLES.map(role => {
                const hasAccess = section.visibleRoles.includes(role);
                return (
                  <td key={role} className="py-2 px-1.5 text-center">
                    <button
                      onClick={() => {
                        const next = hasAccess
                          ? section.visibleRoles.filter(r => r !== role)
                          : [...section.visibleRoles, role];
                        b.setSectionRoleVisibility(section.id, next);
                      }}
                      className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center transition-all duration-150 ${
                        hasAccess
                          ? "bg-success/15 text-success hover:bg-success/25"
                          : "bg-accent text-muted-foreground/25 hover:bg-accent/80"
                      }`}
                      title={`${roleLabels[role]}: ${hasAccess ? "נראה — לחץ להסתיר" : "מוסתר — לחץ להציג"}`}
                    >
                      {hasAccess
                        ? <Check className="h-3.5 w-3.5" />
                        : <X className="h-3 w-3" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="p-3 rounded-xl bg-accent/40 space-y-1.5">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-5 h-5 rounded-md bg-success/15 flex items-center justify-center">
          <Check className="h-3 w-3 text-success" />
        </span>
        <span className="text-muted-foreground">הבלוק נראה לתפקיד זה</span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
          <X className="h-2.5 w-2.5 text-muted-foreground/30" />
        </span>
        <span className="text-muted-foreground">הבלוק מוסתר מתפקיד זה</span>
      </div>
    </div>
  </div>
);

const PreviewTab = ({
  previewRole,
  onSetPreviewRole,
  visibleCount,
  totalCount,
}: {
  previewRole: PreviewRole;
  onSetPreviewRole: (role: PreviewRole) => void;
  visibleCount: number;
  totalCount: number;
}) => (
  <div className="space-y-3" dir="rtl">
    <div>
      <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
        תצוגה מקדימה
      </p>
      <p className="text-[11.5px] text-muted-foreground">
        בחר תפקיד לסימולציה — ה-canvas יציג רק בלוקים גלויים לתפקיד זה
      </p>
    </div>

    <div className="space-y-1.5">
      {/* Editor mode */}
      <button
        onClick={() => onSetPreviewRole("none")}
        className={`w-full text-start p-3 rounded-xl border transition-all ${
          previewRole === "none"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border hover:bg-accent/50"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${previewRole === "none" ? "bg-primary/15" : "bg-accent"}`}>
            <LayoutTemplate className={`h-4 w-4 ${previewRole === "none" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
          </div>
          <div>
            <p className={`text-[12.5px] font-semibold ${previewRole === "none" ? "text-primary" : "text-foreground"}`}>
              מצב עריכה
            </p>
            <p className="text-[11px] text-muted-foreground">כל הבלוקים נראים</p>
          </div>
          {previewRole === "none" && <Check className="h-4 w-4 text-primary ms-auto" />}
        </div>
      </button>

      {/* Role buttons */}
      {ALL_ROLES.map(role => {
        const isActive = previewRole === role;
        return (
          <button
            key={role}
            onClick={() => onSetPreviewRole(role)}
            className={`w-full text-start p-3 rounded-xl border transition-all ${
              isActive
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:bg-accent/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${isActive ? "bg-primary/15" : "bg-accent"}`}>
                {ROLE_EMOJI[role]}
              </div>
              <div>
                <p className={`text-[12.5px] font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                  {roleLabels[role]}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isActive ? `${visibleCount} מתוך ${totalCount} בלוקים` : "לחץ לצפות כ..."}
                </p>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary ms-auto" />}
            </div>
          </button>
        );
      })}
    </div>

    {previewRole !== "none" && (
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-[11.5px] text-primary">
        <Sparkles className="h-3.5 w-3.5 inline ms-1" strokeWidth={1.5} />
        מציג {visibleCount} בלוקים מתוך {totalCount} עבור תפקיד "{roleLabels[previewRole as UserRole]}"
      </div>
    )}
  </div>
);

// ─── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  onBack: () => void;
  isPublished: boolean;
  saving: boolean;
  publishing: boolean;
  previewRole: PreviewRole;
  onPreviewRole: (role: PreviewRole) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

const TopBar = ({
  onBack, isPublished, saving, publishing, previewRole, onPreviewRole, onSaveDraft, onPublish,
}: TopBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="h-14 bg-[hsl(222,32%,9%)] border-b border-white/10 flex items-center gap-3 px-4 shrink-0 relative z-30"
      dir="rtl"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/55 hover:text-white text-[13px] font-medium transition-colors shrink-0"
      >
        <ArrowRight className="h-4 w-4" />
        <span className="hidden sm:inline">חזרה</span>
      </button>

      <div className="w-px h-5 bg-white/12 shrink-0" />

      {/* Page identity */}
      <div className="flex items-center gap-2 min-w-0">
        <LayoutTemplate className="h-4 w-4 text-white/40 shrink-0" strokeWidth={1.5} />
        <span className="text-[13px] font-semibold text-white/80 truncate">עמוד פרופיל ספורטאי</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
          isPublished
            ? "bg-[hsl(152,58%,36%)]/25 text-[hsl(152,70%,52%)]"
            : "bg-[hsl(36,92%,52%)]/20 text-[hsl(36,92%,62%)]"
        }`}>
          {isPublished ? "פורסם" : "טיוטה"}
        </span>
      </div>

      <div className="flex-1" />

      {/* Autosave indicator */}
      {saving && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/35 shrink-0">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">שומר...</span>
        </div>
      )}

      {/* Preview dropdown */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
            previewRole !== "none"
              ? "bg-primary/25 text-primary"
              : "bg-white/8 hover:bg-white/12 text-white/65"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {previewRole === "none" ? "תצוגה מקדימה" : `כ: ${roleLabels[previewRole as UserRole]}`}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-full mt-2 end-0 bg-popover border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[180px]">
              <button
                onClick={() => { onPreviewRole("none"); setMenuOpen(false); }}
                className={`w-full text-start px-3.5 py-2 text-[13px] hover:bg-accent flex items-center gap-2.5 ${previewRole === "none" ? "text-primary font-medium" : "text-foreground"}`}
              >
                <LayoutTemplate className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                מצב עריכה
                {previewRole === "none" && <Check className="h-3.5 w-3.5 ms-auto text-primary" />}
              </button>
              <div className="h-px bg-border mx-3 my-1" />
              {ALL_ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => { onPreviewRole(role); setMenuOpen(false); }}
                  className={`w-full text-start px-3.5 py-2 text-[13px] hover:bg-accent flex items-center gap-2.5 ${previewRole === role ? "text-primary font-medium" : "text-foreground"}`}
                >
                  <span className="text-base">{ROLE_EMOJI[role]}</span>
                  {roleLabels[role]}
                  {previewRole === role && <Check className="h-3.5 w-3.5 ms-auto text-primary" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="w-px h-5 bg-white/12 shrink-0" />

      {/* Save draft */}
      <button
        onClick={onSaveDraft}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/14 text-white/65 hover:text-white text-[12px] font-medium transition-colors shrink-0"
      >
        <Save className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">שמור</span>
      </button>

      {/* Publish */}
      <button
        onClick={onPublish}
        disabled={publishing}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-60 shrink-0 shadow-[0_2px_12px_-2px_hsla(231,75%,52%,0.4)]"
      >
        {publishing
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Send className="h-3.5 w-3.5" />}
        <span>פרסם</span>
      </button>
    </header>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminBuilderPage = () => {
  const navigate = useNavigate();
  const b = useBuilder();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("blocks");
  const [previewRole, setPreviewRole] = useState<PreviewRole>("none");
  const [isPublished, setIsPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fieldModal, setFieldModal] = useState<{ sectionId: string; fieldId?: string } | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSectionDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = b.layout.sections.map(s => s.id);
    b.reorderSections(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }, [b]);

  const handleSaveDraft = () => {
    toast.success("הטיוטה נשמרה", { description: "כל השינויים נשמרו בהצלחה" });
  };

  const handlePublish = async () => {
    setPublishing(true);
    await new Promise(r => setTimeout(r, 700));
    setIsPublished(true);
    setPublishing(false);
    toast.success("הפרופיל פורסם בהצלחה!", {
      description: "הפריסה החדשה זמינה עבור כל המשתמשים",
    });
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    b.addSection(newSectionTitle.trim());
    setNewSectionTitle("");
    setAddingSection(false);
    toast.success(`בלוק "${newSectionTitle.trim()}" נוצר`);
  };

  const displayedSections = previewRole === "none"
    ? b.layout.sections
    : b.layout.sections.filter(s => s.visible && s.visibleRoles.includes(previewRole as UserRole));

  const visibleCountForRole = previewRole !== "none"
    ? b.layout.sections.filter(s => s.visible && s.visibleRoles.includes(previewRole as UserRole)).length
    : b.layout.sections.length;

  const SIDEBAR_TABS = [
    { id: "blocks" as SidebarTab, label: "בלוקים", icon: Layers },
    { id: "fields" as SidebarTab, label: "שדות", icon: Settings2 },
    { id: "permissions" as SidebarTab, label: "הרשאות", icon: Shield },
    { id: "preview" as SidebarTab, label: "תצוגה", icon: Eye },
  ];

  return (
    <div className="h-screen flex flex-col bg-[hsl(222,30%,10%)] overflow-hidden" dir="rtl">
      {/* TOP BAR */}
      <TopBar
        onBack={() => navigate(-1)}
        isPublished={isPublished}
        saving={b.saving}
        publishing={publishing}
        previewRole={previewRole}
        onPreviewRole={setPreviewRole}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── CANVAS ── */}
        <main className="flex-1 bg-[hsl(220,18%,15%)] overflow-y-auto">
          <div className="max-w-[820px] mx-auto p-5 md:p-8 space-y-3">

            {/* Canvas header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-[15px] font-bold text-white/85">
                  {previewRole === "none" ? "בלוקים בעמוד" : `תצוגה מקדימה — ${roleLabels[previewRole as UserRole]}`}
                </h2>
                <p className="text-[11.5px] text-white/35 mt-0.5">
                  {previewRole === "none"
                    ? `${b.layout.sections.length} בלוקים · גרור לסידור מחדש`
                    : `${visibleCountForRole} מתוך ${b.layout.sections.length} בלוקים גלויים`}
                </p>
              </div>
              {previewRole !== "none" && (
                <button
                  onClick={() => setPreviewRole("none")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 text-primary text-[12px] font-medium hover:bg-primary/30 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  סיים תצוגה מקדימה
                </button>
              )}
            </div>

            {/* Sortable blocks */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={b.layout.sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {displayedSections.map(section => (
                    <CanvasBlock
                      key={section.id}
                      section={section}
                      previewMode={previewRole !== "none"}
                      previewRole={previewRole}
                      onToggleVisible={() => b.toggleSectionVisible(section.id)}
                      onRename={title => b.renameSection(section.id, title)}
                      onDelete={() => b.removeSection(section.id)}
                      onAddField={() => { setFieldModal({ sectionId: section.id }); setSidebarTab("fields"); }}
                      onSetRoles={roles => b.setSectionRoleVisibility(section.id, roles)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add block */}
            {previewRole === "none" && (
              <div className="pt-1">
                {addingSection ? (
                  <div className="flex gap-2 p-1">
                    <Input
                      autoFocus
                      value={newSectionTitle}
                      onChange={e => setNewSectionTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleAddSection();
                        if (e.key === "Escape") { setAddingSection(false); setNewSectionTitle(""); }
                      }}
                      placeholder="שם הבלוק החדש..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary/50 rounded-xl"
                    />
                    <button
                      onClick={handleAddSection}
                      disabled={!newSectionTitle.trim()}
                      className="px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-medium disabled:opacity-50 transition-opacity"
                    >
                      הוסף
                    </button>
                    <button
                      onClick={() => { setAddingSection(false); setNewSectionTitle(""); }}
                      className="px-3 py-2 rounded-xl bg-white/10 text-white/60 text-[13px] hover:bg-white/15 transition-colors"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSection(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-white/15 text-white/35 text-[13px] hover:border-white/30 hover:text-white/55 hover:bg-white/3 transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    הוסף בלוק חדש
                  </button>
                )}
              </div>
            )}

            {/* Danger zone */}
            {previewRole === "none" && (
              <div className="pt-4 border-t border-white/8">
                <button
                  onClick={() => {
                    if (confirm("לאפס את כל הפריסה לברירת מחדל? פעולה זו אינה ניתנת לביטול.")) {
                      b.resetLayout();
                      toast.success("הפריסה אופסה לברירת מחדל");
                    }
                  }}
                  className="flex items-center gap-2 text-[12px] text-white/25 hover:text-red-400 transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  איפוס פריסה לברירת מחדל
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── SIDEBAR ── */}
        <aside
          className="w-[300px] bg-background border-s border-border flex flex-col shrink-0 overflow-hidden"
          dir="rtl"
        >
          {/* Tabs */}
          <div className="border-b border-border shrink-0 bg-background">
            <div className="flex">
              {SIDEBAR_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-[9.5px] font-semibold uppercase tracking-wide transition-colors relative ${
                    sidebarTab === tab.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-[15px] w-[15px]" strokeWidth={sidebarTab === tab.id ? 2 : 1.5} />
                  <span>{tab.label}</span>
                  {sidebarTab === tab.id && (
                    <span className="absolute bottom-0 inset-x-0 h-[2px] bg-primary rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === "blocks" && (
              <BlocksTab
                b={b}
                onAddField={sectionId => { setFieldModal({ sectionId }); setSidebarTab("fields"); }}
              />
            )}
            {sidebarTab === "fields" && (
              <FieldsTab
                b={b}
                onFieldModal={(sectionId, fieldId) => setFieldModal({ sectionId, fieldId })}
              />
            )}
            {sidebarTab === "permissions" && (
              <PermissionsTab b={b} />
            )}
            {sidebarTab === "preview" && (
              <PreviewTab
                previewRole={previewRole}
                onSetPreviewRole={setPreviewRole}
                visibleCount={visibleCountForRole}
                totalCount={b.layout.sections.length}
              />
            )}
          </div>

          {/* Sidebar footer — saving indicator */}
          <div className="border-t border-border px-4 py-3 shrink-0 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/50">
              {b.layout.sections.length} בלוקים ·{" "}
              {b.layout.sections.reduce((a, s) => a + s.fields.length, 0)} שדות
            </span>
            {b.saving && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                <Loader2 className="h-3 w-3 animate-spin" />
                שומר
              </span>
            )}
          </div>
        </aside>
      </div>

      {/* Field editor modal */}
      {fieldModal && (
        <FieldEditorModal
          open
          onClose={() => setFieldModal(null)}
          sectionId={fieldModal.sectionId}
          field={
            fieldModal.fieldId
              ? b.layout.sections
                  .find(s => s.id === fieldModal.sectionId)
                  ?.fields.find(f => f.id === fieldModal.fieldId)
              : undefined
          }
        />
      )}
    </div>
  );
};

export default AdminBuilderPage;
