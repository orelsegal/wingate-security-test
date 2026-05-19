import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Check, X, Dumbbell, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSports, useSubjects } from "@/hooks/useStudents";
import { useUiLabels } from "@/context/UiLabelsContext";
import ConfirmDialog from "@/components/ConfirmDialog";

const CLASSES = ["ט'1", "ט'2", "ט'3", "י'1", "י'2", "י'3", "יא'1", "יא'2", "יא'3"];

const DataManagementPage = () => {
  const queryClient = useQueryClient();
  const { labels } = useUiLabels();
  const { data: sports = [], isLoading: loadingSports } = useSports();
  const { data: subjects = [], isLoading: loadingSubjects } = useSubjects();

  // Sports state
  const [newSport, setNewSport] = useState("");
  const [editSportId, setEditSportId] = useState<string | null>(null);
  const [editSportName, setEditSportName] = useState("");
  const [deleteSportTarget, setDeleteSportTarget] = useState<any>(null);

  // Subjects state
  const [newSubject, setNewSubject] = useState("");
  const [editSubjectId, setEditSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<any>(null);

  // Classes state
  const [classes, setClasses] = useState<string[]>(CLASSES);
  const [newClass, setNewClass] = useState("");
  const [editClassIdx, setEditClassIdx] = useState<number | null>(null);
  const [editClassName, setEditClassName] = useState("");

  // === SPORTS CRUD ===
  const handleAddSport = async () => {
    const name = newSport.trim();
    if (!name) return;
    const { error } = await supabase.from("sports").insert({ sport_name: name });
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success(`"${name}" נוסף`);
    setNewSport("");
    queryClient.invalidateQueries({ queryKey: ["sports"] });
  };

  const handleSaveSport = async () => {
    if (!editSportId || !editSportName.trim()) return;
    const oldSport = (sports as any[]).find(s => s.id === editSportId);
    const { error } = await supabase.from("sports").update({ sport_name: editSportName.trim() }).eq("id", editSportId);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    // Cascade rename to students
    if (oldSport) {
      await supabase.from("students").update({ sport: editSportName.trim() } as any).eq("sport", oldSport.sport_name);
    }
    toast.success("עודכן בהצלחה");
    setEditSportId(null);
    queryClient.invalidateQueries({ queryKey: ["sports"] });
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  const handleDeleteSport = async () => {
    if (!deleteSportTarget) return;
    const { data: linked } = await supabase.from("students").select("id").eq("sport", deleteSportTarget.sport_name).limit(1);
    if (linked && linked.length > 0) {
      toast.error(`לא ניתן למחוק — יש ספורטאים משויכים ל"${deleteSportTarget.sport_name}"`);
      setDeleteSportTarget(null);
      return;
    }
    const { error } = await supabase.from("sports").delete().eq("id", deleteSportTarget.id);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success(`"${deleteSportTarget.sport_name}" נמחק`);
    setDeleteSportTarget(null);
    queryClient.invalidateQueries({ queryKey: ["sports"] });
  };

  // === SUBJECTS CRUD ===
  const handleAddSubject = async () => {
    const name = newSubject.trim();
    if (!name) return;
    const { error } = await supabase.from("subjects").insert({ subject_name: name });
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success(`"${name}" נוסף`);
    setNewSubject("");
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
  };

  const handleSaveSubject = async () => {
    if (!editSubjectId || !editSubjectName.trim()) return;
    const { error } = await supabase.from("subjects").update({ subject_name: editSubjectName.trim() }).eq("id", editSubjectId);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success("עודכן בהצלחה");
    setEditSubjectId(null);
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
    queryClient.invalidateQueries({ queryKey: ["all-student-progress"] });
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubjectTarget) return;
    // Delete related progress and roadmaps first
    await supabase.from("student_subject_progress").delete().eq("subject_id", deleteSubjectTarget.id);
    await supabase.from("subject_roadmaps").delete().eq("subject_id", deleteSubjectTarget.id);
    const { error } = await supabase.from("subjects").delete().eq("id", deleteSubjectTarget.id);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success(`"${deleteSubjectTarget.subject_name}" נמחק`);
    setDeleteSubjectTarget(null);
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
    queryClient.invalidateQueries({ queryKey: ["all-student-progress"] });
  };

  // === CLASSES (local) ===
  const handleAddClass = () => {
    const name = newClass.trim();
    if (!name || classes.includes(name)) return;
    setClasses([...classes, name]);
    setNewClass("");
    toast.success(`"${name}" נוסף`);
  };

  const handleSaveClass = () => {
    if (editClassIdx === null || !editClassName.trim()) return;
    const updated = [...classes];
    updated[editClassIdx] = editClassName.trim();
    setClasses(updated);
    setEditClassIdx(null);
    toast.success("עודכן בהצלחה");
  };

  const handleDeleteClass = (idx: number) => {
    const name = classes[idx];
    setClasses(classes.filter((_, i) => i !== idx));
    toast.success(`"${name}" נמחק`);
  };

  const isLoading = loadingSports || loadingSubjects;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-5 md:p-10 lg:p-12 max-w-[900px]">
      <div className="mb-6">
        <h2 className="text-xl md:text-[1.5rem] font-bold text-foreground tracking-tight">ניהול נתונים</h2>
        <p className="text-[13px] text-muted-foreground mt-1">ניהול ענפי ספורט, מקצועות לימוד וכיתות</p>
      </div>

      <Tabs defaultValue="sports" dir="rtl">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger value="sports" className="gap-1.5 text-[12px]">
            <Dumbbell className="h-3.5 w-3.5" />
            ענפי ספורט
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-1.5 text-[12px]">
            <BookOpen className="h-3.5 w-3.5" />
            מקצועות לימוד
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-1.5 text-[12px]">
            <GraduationCap className="h-3.5 w-3.5" />
            כיתות
          </TabsTrigger>
        </TabsList>

        {/* SPORTS TAB */}
        <TabsContent value="sports">
          <div className="card-premium p-5 space-y-4">
            <div className="flex gap-2">
              <Input value={newSport} onChange={(e) => setNewSport(e.target.value)} placeholder="שם ענף חדש..." className="h-9 text-[13px] flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddSport()} />
              <Button size="sm" onClick={handleAddSport} className="gap-1.5 h-9">
                <Plus className="h-3.5 w-3.5" /> הוסף
              </Button>
            </div>
            <div className="divide-y divide-border">
              {(sports as any[]).map((sport) => (
                <div key={sport.id} className="flex items-center justify-between py-3 px-1">
                  {editSportId === sport.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editSportName} onChange={(e) => setEditSportName(e.target.value)} className="h-8 text-[13px] flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveSport()} autoFocus />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={handleSaveSport}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditSportId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] font-medium text-foreground">{sport.sport_name}</span>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditSportId(sport.id); setEditSportName(sport.sport_name); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteSportTarget(sport)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(sports as any[]).length === 0 && (
                <p className="text-[13px] text-muted-foreground py-6 text-center">אין ענפי ספורט — הוסף את הראשון</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* SUBJECTS TAB */}
        <TabsContent value="subjects">
          <div className="card-premium p-5 space-y-4">
            <div className="flex gap-2">
              <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="שם מקצוע חדש..." className="h-9 text-[13px] flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddSubject()} />
              <Button size="sm" onClick={handleAddSubject} className="gap-1.5 h-9">
                <Plus className="h-3.5 w-3.5" /> הוסף
              </Button>
            </div>
            <div className="divide-y divide-border">
              {(subjects as any[]).map((subj) => (
                <div key={subj.id} className="flex items-center justify-between py-3 px-1">
                  {editSubjectId === subj.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} className="h-8 text-[13px] flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveSubject()} autoFocus />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={handleSaveSubject}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditSubjectId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] font-medium text-foreground">{subj.subject_name}</span>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditSubjectId(subj.id); setEditSubjectName(subj.subject_name); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteSubjectTarget(subj)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(subjects as any[]).length === 0 && (
                <p className="text-[13px] text-muted-foreground py-6 text-center">אין מקצועות — הוסף את הראשון</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* CLASSES TAB */}
        <TabsContent value="classes">
          <div className="card-premium p-5 space-y-4">
            <div className="flex gap-2">
              <Input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="שם כיתה חדשה..." className="h-9 text-[13px] flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddClass()} />
              <Button size="sm" onClick={handleAddClass} className="gap-1.5 h-9">
                <Plus className="h-3.5 w-3.5" /> הוסף
              </Button>
            </div>
            <div className="divide-y divide-border">
              {classes.map((cls, idx) => (
                <div key={cls + idx} className="flex items-center justify-between py-3 px-1">
                  {editClassIdx === idx ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editClassName} onChange={(e) => setEditClassName(e.target.value)} className="h-8 text-[13px] flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveClass()} autoFocus />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={handleSaveClass}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditClassIdx(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] font-medium text-foreground">{cls}</span>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditClassIdx(idx); setEditClassName(cls); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteClass(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!deleteSportTarget}
        onClose={() => setDeleteSportTarget(null)}
        onConfirm={handleDeleteSport}
        title="מחיקת ענף ספורט"
        description={`האם למחוק את "${deleteSportTarget?.sport_name}"? אם יש ספורטאים משויכים, הפעולה תיכשל.`}
        confirmLabel="מחק"
        destructive
      />
      <ConfirmDialog
        open={!!deleteSubjectTarget}
        onClose={() => setDeleteSubjectTarget(null)}
        onConfirm={handleDeleteSubject}
        title="מחיקת מקצוע לימוד"
        description={`האם למחוק את "${deleteSubjectTarget?.subject_name}"? כל רשומות ההתקדמות ומפות הדרכים הקשורות יימחקו.`}
        confirmLabel="מחק"
        destructive
      />
    </div>
  );
};

export default DataManagementPage;
