/**
 * BuilderWorkspacePage — full-screen Admin Builder for the athlete profile.
 *
 * Layout:
 *   ┌─ Top Bar ─────────────────────────────────────────────────────────┐
 *   │ Title · Student picker · Preview-as-role · Save draft · Publish · Exit │
 *   ├─ Left Rail ─────┬─ Canvas (StudentProfilePage live) ──────────────┤
 *   │ Blocks          │                                                  │
 *   │ Structure       │       (rendered with draft layout + role lens)   │
 *   │ Danger zone     │                                                  │
 *   └─────────────────┴──────────────────────────────────────────────────┘
 *
 * Only admins are admitted; everyone else is bounced to "/".
 */
import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth, roleLabels, type UserRole } from "@/context/AuthContext";
import { useBuilder, ALL_ROLES } from "@/context/BuilderContext";
import { useStudents } from "@/hooks/useStudents";
import StudentProfilePage from "@/pages/StudentProfilePage";
import { BuilderWorkspaceRail } from "@/components/builder/BuilderWorkspaceRail";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Save, Send, Undo2, X, Eye } from "lucide-react";

const BuilderWorkspacePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const { data: students = [] } = useStudents();
  const b = useBuilder();

  // Enter / exit builder mode (hook must run before any conditional return)
  useEffect(() => {
    b.enterBuilder();
    return () => b.exitBuilder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studentId = useMemo(() => routeId || students[0]?.id || "", [routeId, students]);

  // Admin only
  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const switchStudent = (id: string) => navigate(`/admin/builder/profile/${id}`, { replace: true });

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col" dir="rtl">
      {/* ── Top Bar ── */}
      <header className="h-14 shrink-0 border-b bg-card flex items-center gap-3 px-4">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="text-[14px]">בונה פרופיל ספורטאי</span>
          {b.isDirty && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-warning/15 text-warning border border-warning/30">
              טיוטה לא מפורסמת
            </span>
          )}
          {b.saving && <span className="text-[11px] text-muted-foreground">שומר…</span>}
        </div>

        <div className="flex-1" />

        {/* Student picker */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">צפייה על:</span>
          <Select value={studentId} onValueChange={switchStudent}>
            <SelectTrigger className="h-8 w-[200px] text-[12px]"><SelectValue placeholder="בחר ספורטאי" /></SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-[12px]">{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview-as-role */}
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={b.previewRole ?? "__none"}
            onValueChange={(v) => b.setPreviewRole(v === "__none" ? null : (v as UserRole))}
          >
            <SelectTrigger className="h-8 w-[150px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none" className="text-[12px]">תצוגת מנהל</SelectItem>
              {ALL_ROLES.filter((r) => r !== "admin").map((r) => (
                <SelectItem key={r} value={r} className="text-[12px]">תצוגה כ{roleLabels[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1"
            disabled={!b.isDirty}
            onClick={() => confirm("לבטל את כל השינויים בטיוטה?") && b.discardDraft()}>
            <Undo2 className="h-3.5 w-3.5" /> בטל טיוטה
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1"
            onClick={() => b.saveDraft()}>
            <Save className="h-3.5 w-3.5" /> שמור טיוטה
          </Button>
          <Button size="sm" className="h-8 text-[12px] gap-1"
            disabled={!b.isDirty}
            onClick={() => confirm("לפרסם את השינויים לכלל המשתמשים?") && b.publish()}>
            <Send className="h-3.5 w-3.5" /> פרסם
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1"
            onClick={() => navigate("/")}>
            <X className="h-3.5 w-3.5" /> יציאה
          </Button>
        </div>
      </header>

      {/* ── Body: Rail + Canvas ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <BuilderWorkspaceRail />

        <main className="flex-1 overflow-auto bg-muted/30">
          {studentId ? (
            <div className="mx-auto max-w-[1200px] my-4 bg-background rounded-xl shadow-sm border">
              {/* Render the actual profile as canvas. StudentProfilePage reads
                  useParams() for :id, so we just remount on switch via key. */}
              <CanvasProfile key={studentId} studentId={studentId} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-[13px]">
              אין ספורטאים זמינים לתצוגה
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

/**
 * StudentProfilePage uses useParams(). Inside the workspace we mount it
 * under a wrapper that exposes the chosen id via the route. Simpler approach:
 * render through a synthetic Route. To avoid restructuring, we just navigate
 * to /admin/builder/profile/:id so useParams returns the right value.
 */
const CanvasProfile = ({ studentId }: { studentId: string }) => {
  // StudentProfilePage already uses useParams; the route is /admin/builder/profile/:id
  // so this just renders the page. No extra wiring needed.
  return <StudentProfilePage />;
};

export default BuilderWorkspacePage;
