import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStudents, useSubjects, useAllStudentProgress } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Loader2, Save, CheckCircle2, Users as UsersIcon } from "lucide-react";

type RowState = {
  grade: string;
  completion: string;
  status: "green" | "yellow" | "red";
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  existingId: string | null;
};

const statusColor: Record<string, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
};
const statusLabel: Record<string, string> = {
  green: "במסלול",
  yellow: "פערים",
  red: "בסיכון",
};

const GradeEntryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: students = [], isLoading: ls } = useStudents();

  useEffect(() => {
    if (user && (user.role === "coach" || user.role === "parent" || user.role === "student"))
      navigate("/", { replace: true });
  }, [user, navigate]);
  const { data: subjects = [], isLoading: lsub } = useSubjects();
  const { data: allProgress = [] } = useAllStudentProgress();
  const queryClient = useQueryClient();

  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const classes = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.class_name && set.add(s.class_name));
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(
    () => students.filter((s) => classFilter === "all" || s.class_name === classFilter),
    [students, classFilter]
  );

  useEffect(() => {
    if (!selectedSubjectId) {
      setRows({});
      return;
    }
    const next: Record<string, RowState> = {};
    filteredStudents.forEach((s) => {
      const existing = (allProgress as any[]).find(
        (p) => p.student_id === s.id && p.subject_id === selectedSubjectId
      );
      next[s.id] = {
        grade: existing?.grade != null ? String(existing.grade) : "",
        completion: existing?.completion_percent != null ? String(existing.completion_percent) : "0",
        status: (existing?.status as any) || "green",
        dirty: false,
        saving: false,
        saved: false,
        existingId: existing?.id ?? null,
      };
    });
    setRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, filteredStudents.length, (allProgress as any[]).length]);

  const updateRow = (id: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch, dirty: true, saved: false } }));

  const saveRow = async (studentId: string) => {
    const r = rows[studentId];
    if (!r || !selectedSubjectId) return;
    setRows((p) => ({ ...p, [studentId]: { ...p[studentId], saving: true } }));
    try {
      const payload = {
        grade: r.grade ? parseFloat(r.grade) : null,
        completion_percent: parseInt(r.completion) || 0,
        status: r.status,
      };
      let newId = r.existingId;
      if (r.existingId) {
        const { error } = await supabase
          .from("student_subject_progress")
          .update(payload)
          .eq("id", r.existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("student_subject_progress")
          .insert({ student_id: studentId, subject_id: selectedSubjectId, ...payload })
          .select("id")
          .single();
        if (error) throw error;
        newId = data?.id ?? null;
      }
      setRows((p) => ({
        ...p,
        [studentId]: { ...p[studentId], saving: false, saved: true, dirty: false, existingId: newId },
      }));
      queryClient.invalidateQueries({ queryKey: ["all-student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setTimeout(() => {
        setRows((p) => (p[studentId] ? { ...p, [studentId]: { ...p[studentId], saved: false } } : p));
      }, 2000);
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
      setRows((p) => ({ ...p, [studentId]: { ...p[studentId], saving: false } }));
    }
  };

  const saveAllDirty = async () => {
    const ids = Object.entries(rows).filter(([, r]) => r.dirty).map(([id]) => id);
    if (!ids.length) {
      toast.info("אין שינויים לשמירה");
      return;
    }
    for (const id of ids) await saveRow(id);
    toast.success(`נשמרו ${ids.length} רשומות`);
  };

  const dirtyCount = Object.values(rows).filter((r) => r.dirty).length;

  if (ls || lsub) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  const selectedSubject = subjects?.find((s) => s.id === selectedSubjectId);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" strokeWidth={1.5} />
          הזנת ציונים
        </h1>
        <p className="text-sm text-muted-foreground">
          בחר/י מקצוע, ראה/י את כל הספורטאים בו, והזן/י ציונים ישירות בטבלה
        </p>
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">מקצוע</Label>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger><SelectValue placeholder="בחר מקצוע..." /></SelectTrigger>
              <SelectContent>
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">כיתה (סינון)</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הכיתות</SelectItem>
                {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={saveAllDirty}
              disabled={!dirtyCount}
              className="gap-2 w-full"
              size="lg"
            >
              <Save className="h-4 w-4" />
              שמור הכל {dirtyCount ? `(${dirtyCount})` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedSubjectId ? (
        <Card className="card-premium overflow-hidden">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-semibold">
                  {selectedSubject?.subject_name} · {filteredStudents.length} ספורטאים
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" />במסלול</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" />פערים</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />בסיכון</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם ספורטאי</TableHead>
                  <TableHead className="text-right">כיתה</TableHead>
                  <TableHead className="text-right">ענף</TableHead>
                  <TableHead className="text-right w-[110px]">ציון</TableHead>
                  <TableHead className="text-right w-[120px]">% השלמה</TableHead>
                  <TableHead className="text-right w-[230px]">סטטוס</TableHead>
                  <TableHead className="text-right w-[110px]">פעולה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((s) => {
                  const r = rows[s.id];
                  if (!r) return null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.class_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.sport}</TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0} max={100}
                          value={r.grade}
                          onChange={(e) => updateRow(s.id, { grade: e.target.value })}
                          className="h-9 text-center"
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0} max={100}
                          value={r.completion}
                          onChange={(e) => updateRow(s.id, { completion: e.target.value })}
                          className="h-9 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(["green", "yellow", "red"] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => updateRow(s.id, { status: st })}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition-all ${
                                r.status === st
                                  ? "border-primary/40 bg-primary/5 text-foreground"
                                  : "border-border text-muted-foreground hover:bg-accent"
                              }`}
                              title={statusLabel[st]}
                            >
                              <span className={`w-2 h-2 rounded-full ${statusColor[st]}`} />
                              {statusLabel[st]}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={r.dirty ? "default" : "outline"}
                          disabled={r.saving || (!r.dirty && !r.saved)}
                          onClick={() => saveRow(s.id)}
                          className="gap-1.5 w-full"
                        >
                          {r.saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : r.saved ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          {r.saved ? "נשמר" : "שמור"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredStudents.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      אין ספורטאים בכיתה זו
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-premium">
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            בחר/י מקצוע מלמעלה כדי להתחיל בהזנת ציונים
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GradeEntryPage;
