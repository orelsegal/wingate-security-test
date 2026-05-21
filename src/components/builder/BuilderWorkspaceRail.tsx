/**
 * BuilderWorkspaceRail — left-hand structure & blocks panel for the
 * dedicated Admin Builder workspace. Wraps the same context the inline
 * BuilderPanel uses, presented as an always-visible rail (no Sheet).
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ALL_ROLES, useBuilder, BuilderSection } from "@/context/BuilderContext";
import { roleLabels, type UserRole } from "@/context/AuthContext";
import { Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, Settings, Shield, Layers, Type } from "lucide-react";
import { FieldEditorModal } from "./FieldEditorModal";
import { cn } from "@/lib/utils";

const SortableRow = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-md border bg-card hover:border-primary/40">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

export const BuilderWorkspaceRail = () => {
  const b = useBuilder();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [fieldModal, setFieldModal] = useState<{ sectionId: string; fieldId?: string } | null>(null);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);

  const onSectionDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = b.layout.sections.map((s) => s.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    b.reorderSections(next);
  };
  const onFieldDragEnd = (sectionId: string) => (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const sec = b.layout.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const ids = sec.fields.map((f) => f.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    b.reorderFields(sectionId, next);
  };

  const settingsSection = settingsFor ? b.layout.sections.find((s) => s.id === settingsFor) : null;
  const toggleRole = (arr: UserRole[], r: UserRole) => arr.includes(r) ? arr.filter((x) => x !== r) : [...arr, r];

  return (
    <aside className="w-[300px] shrink-0 border-s bg-card/40 overflow-y-auto" dir="rtl">
      {/* Blocks library */}
      <section className="p-4 border-b">
        <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> בלוקים
        </h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="שם סקציה חדשה"
              className="h-8 text-[12px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSectionTitle.trim()) {
                  b.addSection(newSectionTitle.trim()); setNewSectionTitle("");
                }
              }}
            />
            <Button size="sm" className="h-8 px-2" onClick={() => {
              if (newSectionTitle.trim()) { b.addSection(newSectionTitle.trim()); setNewSectionTitle(""); }
            }}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full h-8 text-[12px] gap-1.5"
            onClick={() => setFieldModal({ sectionId: b.layout.sections[0]?.id })}>
            <Type className="h-3.5 w-3.5" /> הוסף שדה מותאם
          </Button>
        </div>
      </section>

      {/* Structure */}
      <section className="p-4 border-b">
        <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-3">מבנה הדף</h3>
        <p className="text-[10.5px] text-muted-foreground mb-2">גרור לסידור. לחץ סקציה לעריכת שדות.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
          <SortableContext items={b.layout.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {b.layout.sections.map((s) => (
                <SortableRow key={s.id} id={s.id}>
                  <SectionRow
                    section={s}
                    isEditing={editingSection === s.id}
                    renameDraft={renameDraft}
                    onStartRename={() => { setEditingSection(s.id); setRenameDraft(s.title); }}
                    onCommitRename={() => { b.renameSection(s.id, renameDraft.trim() || s.title); setEditingSection(null); }}
                    onCancelRename={() => setEditingSection(null)}
                    onRenameChange={setRenameDraft}
                    onToggleVisible={() => b.toggleSectionVisible(s.id)}
                    onSettings={() => setSettingsFor(s.id)}
                    onDelete={() => !s.system && confirm(`למחוק סקציה "${s.title}"?`) && b.removeSection(s.id)}
                    onAddField={() => setFieldModal({ sectionId: s.id })}
                    onEditField={(fid) => setFieldModal({ sectionId: s.id, fieldId: fid })}
                    onDeleteField={(fid) => b.removeField(s.id, fid)}
                    fieldDnd={{ sensors, onDragEnd: onFieldDragEnd(s.id) }}
                  />
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      {/* Danger */}
      <section className="p-4">
        <h3 className="text-[11px] font-semibold tracking-wide text-destructive uppercase mb-2">אזור מסוכן</h3>
        <Button variant="outline" size="sm" className="w-full h-8 text-[12px]"
          onClick={() => confirm("לאפס את כל הפריסה לברירת מחדל?") && b.resetLayout()}>
          איפוס פריסה
        </Button>
      </section>

      {fieldModal && (
        <FieldEditorModal
          open={!!fieldModal}
          onClose={() => setFieldModal(null)}
          sectionId={fieldModal.sectionId}
          field={fieldModal.fieldId ? b.layout.sections.find((s) => s.id === fieldModal.sectionId)?.fields.find((f) => f.id === fieldModal.fieldId) : undefined}
        />
      )}

      {settingsSection && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSettingsFor(null)} dir="rtl">
          <div className="bg-card border rounded-xl shadow-xl w-[360px] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-semibold">הגדרות סקציה</h4>
              <button onClick={() => setSettingsFor(null)} className="text-muted-foreground hover:text-foreground">×</button>
            </div>
            <p className="text-[12px] text-muted-foreground">{settingsSection.title}</p>
            <div className="flex items-center justify-between">
              <span className="text-[13px]">הצג סקציה</span>
              <Switch checked={settingsSection.visible} onCheckedChange={() => b.toggleSectionVisible(settingsSection.id)} />
            </div>
            <div>
              <div className="text-[12px] font-medium mb-2 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> נראית לתפקידים</div>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((r) => (
                  <button key={r} onClick={() => b.setSectionRoleVisibility(settingsSection.id, toggleRole(settingsSection.visibleRoles, r))}
                    className={cn("px-2.5 py-1 rounded-md text-[12px] border",
                      settingsSection.visibleRoles.includes(r)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground")}>
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>
            {!settingsSection.system && (
              <Button variant="destructive" size="sm" className="w-full"
                onClick={() => { if (confirm("למחוק סקציה זו?")) { b.removeSection(settingsSection.id); setSettingsFor(null); } }}>
                <Trash2 className="h-4 w-4 ml-1" /> מחק סקציה
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

const SectionRow = ({
  section, isEditing, renameDraft, onStartRename, onCommitRename, onCancelRename, onRenameChange,
  onToggleVisible, onSettings, onDelete, onAddField, onEditField, onDeleteField, fieldDnd,
}: {
  section: BuilderSection;
  isEditing: boolean;
  renameDraft: string;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onRenameChange: (v: string) => void;
  onToggleVisible: () => void;
  onSettings: () => void;
  onDelete: () => void;
  onAddField: () => void;
  onEditField: (fid: string) => void;
  onDeleteField: (fid: string) => void;
  fieldDnd: { sensors: any; onDragEnd: (e: DragEndEvent) => void };
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {isEditing ? (
          <Input autoFocus value={renameDraft} onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onCommitRename(); if (e.key === "Escape") onCancelRename(); }}
            onBlur={onCommitRename} className="h-6 text-[12px]" />
        ) : (
          <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-right text-[12.5px] font-medium truncate">
            {section.title}
            {section.system && <span className="mr-1 text-[10px] text-muted-foreground">·מערכת</span>}
          </button>
        )}
        <button onClick={onStartRename} className="text-muted-foreground hover:text-foreground p-1"><Pencil className="h-3 w-3" /></button>
        <button onClick={onToggleVisible} className="text-muted-foreground hover:text-foreground p-1">
          {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-warning" />}
        </button>
        <button onClick={onSettings} className="text-muted-foreground hover:text-foreground p-1"><Settings className="h-3 w-3" /></button>
        {!section.system && (
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3 w-3" /></button>
        )}
      </div>
      {expanded && (
        <div className="pr-4 space-y-1">
          <DndContext sensors={fieldDnd.sensors} collisionDetection={closestCenter} onDragEnd={fieldDnd.onDragEnd}>
            <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {section.fields.map((f) => (
                <SortableRow key={f.id} id={f.id}>
                  <div className="flex items-center gap-1">
                    <span className="flex-1 text-[11.5px] truncate">{f.label} <span className="text-muted-foreground text-[9.5px]">({f.type})</span></span>
                    <button onClick={() => onEditField(f.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => onDeleteField(f.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </SortableRow>
              ))}
            </SortableContext>
          </DndContext>
          <Button variant="outline" size="sm" className="w-full h-6 text-[11px]" onClick={onAddField}>
            <Plus className="h-3 w-3 ml-1" /> הוסף שדה
          </Button>
        </div>
      )}
    </div>
  );
};
