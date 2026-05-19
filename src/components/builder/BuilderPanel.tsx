import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ALL_ROLES, useBuilder, BuilderSection } from "@/context/BuilderContext";
import { roleLabels, UserRole } from "@/context/AuthContext";
import { Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, X, Settings, Shield } from "lucide-react";
import { FieldEditorModal } from "./FieldEditorModal";

interface Props { open: boolean; onClose: () => void; }

const SortableRow = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

export const BuilderPanel = ({ open, onClose }: Props) => {
  const b = useBuilder();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [tab, setTab] = useState("sections");
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
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto p-0" dir="rtl">
          <div className="sticky top-0 z-10 bg-background border-b">
            <SheetHeader className="p-4">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base">בונה פרופיל ספורטאי</SheetTitle>
                <div className="flex items-center gap-2">
                  {b.saving && <span className="text-[11px] text-muted-foreground">שומר…</span>}
                  <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
              </div>
            </SheetHeader>
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-0 px-4 h-10 bg-transparent">
                <TabsTrigger value="sections">סקציות</TabsTrigger>
                <TabsTrigger value="add">הוספה</TabsTrigger>
                <TabsTrigger value="rules">הרשאות</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="p-4 space-y-4">
            {tab === "sections" && (
              <>
                <div className="text-[11px] text-muted-foreground">גרור כדי לסדר מחדש. לחץ על שדות הסקציה כדי לערוך/למחוק.</div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
                  <SortableContext items={b.layout.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {b.layout.sections.map((s) => (
                        <SortableRow key={s.id} id={s.id}>
                          <SectionRow section={s}
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
              </>
            )}

            {tab === "add" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="text-[12px] font-medium">הוסף סקציה חדשה</div>
                  <div className="flex gap-2">
                    <Input value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} placeholder="כותרת הסקציה" />
                    <Button size="sm" onClick={() => { if (newSectionTitle.trim()) { b.addSection(newSectionTitle.trim()); setNewSectionTitle(""); } }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[12px] font-medium">הוסף שדה לסקציה קיימת</div>
                  <Button variant="outline" size="sm" className="w-full"
                    onClick={() => setFieldModal({ sectionId: b.layout.sections[0]?.id })}>
                    <Plus className="h-4 w-4 ml-1" /> הוסף שדה חדש
                  </Button>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="text-[12px] font-medium text-destructive">אזור מסוכן</div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => confirm("לאפס את כל הפריסה? פעולה זו אינה הפיכה.") && b.resetLayout()}>
                    איפוס פריסה לברירת מחדל
                  </Button>
                </div>
              </div>
            )}

            {tab === "rules" && (
              <div className="space-y-2 text-[12px]">
                <div className="text-muted-foreground">ניהול נראות סקציה לפי תפקיד מתבצע דרך הגדרות הסקציה (גלגל שיניים).</div>
                <div className="text-muted-foreground">הרשאות עריכה לכל שדה — דרך עריכת השדה.</div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {fieldModal && (
        <FieldEditorModal
          open={!!fieldModal}
          onClose={() => setFieldModal(null)}
          sectionId={fieldModal.sectionId}
          field={fieldModal.fieldId ? b.layout.sections.find((s) => s.id === fieldModal.sectionId)?.fields.find((f) => f.id === fieldModal.fieldId) : undefined}
        />
      )}

      {/* Section settings popup */}
      {settingsSection && (
        <Sheet open onOpenChange={() => setSettingsFor(null)}>
          <SheetContent side="left" className="w-[340px]" dir="rtl">
            <SheetHeader><SheetTitle className="text-[15px]">הגדרות: {settingsSection.title}</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px]">הצג סקציה</span>
                <Switch checked={settingsSection.visible} onCheckedChange={() => b.toggleSectionVisible(settingsSection.id)} />
              </div>
              <div>
                <div className="text-[12px] font-medium mb-2 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> נראית לתפקידים</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map((r) => (
                    <button key={r} onClick={() => b.setSectionRoleVisibility(settingsSection.id, toggleRole(settingsSection.visibleRoles, r))}
                      className={`px-2.5 py-1 rounded-md text-[12px] border ${settingsSection.visibleRoles.includes(r) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>
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
          </SheetContent>
        </Sheet>
      )}
    </>
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
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {isEditing ? (
          <Input autoFocus value={renameDraft} onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onCommitRename(); if (e.key === "Escape") onCancelRename(); }}
            onBlur={onCommitRename} className="h-7 text-[13px]" />
        ) : (
          <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-right text-[13px] font-medium truncate">
            {section.title}
            {section.system && <span className="mr-1 text-[10px] text-muted-foreground">(מערכת)</span>}
          </button>
        )}
        <button onClick={onStartRename} className="text-muted-foreground hover:text-foreground" title="שנה שם"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={onToggleVisible} className="text-muted-foreground hover:text-foreground" title="הסתר/הצג">
          {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-warning" />}
        </button>
        <button onClick={onSettings} className="text-muted-foreground hover:text-foreground" title="הגדרות"><Settings className="h-3.5 w-3.5" /></button>
        {!section.system && (
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" title="מחק"><Trash2 className="h-3.5 w-3.5" /></button>
        )}
      </div>

      {expanded && (
        <div className="pr-5 space-y-1.5">
          <DndContext sensors={fieldDnd.sensors} collisionDetection={closestCenter} onDragEnd={fieldDnd.onDragEnd}>
            <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {section.fields.map((f) => (
                <SortableRow key={f.id} id={f.id}>
                  <div className="flex items-center gap-1.5">
                    <span className="flex-1 text-[12px] truncate">{f.label} <span className="text-muted-foreground text-[10px]">({f.type})</span></span>
                    <button onClick={() => onEditField(f.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => onDeleteField(f.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </SortableRow>
              ))}
            </SortableContext>
          </DndContext>
          <Button variant="outline" size="sm" className="w-full h-7 text-[12px]" onClick={onAddField}>
            <Plus className="h-3 w-3 ml-1" /> הוסף שדה
          </Button>
        </div>
      )}
    </div>
  );
};
