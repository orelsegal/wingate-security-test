import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Check, X, Loader2, Dumbbell, BookOpen, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSports, useStudents, useSubjects } from "@/hooks/useStudents";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "sports" | "subjects" | "classes";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "sports", label: "ענפי ספורט", icon: Dumbbell },
  { key: "subjects", label: "מקצועות לימוד", icon: BookOpen },
  { key: "classes", label: "כיתות", icon: GraduationCap },
];

const DEFAULT_CLASSES = ["ט'1", "ט'2", "ט'3", "י'1", "י'2", "י'3", "יא'1", "יא'2", "יא'3"];

export default function DataManagementModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("sports");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-bold">ניהול נתונים</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 rounded-xl bg-accent/50 mb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                tab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "sports" && <SportsTab />}
          {tab === "subjects" && <SubjectsTab />}
          {tab === "classes" && <ClassesTab />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ SPORTS TAB ═══ */
function SportsTab() {
  const { data: sports = [], isLoading } = useSports();
  const { data: students = [] } = useStudents();
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("sports").insert({ sport_name: newItem.trim() });
    setSaving(false);
    if (error) { console.error("Sport insert error:", error); toast.error("שמירה נכשלה: " + error.message); return; }
    toast.success(`ענף "${newItem.trim()}" נוסף`);
    setNewItem("");
    queryClient.invalidateQueries({ queryKey: ["sports"] });
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const oldName = sports.find((s: any) => s.id === id)?.sport_name;
    const { error } = await supabase.from("sports").update({ sport_name: editName.trim() }).eq("id", id);
    if (error) { console.error("Sport rename error:", error); toast.error("שמירה נכשלה: " + error.message); return; }
    // Also update students that reference the old sport name
    if (oldName && oldName !== editName.trim()) {
      const { error: studentError } = await supabase.from("students").update({ sport: editName.trim() }).eq("sport", oldName);
      if (studentError) console.error("Student sport update error:", studentError);
    }
    toast.success("שם הענף עודכן");
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["sports"] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const linkedStudents = students.filter(s => s.sport === deleteTarget.sport_name);
    if (linkedStudents.length > 0) {
      toast.error(`לא ניתן למחוק — ${linkedStudents.length} ספורטאים משויכים לענף`);
      setDeleteTarget(null);
      return;
    }
    const { error } = await supabase.from("sports").delete().eq("id", deleteTarget.id);
    if (error) { console.error("Sport delete error:", error); toast.error("שמירה נכשלה: " + error.message); return; }
    toast.success(`ענף "${deleteTarget.sport_name}" נמחק`);
    setDeleteTarget(null);
    queryClient.invalidateQueries({ queryKey: ["sports"] });
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="שם ענף חדש..." className="h-9 text-[13px]" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <Button onClick={handleAdd} disabled={saving} size="sm" className="gap-1.5 shrink-0">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            הוסף
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : sports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">אין ענפים עדיין</p>
        ) : (
          <div className="space-y-1">
            {sports.map((sport: any) => {
              const linkedCount = students.filter(s => s.sport === sport.sport_name).length;
              const isEditing = editingId === sport.id;
              return (
                <div key={sport.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${sport.active === false ? "opacity-50 bg-muted/30 border-border" : "bg-card border-border hover:border-primary/20"}`}>
                  {isEditing ? (
                    <>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-[13px] flex-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRename(sport.id)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(sport.id)}><Check className="h-3.5 w-3.5 text-success" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-[13px] font-medium">{sport.sport_name}</span>
                      <span className="text-[10px] text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">{linkedCount}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(sport.id); setEditName(sport.sport_name); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(sport)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="מחיקת ענף ספורט"
        description={`האם למחוק את הענף "${deleteTarget?.sport_name}"?`}
        confirmLabel="מחק"
        destructive
      />
    </>
  );
}

/* ═══ SUBJECTS TAB ═══ */
function SubjectsTab() {
  const { data: subjects = [], isLoading } = useSubjects();
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("subjects").insert({ subject_name: newItem.trim() });
    setSaving(false);
    if (error) { console.error("Subject insert error:", error); toast.error("שמירה נכשלה: " + error.message); return; }
    toast.success(`מקצוע "${newItem.trim()}" נוסף`);
    setNewItem("");
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("subjects").update({ subject_name: editName.trim() }).eq("id", id);
    if (error) { console.error("Subject rename error:", error); toast.error("שמירה נכשלה: " + error.message); return; }
    toast.success("שם המקצוע עודכן");
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
    queryClient.invalidateQueries({ queryKey: ["student-progress"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Delete related progress first
    const { error: progressError } = await supabase.from("student_subject_progress").delete().eq("subject_id", deleteTarget.id);
    if (progressError) { console.error("Progress delete error:", progressError); toast.error("שמירה נכשלה: " + progressError.message); setDeleteTarget(null); return; }
    // Delete related roadmap items
    const { error: roadmapError } = await supabase.from("subject_roadmaps").delete().eq("subject_id", deleteTarget.id);
    if (roadmapError) console.error("Roadmap delete error:", roadmapError);
    // Delete subject
    const { error } = await supabase.from("subjects").delete().eq("id", deleteTarget.id);
    if (error) { console.error("Subject delete error:", error); toast.error("שמירה נכשלה: " + error.message); setDeleteTarget(null); return; }
    toast.success(`מקצוע "${deleteTarget.subject_name}" נמחק`);
    setDeleteTarget(null);
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
    queryClient.invalidateQueries({ queryKey: ["student-progress"] });
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="שם מקצוע חדש..." className="h-9 text-[13px]" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <Button onClick={handleAdd} disabled={saving} size="sm" className="gap-1.5 shrink-0">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            הוסף
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">אין מקצועות</p>
        ) : (
          <div className="space-y-1">
            {subjects.map((subj: any) => {
              const isEditing = editingId === subj.id;
              return (
                <div key={subj.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                  {isEditing ? (
                    <>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-[13px] flex-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRename(subj.id)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(subj.id)}><Check className="h-3.5 w-3.5 text-success" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-3.5 w-3.5 text-primary/50 shrink-0" strokeWidth={1.5} />
                      <span className="flex-1 text-[13px] font-medium">{subj.subject_name}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(subj.id); setEditName(subj.subject_name); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(subj)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="מחיקת מקצוע"
        description={`האם למחוק את המקצוע "${deleteTarget?.subject_name}"? כל ההתקדמות המשויכת תימחק.`}
        confirmLabel="מחק"
        destructive
      />
    </>
  );
}

/* ═══ CLASSES TAB ═══ */
function ClassesTab() {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">הכיתות הזמינות במערכת:</p>
      <div className="space-y-1">
        {DEFAULT_CLASSES.map(c => (
          <div key={c} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card">
            <GraduationCap className="h-3.5 w-3.5 text-primary/50 shrink-0" strokeWidth={1.5} />
            <span className="flex-1 text-[13px] font-medium">{c}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60">כיתות מנוהלות ברמת המערכת. לשינויים פנו למנהל המערכת.</p>
    </div>
  );
}
