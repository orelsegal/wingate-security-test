import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, Pencil, Trash2, Check, X, Dumbbell, BookOpen, GraduationCap, MoreHorizontal, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSports, useSubjects, useStudents } from "@/hooks/useStudents";
import { useUiLabels } from "@/context/UiLabelsContext";
import ConfirmDialog from "@/components/ConfirmDialog";

const DM_TAB_KEY = "maslul_dm_tab";
const TAB_IDS = ["sports", "subjects", "classes"] as const;
type DmTab = (typeof TAB_IDS)[number];

/* In-content loading / error helpers so the header and tabs never vanish */
const TabLoading = () => (
  <div className="card-premium p-10 flex items-center justify-center">
    <Loader2 className="h-5 w-5 animate-spin text-primary" />
  </div>
);
const TabError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="card-premium p-8 flex flex-col items-center gap-3 text-center">
    <AlertCircle className="h-6 w-6 text-destructive" strokeWidth={1.6} />
    <p className="text-[13px] text-foreground">הטעינה נכשלה</p>
    <Button size="sm" variant="outline" onClick={onRetry}>ניסיון חוזר</Button>
  </div>
);

const DataManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { labels } = useUiLabels();

  useEffect(() => {
    if (user && user.role !== "developer" && user.role !== "admin") navigate("/", { replace: true });
  }, [user, navigate]);

  const { data: sports = [], isLoading: loadingSports, error: sportsError, refetch: refetchSports } = useSports();
  const { data: subjects = [], isLoading: loadingSubjects, error: subjectsError, refetch: refetchSubjects } = useSubjects();

  // Active tab survives refresh (sessionStorage, no route change)
  const [tab, setTab] = useState<DmTab>(() => {
    try {
      const t = sessionStorage.getItem(DM_TAB_KEY);
      return TAB_IDS.includes(t as DmTab) ? (t as DmTab) : "sports";
    } catch { return "sports"; }
  });
  const changeTab = (t: string) => {
    setTab(t as DmTab);
    try { sessionStorage.setItem(DM_TAB_KEY, t); } catch { /* storage unavailable */ }
  };

  // Sports state
  const [newSport, setNewSport] = useState("");
  const [addingSport, setAddingSport] = useState(false);
  const [editSportId, setEditSportId] = useState<string | null>(null);
  const [editSportName, setEditSportName] = useState("");
  const [savingSport, setSavingSport] = useState(false);
  const [deleteSportTarget, setDeleteSportTarget] = useState<any>(null);

  // Subjects state (delete intentionally absent — Phase 2C.0a containment:
  // subject deletion is fully blocked, server-side included, until archive)
  const [newSubject, setNewSubject] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [savingSubject, setSavingSubject] = useState(false);

  // Classes are READ-ONLY: real values derived from students.class_name
  const { data: allStudents = [], isLoading: loadingStudents, error: studentsError, refetch: refetchStudents } = useStudents();
  const classes = Array.from(
    new Set((allStudents as any[]).map((s) => (s.class_name || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "he"));

  // === SPORTS CRUD (business behavior unchanged; saving guards only) ===
  const handleAddSport = async () => {
    const name = newSport.trim();
    if (!name || addingSport) return;
    setAddingSport(true);
    try {
      const { error } = await supabase.from("sports").insert({ sport_name: name });
      if (error) { toast.error("שגיאה: " + error.message); return; }
      toast.success(`"${name}" נוסף`);
      setNewSport("");
      queryClient.invalidateQueries({ queryKey: ["sports"] });
    } finally { setAddingSport(false); }
  };

  const handleSaveSport = async () => {
    if (!editSportId || !editSportName.trim() || savingSport) return;
    setSavingSport(true);
    try {
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
    } finally { setSavingSport(false); }
  };

  const handleDeleteSport = async () => {
    if (!deleteSportTarget) return;
    const { data: linked } = await supabase.from("students").select("id").eq("sport", deleteSportTarget.sport_name).limit(1);
    if (linked && linked.length > 0) {
      toast.error(`לא ניתן למחוק. יש ספורטאים משויכים ל"${deleteSportTarget.sport_name}"`);
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
    if (!name || addingSubject) return;
    setAddingSubject(true);
    try {
      const { error } = await supabase.from("subjects").insert({ subject_name: name });
      if (error) { toast.error("שגיאה: " + error.message); return; }
      toast.success(`"${name}" נוסף`);
      setNewSubject("");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    } finally { setAddingSubject(false); }
  };

  const handleSaveSubject = async () => {
    if (!editSubjectId || !editSubjectName.trim() || savingSubject) return;
    setSavingSubject(true);
    try {
      const { error } = await supabase.from("subjects").update({ subject_name: editSubjectName.trim() }).eq("id", editSubjectId);
      if (error) { toast.error("שגיאה: " + error.message); return; }
      toast.success("עודכן בהצלחה");
      setEditSubjectId(null);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["all-student-progress"] });
    } finally { setSavingSubject(false); }
  };

  const tabTrigger = "gap-1.5 px-1 text-[11.5px] sm:text-[12.5px] font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h2 className="text-xl md:text-[1.5rem] font-bold text-foreground tracking-tight">ניהול נתונים</h2>
        <p className="text-[13px] text-muted-foreground mt-1">ניהול ענפי ספורט, מקצועות לימוד ורשימת הכיתות הקיימות במערכת</p>
      </div>

      <Tabs value={tab} onValueChange={changeTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-3 mb-6 h-10">
          <TabsTrigger value="sports" className={tabTrigger}>
            <Dumbbell className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            <span className="truncate">ענפי ספורט ({(sports as any[]).length})</span>
          </TabsTrigger>
          <TabsTrigger value="subjects" className={tabTrigger}>
            <BookOpen className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            <span className="truncate">מקצועות לימוד ({(subjects as any[]).length})</span>
          </TabsTrigger>
          <TabsTrigger value="classes" className={tabTrigger}>
            <GraduationCap className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            <span className="truncate">כיתות ({classes.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* SPORTS TAB — creation card separate from the list; delete lives in ⋯ */}
        <TabsContent value="sports" className="space-y-4">
          {loadingSports ? <TabLoading /> : sportsError ? <TabError onRetry={() => refetchSports()} /> : (<>
          <div className="card-premium p-4 sm:p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">הוספת ענף ספורט</p>
            <div className="flex gap-2">
              <Input value={newSport} onChange={(e) => setNewSport(e.target.value)} placeholder="שם הענף..." className="h-10 text-[13px] flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddSport()} disabled={addingSport} />
              <Button onClick={handleAddSport} disabled={addingSport || !newSport.trim()} className="gap-1.5 h-10 px-4">
                {addingSport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} הוסף ענף
              </Button>
            </div>
          </div>
          <div className="card-premium p-2 sm:p-3">
            <div className="divide-y divide-border">
              {(sports as any[]).map((sport) => (
                <div key={sport.id} className="flex items-center justify-between gap-2 py-2.5 px-2 min-h-[44px]">
                  {editSportId === sport.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editSportName} onChange={(e) => setEditSportName(e.target.value)} className="h-8 text-[13px] flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveSport()} autoFocus disabled={savingSport} />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={handleSaveSport} disabled={savingSport} title="שמירה">
                        {savingSport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditSportId(null)} title="ביטול"><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] font-medium text-foreground">{sport.sport_name}</span>
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="שינוי שם"
                          onClick={() => { setEditSportId(sport.id); setEditSportName(sport.sport_name); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="פעולות נוספות" aria-label={`פעולות נוספות עבור ${sport.sport_name}`}>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-[12.5px] gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteSportTarget(sport)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              מחיקת ענף
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(sports as any[]).length === 0 && (
                <p className="text-[13px] text-muted-foreground py-8 text-center">אין ענפי ספורט. הוסיפי את הראשון.</p>
              )}
            </div>
          </div>
          </>)}
        </TabsContent>

        {/* SUBJECTS TAB — add + rename only; deletion blocked (2C.0a) */}
        <TabsContent value="subjects" className="space-y-4">
          {loadingSubjects ? <TabLoading /> : subjectsError ? <TabError onRetry={() => refetchSubjects()} /> : (<>
          <div className="card-premium p-4 sm:p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">הוספת מקצוע לימוד</p>
            <div className="flex gap-2">
              <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="שם המקצוע..." className="h-10 text-[13px] flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddSubject()} disabled={addingSubject} />
              <Button onClick={handleAddSubject} disabled={addingSubject || !newSubject.trim()} className="gap-1.5 h-10 px-4">
                {addingSubject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} הוסף מקצוע
              </Button>
            </div>
          </div>
          <div className="card-premium p-2 sm:p-3">
            <div className="divide-y divide-border">
              {(subjects as any[]).map((subj) => (
                <div key={subj.id} className="flex items-center justify-between gap-2 py-2.5 px-2 min-h-[44px]">
                  {editSubjectId === subj.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} className="h-8 text-[13px] flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveSubject()} autoFocus disabled={savingSubject} />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={handleSaveSubject} disabled={savingSubject} title="שמירה">
                        {savingSubject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditSubjectId(null)} title="ביטול"><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] font-medium text-foreground">{subj.subject_name}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="שינוי שם"
                        onClick={() => { setEditSubjectId(subj.id); setEditSubjectName(subj.subject_name); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {(subjects as any[]).length === 0 && (
                <p className="text-[13px] text-muted-foreground py-8 text-center">אין מקצועות. הוסיפי את הראשון.</p>
              )}
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground bg-muted/40 border border-border/60 rounded-xl px-3.5 py-2.5 leading-relaxed">
            מחיקת מקצוע אינה זמינה כדי להגן על נתוני התלמידים. מנגנון ארכוב ושחזור יתווסף בהמשך.
          </p>
          </>)}
        </TabsContent>

        {/* CLASSES TAB — read-only, derived from students.class_name */}
        <TabsContent value="classes" className="space-y-4">
          {loadingStudents ? <TabLoading /> : studentsError ? <TabError onRetry={() => refetchStudents()} /> : (<>
          <div className="card-premium p-4 sm:p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">כיתות במערכת</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              הרשימה נגזרת מנתוני התלמידים. ניהול כיתות יתווסף לאחר הגדרת מודל שנתי מסודר.
            </p>
            <div className="divide-y divide-border">
              {classes.map((cls) => (
                <div key={cls} className="flex items-center justify-between py-2.5 px-1 min-h-[44px]">
                  <span className="text-[13px] font-medium text-foreground">{cls}</span>
                  <span className="text-[11.5px] text-muted-foreground tabular-nums">
                    {(allStudents as any[]).filter((s) => (s.class_name || "").trim() === cls).length} תלמידים
                  </span>
                </div>
              ))}
              {classes.length === 0 && (
                <p className="text-[13px] text-muted-foreground py-8 text-center">אין עדיין כיתות בנתוני התלמידים.</p>
              )}
            </div>
          </div>
          </>)}
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
    </div>
  );
};

export default DataManagementPage;
