/**
 * AdminBuilderPage — Full-screen Athlete Profile page builder.
 * Route: /admin/builder  (rendered outside AppLayout)
 *
 * Wix-like features:
 *  - Drag blocks to reorder (DnD Kit)
 *  - Drag image files onto any block (drop zone + click-to-browse)
 *  - Expand block to see & drag-reorder custom fields
 *  - Widget template library to add preset sections
 *  - Permissions matrix, preview-as-role, save/publish
 */

import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Eye, EyeOff, GripVertical, Layers, Settings2,
  Shield, Plus, Save, Send, ChevronDown, Check, Pencil, Trash2,
  X, BookOpen, Hash, ClipboardList, LayoutTemplate, Users,
  Loader2, Zap, AlertTriangle, Image, Upload, Link2,
  ChevronRight, Sparkles, Activity, Heart, FileText,
  Dumbbell, Star, Clock, Phone,
} from "lucide-react";
import {
  useBuilder, ALL_ROLES, type BuilderSection, type BuilderField, FIELD_TYPE_LABELS,
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
type SidebarTab = "blocks" | "fields" | "widgets" | "permissions" | "preview";
type PreviewRole = UserRole | "none";

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ElementType> = {
  "sys-hero":     Users,
  "sys-math":     Hash,
  "sys-subjects": BookOpen,
  "sys-roadmap":  ClipboardList,
};

const ROLE_EMOJI: Record<UserRole, string> = {
  admin: "⚙️", teacher: "📚", parent: "👨‍👩‍👦", coach: "🏃", student: "🎓",
};

// ─── Preset Widget Templates ──────────────────────────────────────────────────
interface WidgetTemplate {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  fields: Array<{ label: string; type: string }>;
}

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    icon: Heart,
    title: "מידע רפואי",
    description: "בריאות, פציעות, הגבלות",
    color: "text-red-500 bg-red-50",
    fields: [
      { label: "פציעות / הגבלות", type: "textarea" },
      { label: "תרופות קבועות", type: "text" },
      { label: "איש קשר רפואי", type: "text" },
    ],
  },
  {
    icon: Dumbbell,
    title: "מעקב כושר",
    description: "ביצועים, מדדים, אימונים",
    color: "text-orange-500 bg-orange-50",
    fields: [
      { label: "משקל (ק\"ג)", type: "number" },
      { label: "גובה (ס\"מ)", type: "number" },
      { label: "אימונים בשבוע", type: "number" },
      { label: "הישג אחרון", type: "text" },
    ],
  },
  {
    icon: Star,
    title: "הישגים ופרסים",
    description: "תחרויות, מדליות, אירועים",
    color: "text-yellow-500 bg-yellow-50",
    fields: [
      { label: "הישגים בולטים", type: "textarea" },
      { label: "מדליות / תארים", type: "text" },
      { label: "שנת הצלחה עיקרית", type: "text" },
    ],
  },
  {
    icon: Clock,
    title: "ציר זמן",
    description: "עדכונים, אירועים, היסטוריה",
    color: "text-blue-500 bg-blue-50",
    fields: [
      { label: "עדכון אחרון", type: "textarea" },
      { label: "תאריך עדכון", type: "date" },
    ],
  },
  {
    icon: Phone,
    title: "פרטי קשר",
    description: "טלפון, אימייל, כתובת",
    color: "text-green-600 bg-green-50",
    fields: [
      { label: "טלפון", type: "text" },
      { label: "אימייל", type: "text" },
      { label: "כתובת", type: "text" },
      { label: "הורה / אפוטרופוס", type: "text" },
    ],
  },
  {
    icon: FileText,
    title: "הערות חופשיות",
    description: "מידע נוסף, הערות פנימיות",
    color: "text-purple-500 bg-purple-50",
    fields: [
      { label: "הערות פנימיות (אדמין בלבד)", type: "textarea" },
    ],
  },
  {
    icon: Activity,
    title: "נוכחות ומעקב",
    description: "נוכחות, חיסורים, פגישות",
    color: "text-teal-500 bg-teal-50",
    fields: [
      { label: "אחוז נוכחות", type: "number" },
      { label: "חיסורים מצטברים", type: "number" },
      { label: "פגישות מאמן", type: "number" },
    ],
  },
];

