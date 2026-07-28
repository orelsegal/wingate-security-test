import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, Pencil, Trash2, Check, X, Dumbbell, BookOpen, GraduationCap, MoreHorizontal, AlertCircle, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSports, useSubjects, useStudents } from "@/hooks/useStudents";
import { useUiLabels } from "@/context/UiLabelsContext";
import ConfirmDialog from "@/components/ConfirmDialog";

const DM_TAB_KEY = "maslul_dm_tab";
const TAB_IDS = ["sports", "subjects", "classes"] as const;
type DmTab = (typeof TAB_IDS)[number];

const NO_CLASS_LABEL = "ללא כיתה";

/* Academic class ordering: ז → יב by grade, then class number; unknown
   labels after the known grades (alphabetical); "ללא כיתה" last.
   Labels themselves are never rewritten — sorting only. */
const GRADE_PREFIXES: [string, number][] = [["יב", 5], ["יא", 4], ["י", 3], ["ט", 2], ["ח", 1], ["ז", 0]];
const classSortKey = (label: string): [number, number, number, string] => {
  if (label === NO_CLASS_LABEL) return [2, 0, 0, label];
  const clean = label.replace(/['"׳״]/g, "").trim();
  for (const [prefix, order] of GRADE_PREFIXES) {
    if (clean.startsWith(prefix)) {
      const rest = clean.slice(prefix.length).trim();
      const num = parseInt(rest, 10);
      return [0, order, Number.isNaN(num) ? 999 : num, label];
    }
  }
  return [1, 0, 0, label];
};
const compareClasses = (a: string, b: string) => {
  const ka = classSortKey(a), kb = classSortKey(b);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (ka[1] !== kb[1]) return ka[1] - kb[1];
  if (ka[2] !== kb[2]) return ka[2] - kb[2];
  return ka[3].localeCompare(kb[3], "he");
};

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
/* Usage-count cell states: skeleton while loading, explicit "not
   available" on error — never a misleading 0 */
const UsageSkeleton = () => <span className="inline-block h-3 w-24 rounded bg-muted animate-pulse" aria-label="טוען" />;
const USAGE_UNAVAILABLE = "הנתון לא זמין";
/* Small inline banner when only the usage counts failed (names still shown) */
const CountsErrorBanner = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex items-center justify-between gap-2 bg-muted/40 border border-border/60 rounded-lg px-3 py-2 mb-2">
    <span className="text-[12px] text-muted-foreground">ספירת השימוש נכשלה</span>
    <Button size="sm" variant="outline" className="h-7 text-[11.5px]" onClick={onRetry}>ניסיון חוזר</Button>
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

  // ── Usage sources (read-only) ──
  // Sports + classes derive from the students list that is already
  // fetched for this page — zero extra queries, counted in memory.
  const { data: allStudents = [], isLoading: loadingStudents, error: studentsError, refetch: refetchStudents } = useStudents();

  const sportCounts = useMemo(() => {
    const m = new Map<string, number>();
    (allStudents as any[]).forEach((s) => {
      const sp = (s.sport || "").trim();
      if (sp) m.set(sp, (m.get(sp) || 0) + 1);
    });
    return m;
  }, [allStudents]);

  const classRows = useMemo(() => {
    const m = new Map<string, number>();
    (allStudents as any[]).forEach((s) => {
      const c = (s.class_name || "").trim() || NO_CLASS_LABEL;
      m.set(c, (m.get(c) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => compareClasses(a[0], b[0]));
  }, [allStudents]);

  // Subject usage: two id-only reads (no student fields, no per-row
  // queries, no RPC); counts computed in memory.
  const progressIdsQ = useQuery({
    queryKey: ["dm-progress-subject-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_subject_progress").select("subject_id");
      if (error) throw error;
      return (data || []) as { subject_id: string }[];
    },
  });
  const roadmapIdsQ = useQuery({
    queryKey: ["dm-roadmap-subject-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subject_roadmaps").select("subject_id");
      if (error) throw error;
      return (data || []) as { subject_id: string }[];
    },
  });
  const subjectUsage = useMemo(() => {
    const prog = new Map<string, number>();
    (progressIdsQ.data || []).forEach((r) => prog.set(r.subject_id, (prog.get(r.subject_id) || 0) + 1));
    const road = new Map<string, number>();
    (roadmapIdsQ.data || []).forEach((r) => road.set(r.subject_id, (road.get(r.subject_id) || 0) + 1));
    return { prog, road };
  }, [progressIdsQ.data, roadmapIdsQ.data]);
  const subjectCountsLoading = progressIdsQ.isLoading || roadmapIdsQ.isLoading;
  const subjectCountsError = !!(progressIdsQ.error || roadmapIdsQ.error);
  const retrySubjectCounts = () => { progressIdsQ.refetch(); roadmapIdsQ.refetch(); };

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
  const colHeader = "hidden sm:grid sm:grid-cols-[1fr_220px_88px] sm:items-center gap-2 px-2 pb-2 border-b border-border text-[11px] font-medium text-muted-foreground";
  const rowGrid = "px-2 py-2.5 min-h-[44px] flex items-center justify-between gap-2 sm:grid sm:grid-cols-[1fr_220px_88px] sm:items-center";

  /* usage cell for a sport: skeleton → unavailable → count / not-in-use */
  const sportUsage = (name: string) => {
    if (loadingStudents) return <UsageSkeleton />;
    if (studentsError) return <span className="text-[12px] text-muted-foreground">{USAGE_UNAVAILABLE}</span>;
    const n = sportCounts.get(name) || 0;
    return n > 0
      ? <span className="text-[12px] text-muted-foreground tabular-nums">{n === 1 ? "ספורטאי אחד" : `${n} ספורטאים`}</span>
      : <span className="text-[12px] text-muted-foreground/70">לא בשימוש</span>;
  };

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
            <span className="truncate">כיתות ({classRows.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* SPORTS TAB — creation card, then a usage-transparent list */}
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
            {!!studentsError && <CountsErrorBanner onRetry={() => refetchStudents()} />}
            <div className={colHeader}>
              <span>ענף ספורט</span>
              <span>שימוש במערכת</span>
              <span>פעולות</span>
            </div>
            <div className="divide-y divide-border">
              {(sports as any[]).map((sport) => {
                const inUseCount = !loadingStudents && !studentsError ? (sportCounts.get(sport.sport_name) || 0) : null;
                return (
                <div key={sport.id} className={rowGrid}>
                  {editSportId === sport.id ? (
                    <div className="flex items-center gap-2 flex-1 sm:col-span-3">
                      <Input value={editSportName} onChange={(e) => setEditSportName(e.target.value)} className="h-8 text-[13px] flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveSport()} autoFocus disabled={savingSport} />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={handleSaveSport} disabled={savingSport} title="שמירה">
                        {savingSport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => setEditSportId(null)} title="ביטול"><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium text-foreground">{sport.sport_name}</span>
                        <div className="sm:hidden mt-0.5">{sportUsage(sport.sport_name)}</div>
                      </div>
                      <div className="hidden sm:block">{sportUsage(sport.sport_name)}</div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7" title="שינוי שם"
                          onClick={() => { setEditSportId(sport.id); setEditSportName(sport.sport_name); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7" title="פעולות נוספות" aria-label={`פעולות נוספות עבור ${sport.sport_name}`}>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          {/* !animate-none: the menu's visibility must not depend on
                              the 150ms enter animation. When CSS animations are
                              frozen (hidden/occluded window, OS throttling), an
                              animation-gated menu stays mounted at opacity 0 —
                              "open" but invisible — which users experience as the
                              button doing nothing. Verified in a real browser. */}
                          <DropdownMenuContent align="end" className="!animate-none">
                            {/* FAIL-CLOSED: there is NO server-side in-use guard for
                                sports (RLS only gates who deletes; students.sport is
                                plain TEXT, no FK/trigger/RPC). The in-use check is
                                client-side, so delete is offered ONLY when the count
                                is known — never as a fallback while it is unknown.
                                Explanations are non-interactive Labels, not disabled
                                menu items: a message is not an action. */}
                            {loadingStudents ? (
                              <DropdownMenuLabel className="text-[12px] font-normal text-muted-foreground">
                                טוען נתוני שימוש...
                              </DropdownMenuLabel>
                            ) : studentsError ? (
                              <>
                                <DropdownMenuLabel className="text-[12px] font-normal text-muted-foreground max-w-[240px] whitespace-normal leading-snug">
                                  לא ניתן לבדוק אם הענף נמצא בשימוש. נסי שוב לפני מחיקה.
                                </DropdownMenuLabel>
                                <DropdownMenuItem className="text-[12.5px]" onClick={() => refetchStudents()}>
                                  ניסיון חוזר
                                </DropdownMenuItem>
                              </>
                            ) : (inUseCount as number) > 0 ? (
                              /* in-use: the delete ACTION stays visible but disabled,
                                 with the explanation under it. A text-only bubble was
                                 read as "the menu did not open" (production QA
                                 finding). The client-side pre-delete check in
                                 handleDeleteSport stays as an extra safety net. */
                              <>
                                <DropdownMenuItem disabled className="text-[12.5px] gap-2">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  מחיקת ענף
                                </DropdownMenuItem>
                                <DropdownMenuLabel className="text-[11.5px] font-normal text-muted-foreground max-w-[240px] whitespace-normal leading-snug pt-0">
                                  לא ניתן למחוק. משויך ל{inUseCount === 1 ? "ספורטאי אחד" : `־${inUseCount} ספורטאים`}
                                </DropdownMenuLabel>
                              </>
                            ) : (
                              <DropdownMenuItem className="text-[12.5px] gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteSportTarget(sport)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                מחיקת ענף
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  )}
                </div>
              );})}
              {(sports as any[]).length === 0 && (
                <p className="text-[13px] text-muted-foreground py-8 text-center">אין ענפי ספורט. הוסיפי את הראשון.</p>
              )}
            </div>
          </div>
          </>)}
        </TabsContent>

        {/* SUBJECTS TAB — add + rename only; usage columns; deletion blocked (2C.0a) */}
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
            {subjectCountsError && <CountsErrorBanner onRetry={retrySubjectCounts} />}
            <div className={colHeader}>
              <span>מקצוע</span>
              <span>שימוש במערכת</span>
              <span>פעולות</span>
            </div>
            <div className="divide-y divide-border">
              {(subjects as any[]).map((subj) => {
                const usage = subjectCountsLoading
                  ? <UsageSkeleton />
                  : subjectCountsError
                    ? <span className="text-[12px] text-muted-foreground">{USAGE_UNAVAILABLE}</span>
                    : <span className="text-[12px] text-muted-foreground tabular-nums">
                        {(subjectUsage.prog.get(subj.id) || 0)} רשומות התקדמות · {(subjectUsage.road.get(subj.id) || 0)} פריטי מפת דרך
                      </span>;
                return (
                <div key={subj.id} className={rowGrid}>
                  {editSubjectId === subj.id ? (
                    <div className="flex items-center gap-2 flex-1 sm:col-span-3">
                      <Input value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} className="h-8 text-[13px] flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleSaveSubject()} autoFocus disabled={savingSubject} />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={handleSaveSubject} disabled={savingSubject} title="שמירה">
                        {savingSubject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => setEditSubjectId(null)} title="ביטול"><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium text-foreground">{subj.subject_name}</span>
                        <div className="sm:hidden mt-0.5">{usage}</div>
                      </div>
                      <div className="hidden sm:block">{usage}</div>
                      <div className="shrink-0">
                        <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7" title="שינוי שם"
                          onClick={() => { setEditSubjectId(subj.id); setEditSubjectName(subj.subject_name); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );})}
              {(subjects as any[]).length === 0 && (
                <p className="text-[13px] text-muted-foreground py-8 text-center">אין מקצועות. הוסיפי את הראשון.</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 bg-success/10 border border-success/25 rounded-xl px-4 py-3">
            <ShieldCheck className="h-[18px] w-[18px] text-success shrink-0 mt-0.5" strokeWidth={1.8} />
            <div>
              <p className="text-[12.5px] font-semibold text-foreground">נתוני התלמידים מוגנים</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                מחיקת מקצוע אינה זמינה כאשר קיימים נתוני התקדמות או פריטי מפת דרך. מנגנון ארכוב ושחזור יתווסף בהמשך.
              </p>
            </div>
          </div>
          </>)}
        </TabsContent>

        {/* CLASSES TAB — read-only, derived from students.class_name,
            academic ordering (ז..יב, then unknown, then ללא כיתה) */}
        <TabsContent value="classes" className="space-y-4">
          {loadingStudents ? <TabLoading /> : studentsError ? <TabError onRetry={() => refetchStudents()} /> : (<>
          <div className="card-premium p-4 sm:p-5">
            <div className="max-w-md">
              <div className="grid grid-cols-[1fr_120px] gap-2 pb-2 border-b border-border text-[11px] font-medium text-muted-foreground">
                <span>כיתה</span>
                <span>מספר תלמידים</span>
              </div>
              <div className="divide-y divide-border">
                {classRows.map(([cls, count]) => (
                  <div key={cls} className="grid grid-cols-[1fr_120px] gap-2 items-center py-2.5 min-h-[40px]">
                    <span className={`text-[13px] font-medium ${cls === NO_CLASS_LABEL ? "text-muted-foreground" : "text-foreground"}`}>{cls}</span>
                    <span className="text-[12px] text-muted-foreground tabular-nums">{count}</span>
                  </div>
                ))}
                {classRows.length === 0 && (
                  <p className="text-[13px] text-muted-foreground py-8 text-center">אין עדיין כיתות בנתוני התלמידים.</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-muted/40 border border-border/60 rounded-xl px-4 py-3">
            <Info className="h-[18px] w-[18px] text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.8} />
            <div>
              <p className="text-[12.5px] font-semibold text-foreground">רשימה לקריאה בלבד</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                הכיתות נגזרות מנתוני התלמידים. ניהול כיתות יתווסף לאחר הגדרת מודל שנתי מסודר.
              </p>
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
        description={
          deleteSportTarget && !loadingStudents && !studentsError && (sportCounts.get(deleteSportTarget.sport_name) || 0) === 0
            ? `הענף "${deleteSportTarget.sport_name}" אינו משויך לספורטאים ויימחק לצמיתות.`
            : `האם למחוק את "${deleteSportTarget?.sport_name}"? אם יש ספורטאים משויכים, הפעולה תיכשל.`
        }
        confirmLabel="מחק"
        destructive
      />
    </div>
  );
};

export default DataManagementPage;