// ─── Section mini-previews ────────────────────────────────────────────────────
const SectionPreview = ({ id }: { id: string }) => {
  if (id === "sys-hero") return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border/40 pointer-events-none select-none">
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
    <div className="p-3 rounded-xl bg-muted/40 border border-border/40 pointer-events-none select-none">
      <p className="text-[10px] text-muted-foreground mb-2">בחירת רמת מתמטיקה</p>
      <div className="flex gap-1.5">
        {["3 יח״ל", "4 יח״ל", "5 יח״ל"].map((l, i) => (
          <div key={l} className={`flex-1 h-8 rounded-lg border text-[10px] flex items-center justify-center font-medium ${i === 1 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>{l}</div>
        ))}
      </div>
    </div>
  );
  if (id === "sys-subjects") return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border/40 pointer-events-none select-none">
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
    <div className="p-3 rounded-xl bg-muted/40 border border-border/40 pointer-events-none select-none space-y-2">
      {[["מתמטיקה", 80, "success"], ["אנגלית", 62, "warning"], ["ספרות", 35, "destructive"]].map(([name, pct, color]) => (
        <div key={String(name)} className="flex items-center gap-2">
          <span className="text-[10px] text-foreground w-16 shrink-0">{name}</span>
          <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
            <div className={`h-full rounded-full bg-${color}/60`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground w-7 text-end">{pct}%</span>
        </div>
      ))}
    </div>
  );
  return null;
};

// ─── Sortable field row (inside expanded block) ───────────────────────────────
const SortableFieldRow = ({
  field, onEdit, onDelete,
}: { field: BuilderField; onEdit: () => void; onDelete: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg border bg-card transition-all ${isDragging ? "shadow-lg border-primary/40 scale-[1.01]" : "border-border/60 hover:border-border"}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground touch-none">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-medium text-foreground">{field.label}</span>
        <span className="text-[10px] text-muted-foreground/60 ms-1.5">· {FIELD_TYPE_LABELS[field.type]}</span>
      </div>
      <button onClick={onEdit} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors">
        <Pencil className="h-3 w-3" />
      </button>
      <button onClick={onDelete} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
};

// ─── CanvasBlock ──────────────────────────────────────────────────────────────
interface CanvasBlockProps {
  section: BuilderSection;
  previewMode: boolean;
  onToggleVisible: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAddField: () => void;
  onEditField: (fieldId: string) => void;
  onSetRoles: (roles: UserRole[]) => void;
  onImageChange: (img: string | undefined) => void;
  onReorderFields: (orderedIds: string[]) => void;
  onDeleteField: (fieldId: string) => void;
}

const CanvasBlock = ({
  section, previewMode, onToggleVisible, onRename, onDelete, onAddField,
  onEditField, onSetRoles, onImageChange, onReorderFields, onDeleteField,
}: CanvasBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const blockStyle = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : 1 };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.title);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [imageMode, setImageMode] = useState<"none" | "url">("none");
  const [urlDraft, setUrlDraft] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fieldSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  // ── Image handling ──────────────────────────────────────────────────────────
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("רק קבצי תמונה נתמכים (JPG, PNG, WebP, SVG)");
      return;
    }
    if (file.size > 800_000) {
      toast.error("התמונה גדולה מדי — מקסימום 800KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      onImageChange(e.target?.result as string);
      toast.success("התמונה הועלתה בהצלחה");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragTarget(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ── Field drag-and-drop ─────────────────────────────────────────────────────
  const handleFieldDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = section.fields.map(f => f.id);
    onReorderFields(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <div
      ref={setNodeRef}
      style={blockStyle}
      className={`group relative rounded-2xl border bg-card transition-all duration-200 ${
        isDragging
          ? "shadow-2xl scale-[1.01] border-primary/50 ring-2 ring-primary/20"
          : isDragTarget
            ? "border-primary/60 ring-2 ring-primary/25 shadow-lg bg-primary/3"
            : isHidden
              ? "border-border/40 opacity-60"
              : "border-border hover:border-primary/30 hover:shadow-[0_4px_24px_-4px_hsla(112,55%,25%,0.12)]"
      }`}
      onDragOver={e => { e.preventDefault(); if (!isDragging) setIsDragTarget(true); }}
      onDragLeave={() => setIsDragTarget(false)}
      onDrop={handleDrop}
    >
      {/* Drop overlay hint */}
      {isDragTarget && (
        <div className="absolute inset-0 rounded-2xl bg-primary/5 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30">
            <Upload className="h-4 w-4 text-primary" />
            <span className="text-[13px] font-medium text-primary">שחרר כדי להוסיף תמונה</span>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        {!previewMode && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 touch-none shrink-0 transition-colors"
            title="גרור לסידור מחדש"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isHidden ? "bg-accent/40" : "bg-primary/10"}`}>
          <Icon className={`h-4 w-4 ${isHidden ? "text-muted-foreground/40" : "text-primary"}`} strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setDraft(section.title); setEditing(false); } }}
              className="h-7 text-[13px] font-medium max-w-[200px]"
            />
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[13px] font-semibold ${isHidden ? "text-muted-foreground/50 line-through" : "text-foreground"}`}>
                {section.title}
              </span>
              {section.system && <span className="text-[9.5px] bg-accent/80 text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">מערכת</span>}
              {isHidden && <span className="text-[9.5px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1"><EyeOff className="h-2.5 w-2.5" />מוסתר</span>}
            </div>
          )}
          {!previewMode && section.fields.length > 0 && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">{section.fields.length} שדות מותאמים</p>
          )}
        </div>

        {!previewMode && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => { setDraft(section.title); setEditing(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="שנה שם">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onToggleVisible} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-accent ${isHidden ? "text-warning" : "text-muted-foreground hover:text-foreground"}`} title={isHidden ? "הצג" : "הסתר"}>
              {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onAddField} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="הוסף שדה">
              <Plus className="h-3.5 w-3.5" />
            </button>
            {!section.system && (
              <button onClick={() => { if (confirm(`למחוק "${section.title}"?`)) onDelete(); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="מחק">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image area */}
      {!previewMode && (
        <div className="px-4 pb-3">
          {section.image ? (
            <div className="relative rounded-xl overflow-hidden border border-border/60 group/img">
              <img src={section.image} alt="" className="w-full h-28 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white text-[12px] font-medium text-foreground shadow hover:bg-white/90"
                >
                  החלף
                </button>
                <button
                  onClick={() => onImageChange(undefined)}
                  className="px-3 py-1.5 rounded-lg bg-white text-[12px] font-medium text-destructive shadow hover:bg-white/90"
                >
                  הסר
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground/60 text-[12px] hover:border-primary/40 hover:text-primary/70 hover:bg-primary/3 transition-all duration-200 group/upload"
              >
                <div className="w-7 h-7 rounded-lg bg-accent group-hover/upload:bg-primary/10 flex items-center justify-center transition-colors">
                  <Image className="h-3.5 w-3.5" strokeWidth={1.5} />
                </div>
                <span>גרור תמונה לכאן, או לחץ להעלאה</span>
              </button>
              {imageMode === "url" ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={urlDraft}
                    onChange={e => setUrlDraft(e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-[12px]"
                    onKeyDown={e => {
                      if (e.key === "Enter" && urlDraft.trim()) { onImageChange(urlDraft.trim()); setImageMode("none"); setUrlDraft(""); }
                      if (e.key === "Escape") { setImageMode("none"); setUrlDraft(""); }
                    }}
                  />
                  <button
                    onClick={() => { if (urlDraft.trim()) { onImageChange(urlDraft.trim()); setImageMode("none"); setUrlDraft(""); } }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90"
                  >הוסף</button>
                  <button onClick={() => { setImageMode("none"); setUrlDraft(""); }} className="px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-accent text-[12px]">ביטול</button>
                </div>
              ) : (
                <button
                  onClick={() => setImageMode("url")}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-1"
                >
                  <Link2 className="h-3 w-3" />
                  הוסף קישור לתמונה
                </button>
              )}
            </div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
          />
        </div>
      )}

      {/* Section mini-preview (system only) */}
      {!previewMode && section.system && (
        <div className="px-4 pb-3"><SectionPreview id={section.id} /></div>
      )}

      {/* Custom fields + reorder area */}
      {!previewMode && (
        <div className="px-4 pb-3">
          {section.fields.length > 0 && (
            <button
              onClick={() => setFieldsOpen(v => !v)}
              className="w-full flex items-center gap-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${fieldsOpen ? "rotate-90" : ""}`} />
              <span>{section.fields.length} שד{section.fields.length === 1 ? "ה" : "ות"} — גרור לסידור מחדש</span>
            </button>
          )}

          {fieldsOpen && section.fields.length > 0 && (
            <div className="mt-1 space-y-1">
              <DndContext sensors={fieldSensors} collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
                <SortableContext items={section.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {section.fields.map(f => (
                    <SortableFieldRow
                      key={f.id}
                      field={f}
                      onEdit={() => onEditField(f.id)}
                      onDelete={() => { if (confirm(`למחוק שדה "${f.label}"?`)) onDeleteField(f.id); }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <button
                onClick={onAddField}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-[12px] text-muted-foreground/60 hover:border-primary/40 hover:text-primary/70 hover:bg-primary/3 transition-all mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                הוסף שדה
              </button>
            </div>
          )}

          {section.fields.length === 0 && (
            <button
              onClick={onAddField}
              className="w-full flex items-center gap-2 py-2 px-3 rounded-xl border border-dashed border-border/50 text-[11.5px] text-muted-foreground/50 hover:border-primary/40 hover:text-primary/70 hover:bg-primary/3 transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              הוסף שדה מותאם לבלוק
            </button>
          )}
        </div>
      )}

      {/* Role visibility footer */}
      {!previewMode && (
        <div className="px-4 pb-3 border-t border-border/30 pt-2 mt-1">
          <button
            onClick={() => setRolesOpen(v => !v)}
            className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            <span>{section.visibleRoles.length === ALL_ROLES.length ? "כל התפקידים" : section.visibleRoles.map(r => roleLabels[r]).join(" · ")}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${rolesOpen ? "rotate-180" : ""}`} />
          </button>
          {rolesOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_ROLES.map(role => {
                const active = section.visibleRoles.includes(role);
                return (
                  <button key={role} onClick={() => toggleRole(role)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${active ? "bg-primary/10 text-primary border-primary/25" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}>
                    <span>{ROLE_EMOJI[role]}</span>{roleLabels[role]}
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
const BlocksTab = ({ b, onAddField }: { b: ReturnType<typeof useBuilder>; onAddField: (id: string) => void }) => (
  <div className="space-y-1" dir="rtl">
    <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 px-1">בלוקים בעמוד</p>
    {b.layout.sections.map(s => {
      const Icon = (SECTION_ICONS[s.id] || Layers) as React.ElementType;
      return (
        <div key={s.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors group ${s.visible ? "hover:bg-accent/50" : "opacity-50 hover:bg-accent/30"}`}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.visible ? "bg-primary/10" : "bg-accent"}`}>
            <Icon className={`h-3.5 w-3.5 ${s.visible ? "text-primary" : "text-muted-foreground/50"}`} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-[12.5px] font-medium block truncate ${s.visible ? "text-foreground" : "text-muted-foreground line-through"}`}>{s.title}</span>
            {(s.fields.length > 0 || s.image) && (
              <span className="text-[10px] text-muted-foreground/60">
                {[s.fields.length > 0 && `${s.fields.length} שדות`, s.image && "✦ תמונה"].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          <button onClick={() => onAddField(s.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all" title="הוסף שדה">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => b.toggleSectionVisible(s.id)} className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${s.visible ? "text-muted-foreground/40 hover:text-muted-foreground" : "text-warning hover:text-warning/80"}`}>
            {s.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      );
    })}
  </div>
);

const FieldsTab = ({ b, onFieldModal }: { b: ReturnType<typeof useBuilder>; onFieldModal: (sid: string, fid?: string) => void }) => {
  const [selId, setSelId] = useState(b.layout.sections[0]?.id || "");
  const section = b.layout.sections.find(s => s.id === selId);
  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <label className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 block">בחר בלוק</label>
        <select value={selId} onChange={e => setSelId(e.target.value)} className="w-full text-[12.5px] border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" dir="rtl">
          {b.layout.sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      {section && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-foreground">שדות ב"{section.title}"</span>
            <button onClick={() => onFieldModal(section.id)} className="flex items-center gap-1 text-[11.5px] text-primary hover:text-primary/80 font-medium">
              <Plus className="h-3.5 w-3.5" />הוסף שדה
            </button>
          </div>
          {section.fields.length === 0 ? (
            <div className="flex flex-col items-center py-6 border-2 border-dashed border-border rounded-xl">
              <Settings2 className="h-7 w-7 text-muted-foreground/25 mb-2" strokeWidth={1} />
              <p className="text-[12px] text-muted-foreground">אין שדות מותאמים</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">לחץ "הוסף שדה" ליצירת שדה חדש</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {section.fields.map(f => (
                <div key={f.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-card hover:bg-accent/30">
                  <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                    <Settings2 className="h-3.5 w-3.5 text-primary/60" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground truncate">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground/70">{FIELD_TYPE_LABELS[f.type]}</p>
                  </div>
                  <button onClick={() => onFieldModal(section.id, f.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-accent">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={() => { if (confirm(`למחוק "${f.label}"?`)) b.removeField(section.id, f.id); }} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WidgetsTab = ({ b }: { b: ReturnType<typeof useBuilder> }) => {
  const [adding, setAdding] = useState<string | null>(null);
  const handleAddTemplate = (tpl: WidgetTemplate) => {
    setAdding(tpl.title);
    b.addSection(tpl.title);
    // We need to add fields to the just-created section
    // Since addSection is async (mutate), we use a short delay
    setTimeout(() => {
      const newSection = b.layout.sections[b.layout.sections.length - 1];
      if (newSection && !newSection.system) {
        tpl.fields.forEach(f => {
          b.addField(newSection.id, {
            key: f.label.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_֐-׿]/g, ""),
            label: f.label,
            type: f.type as any,
            required: false,
            visibleRoles: [...ALL_ROLES],
            editRoles: ["admin", "teacher"],
          });
        });
      }
      setAdding(null);
      toast.success(`הבלוק "${tpl.title}" נוסף לעמוד`);
    }, 200);
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div>
        <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">תבניות מוכנות</p>
        <p className="text-[11.5px] text-muted-foreground">לחץ על תבנית כדי להוסיפה ישירות לעמוד עם שדות מוכנים</p>
      </div>
      <div className="space-y-2">
        {WIDGET_TEMPLATES.map(tpl => {
          const TplIcon = tpl.icon;
          const isAdding = adding === tpl.title;
          return (
            <button
              key={tpl.title}
              onClick={() => handleAddTemplate(tpl)}
              disabled={isAdding}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/40 hover:border-primary/30 hover:shadow-sm transition-all duration-150 text-start disabled:opacity-50"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tpl.color}`}>
                <TplIcon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-foreground">{tpl.title}</p>
                <p className="text-[11px] text-muted-foreground">{tpl.description}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{tpl.fields.length} שדות מוכנים</p>
              </div>
              {isAdding
                ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
                : <Plus className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0" />
              }
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PermissionsTab = ({ b }: { b: ReturnType<typeof useBuilder> }) => (
  <div className="space-y-4" dir="rtl">
    <div>
      <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">מטריצת הרשאות</p>
      <p className="text-[11.5px] text-muted-foreground">לחץ על תא כדי להחליף הרשאת גישה לבלוק</p>
    </div>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-accent/50">
            <th className="text-start text-muted-foreground font-semibold py-2.5 px-3 text-[10.5px]">בלוק</th>
            {ALL_ROLES.map(r => (
              <th key={r} className="text-center text-muted-foreground font-semibold py-2.5 px-1.5 text-[9.5px]">
                <span title={roleLabels[r]}>{ROLE_EMOJI[r]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {b.layout.sections.map((section, i) => (
            <tr key={section.id} className={i % 2 === 0 ? "" : "bg-accent/20"}>
              <td className="py-2 px-3">
                <span className={`text-[11.5px] font-medium truncate max-w-[80px] block ${section.visible ? "text-foreground" : "text-muted-foreground line-through"}`}>{section.title}</span>
              </td>
              {ALL_ROLES.map(role => {
                const has = section.visibleRoles.includes(role);
                return (
                  <td key={role} className="py-2 px-1.5 text-center">
                    <button
                      onClick={() => b.setSectionRoleVisibility(section.id, has ? section.visibleRoles.filter(r => r !== role) : [...section.visibleRoles, role])}
                      className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center transition-all ${has ? "bg-success/15 text-success hover:bg-success/25" : "bg-accent text-muted-foreground/25 hover:bg-accent/80"}`}
                      title={`${roleLabels[role]}: ${has ? "נראה" : "מוסתר"}`}
                    >
                      {has ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
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
      {[["✓ נראה", "bg-success/15 text-success", <Check key="c" className="h-3 w-3 text-success" />], ["✗ מוסתר", "bg-accent text-muted-foreground/30", <X key="x" className="h-2.5 w-2.5 text-muted-foreground/30" />]].map(([label, cls, icon]) => (
        <div key={String(label)} className="flex items-center gap-2 text-[11px]">
          <span className={`w-5 h-5 rounded-md flex items-center justify-center ${cls}`}>{icon}</span>
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  </div>
);

const PreviewTab = ({ previewRole, onSetPreviewRole, visibleCount, totalCount }: {
  previewRole: PreviewRole; onSetPreviewRole: (r: PreviewRole) => void; visibleCount: number; totalCount: number;
}) => (
  <div className="space-y-3" dir="rtl">
    <div>
      <p className="text-[10.5px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">תצוגה מקדימה</p>
      <p className="text-[11.5px] text-muted-foreground">בחר תפקיד לסימולציה של מה שרואים</p>
    </div>
    <div className="space-y-1.5">
      <button onClick={() => onSetPreviewRole("none")} className={`w-full text-start p-3 rounded-xl border transition-all ${previewRole === "none" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-accent/50"}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${previewRole === "none" ? "bg-primary/15" : "bg-accent"}`}>
            <LayoutTemplate className={`h-4 w-4 ${previewRole === "none" ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
          </div>
          <div>
            <p className={`text-[12.5px] font-semibold ${previewRole === "none" ? "text-primary" : "text-foreground"}`}>מצב עריכה</p>
            <p className="text-[11px] text-muted-foreground">כל הבלוקים נראים</p>
          </div>
          {previewRole === "none" && <Check className="h-4 w-4 text-primary ms-auto" />}
        </div>
      </button>
      {ALL_ROLES.map(role => {
        const isActive = previewRole === role;
        return (
          <button key={role} onClick={() => onSetPreviewRole(role)} className={`w-full text-start p-3 rounded-xl border transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-accent/50"}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${isActive ? "bg-primary/15" : "bg-accent"}`}>{ROLE_EMOJI[role]}</div>
              <div>
                <p className={`text-[12.5px] font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{roleLabels[role]}</p>
                <p className="text-[11px] text-muted-foreground">{isActive ? `${visibleCount} מתוך ${totalCount} בלוקים` : "לחץ לצפות כ..."}</p>
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
        {visibleCount} מתוך {totalCount} בלוקים גלויים עבור "{roleLabels[previewRole as UserRole]}"
      </div>
    )}
  </div>
);

// ─── TopBar ───────────────────────────────────────────────────────────────────
const TopBar = ({ onBack, isPublished, saving, publishing, previewRole, onPreviewRole, onSaveDraft, onPublish }: {
  onBack: () => void; isPublished: boolean; saving: boolean; publishing: boolean;
  previewRole: PreviewRole; onPreviewRole: (r: PreviewRole) => void;
  onSaveDraft: () => void; onPublish: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="h-14 bg-[hsl(222,32%,9%)] border-b border-white/10 flex items-center gap-3 px-4 shrink-0 relative z-30" dir="rtl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-white/55 hover:text-white text-[13px] font-medium transition-colors shrink-0">
        <ArrowRight className="h-4 w-4" />
        <span className="hidden sm:inline">חזרה</span>
      </button>
      <div className="w-px h-5 bg-white/12 shrink-0" />
      <div className="flex items-center gap-2 min-w-0">
        <LayoutTemplate className="h-4 w-4 text-white/40 shrink-0" strokeWidth={1.5} />
        <span className="text-[13px] font-semibold text-white/80 truncate">עמוד פרופיל ספורטאי</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${isPublished ? "bg-[hsl(112,58%,31%)]/30 text-[hsl(112,70%,58%)]" : "bg-[hsl(36,92%,52%)]/20 text-[hsl(36,92%,62%)]"}`}>
          {isPublished ? "פורסם" : "טיוטה"}
        </span>
      </div>
      <div className="flex-1" />
      {saving && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/35 shrink-0">
          <Loader2 className="h-3 w-3 animate-spin" /><span className="hidden sm:inline">שומר...</span>
        </div>
      )}
      <div className="relative shrink-0">
        <button onClick={() => setMenuOpen(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${previewRole !== "none" ? "bg-primary/25 text-primary" : "bg-white/8 hover:bg-white/12 text-white/65"}`}>
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{previewRole === "none" ? "תצוגה מקדימה" : `כ: ${roleLabels[previewRole as UserRole]}`}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-full mt-2 end-0 bg-popover border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[180px]">
              <button onClick={() => { onPreviewRole("none"); setMenuOpen(false); }} className={`w-full text-start px-3.5 py-2 text-[13px] hover:bg-accent flex items-center gap-2.5 ${previewRole === "none" ? "text-primary font-medium" : "text-foreground"}`}>
                <LayoutTemplate className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />מצב עריכה
                {previewRole === "none" && <Check className="h-3.5 w-3.5 ms-auto text-primary" />}
              </button>
              <div className="h-px bg-border mx-3 my-1" />
              {ALL_ROLES.map(role => (
                <button key={role} onClick={() => { onPreviewRole(role); setMenuOpen(false); }} className={`w-full text-start px-3.5 py-2 text-[13px] hover:bg-accent flex items-center gap-2.5 ${previewRole === role ? "text-primary font-medium" : "text-foreground"}`}>
                  <span className="text-base">{ROLE_EMOJI[role]}</span>{roleLabels[role]}
                  {previewRole === role && <Check className="h-3.5 w-3.5 ms-auto text-primary" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="w-px h-5 bg-white/12 shrink-0" />
      <button onClick={onSaveDraft} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/14 text-white/65 hover:text-white text-[12px] font-medium transition-colors shrink-0">
        <Save className="h-3.5 w-3.5" /><span className="hidden sm:inline">שמור</span>
      </button>
      <button onClick={onPublish} disabled={publishing} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-[13px] font-semibold transition-colors disabled:opacity-60 shrink-0 shadow-[0_2px_12px_-2px_hsla(112,58%,31%,0.4)]">
        {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        <span>פרסם</span>
      </button>
    </header>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminBuilderPage = () => {
  const navigate = useNavigate();
  const b = useBuilder();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("widgets");
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

  const handleSaveDraft = () => toast.success("הטיוטה נשמרה", { description: "כל השינויים נשמרו בהצלחה" });

  const handlePublish = async () => {
    setPublishing(true);
    await new Promise(r => setTimeout(r, 700));
    setIsPublished(true);
    setPublishing(false);
    toast.success("הפרופיל פורסם בהצלחה!", { description: "הפריסה החדשה זמינה לכל המשתמשים" });
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    b.addSection(newSectionTitle.trim());
    toast.success(`בלוק "${newSectionTitle.trim()}" נוצר`);
    setNewSectionTitle("");
    setAddingSection(false);
  };

  const displayedSections = previewRole === "none"
    ? b.layout.sections
    : b.layout.sections.filter(s => s.visible && s.visibleRoles.includes(previewRole as UserRole));

  const visibleCount = previewRole !== "none"
    ? b.layout.sections.filter(s => s.visible && s.visibleRoles.includes(previewRole as UserRole)).length
    : b.layout.sections.length;

  const SIDEBAR_TABS = [
    { id: "widgets" as SidebarTab, label: "ווידג'טים", icon: Zap },
    { id: "blocks" as SidebarTab, label: "בלוקים", icon: Layers },
    { id: "fields" as SidebarTab, label: "שדות", icon: Settings2 },
    { id: "permissions" as SidebarTab, label: "הרשאות", icon: Shield },
    { id: "preview" as SidebarTab, label: "תצוגה", icon: Eye },
  ];

  return (
    <div className="h-screen flex flex-col bg-[hsl(222,30%,10%)] overflow-hidden" dir="rtl">
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

      <div className="flex-1 flex overflow-hidden">
        {/* ── CANVAS ── */}
        <main className="flex-1 bg-[hsl(220,18%,15%)] overflow-y-auto">
          <div className="max-w-[820px] mx-auto p-5 md:p-8 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-[15px] font-bold text-white/85">
                  {previewRole === "none" ? "בלוקים בעמוד" : `תצוגה מקדימה — ${roleLabels[previewRole as UserRole]}`}
                </h2>
                <p className="text-[11.5px] text-white/35 mt-0.5">
                  {previewRole === "none"
                    ? "גרור בלוקים לסידור מחדש · גרור תמונות על הבלוקים · לחץ לפתיחת שדות"
                    : `${visibleCount} מתוך ${b.layout.sections.length} בלוקים גלויים`}
                </p>
              </div>
              {previewRole !== "none" && (
                <button onClick={() => setPreviewRole("none")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 text-primary text-[12px] font-medium hover:bg-primary/30 transition-colors">
                  <X className="h-3.5 w-3.5" />סיים תצוגה מקדימה
                </button>
              )}
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={b.layout.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {displayedSections.map(section => (
                    <CanvasBlock
                      key={section.id}
                      section={section}
                      previewMode={previewRole !== "none"}
                      onToggleVisible={() => b.toggleSectionVisible(section.id)}
                      onRename={title => b.renameSection(section.id, title)}
                      onDelete={() => b.removeSection(section.id)}
                      onAddField={() => { setFieldModal({ sectionId: section.id }); setSidebarTab("fields"); }}
                      onEditField={fid => setFieldModal({ sectionId: section.id, fieldId: fid })}
                      onSetRoles={roles => b.setSectionRoleVisibility(section.id, roles)}
                      onImageChange={img => b.setSectionImage(section.id, img)}
                      onReorderFields={ids => b.reorderFields(section.id, ids)}
                      onDeleteField={fid => b.removeField(section.id, fid)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {previewRole === "none" && (
              <div className="pt-1">
                {addingSection ? (
                  <div className="flex gap-2 p-1">
                    <Input
                      autoFocus
                      value={newSectionTitle}
                      onChange={e => setNewSectionTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddSection(); if (e.key === "Escape") { setAddingSection(false); setNewSectionTitle(""); } }}
                      placeholder="שם הבלוק החדש..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary/50 rounded-xl"
                    />
                    <button onClick={handleAddSection} disabled={!newSectionTitle.trim()} className="px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-medium disabled:opacity-50">הוסף</button>
                    <button onClick={() => { setAddingSection(false); setNewSectionTitle(""); }} className="px-3 py-2 rounded-xl bg-white/10 text-white/60 text-[13px] hover:bg-white/15">ביטול</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingSection(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-white/15 text-white/35 text-[13px] hover:border-white/30 hover:text-white/55 hover:bg-white/3 transition-all duration-200">
                    <Plus className="h-4 w-4" />הוסף בלוק חדש
                  </button>
                )}
              </div>
            )}

            {previewRole === "none" && (
              <div className="pt-4 border-t border-white/8">
                <button onClick={() => { if (confirm("לאפס את כל הפריסה לברירת מחדל?")) { b.resetLayout(); toast.success("הפריסה אופסה"); } }} className="flex items-center gap-2 text-[12px] text-white/25 hover:text-red-400 transition-colors">
                  <AlertTriangle className="h-3.5 w-3.5" />איפוס פריסה לברירת מחדל
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── SIDEBAR ── */}
        <aside className="w-[300px] bg-background border-s border-border flex flex-col shrink-0 overflow-hidden" dir="rtl">
          <div className="border-b border-border shrink-0 bg-background">
            <div className="flex">
              {SIDEBAR_TABS.map(tab => (
                <button key={tab.id} onClick={() => setSidebarTab(tab.id)} className={`flex-1 flex flex-col items-center gap-1 py-3 text-[9px] font-semibold uppercase tracking-wide transition-colors relative ${sidebarTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <tab.icon className="h-[15px] w-[15px]" strokeWidth={sidebarTab === tab.id ? 2 : 1.5} />
                  <span>{tab.label}</span>
                  {sidebarTab === tab.id && <span className="absolute bottom-0 inset-x-0 h-[2px] bg-primary rounded-t-full" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === "widgets" && <WidgetsTab b={b} />}
            {sidebarTab === "blocks" && <BlocksTab b={b} onAddField={id => { setFieldModal({ sectionId: id }); setSidebarTab("fields"); }} />}
            {sidebarTab === "fields" && <FieldsTab b={b} onFieldModal={(sid, fid) => setFieldModal({ sectionId: sid, fieldId: fid })} />}
            {sidebarTab === "permissions" && <PermissionsTab b={b} />}
            {sidebarTab === "preview" && <PreviewTab previewRole={previewRole} onSetPreviewRole={setPreviewRole} visibleCount={visibleCount} totalCount={b.layout.sections.length} />}
          </div>

          <div className="border-t border-border px-4 py-3 shrink-0 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/50">
              {b.layout.sections.length} בלוקים · {b.layout.sections.reduce((a, s) => a + s.fields.length, 0)} שדות
            </span>
            {b.saving && <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50"><Loader2 className="h-3 w-3 animate-spin" />שומר</span>}
          </div>
        </aside>
      </div>

      {fieldModal && (
        <FieldEditorModal
          open
          onClose={() => setFieldModal(null)}
          sectionId={fieldModal.sectionId}
          field={fieldModal.fieldId ? b.layout.sections.find(s => s.id === fieldModal.sectionId)?.fields.find(f => f.id === fieldModal.fieldId) : undefined}
        />
      )}
    </div>
  );
};

export default AdminBuilderPage;
