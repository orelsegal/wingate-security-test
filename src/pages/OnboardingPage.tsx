import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WingateBadge from "@/components/WingateBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AppRole = "admin" | "teacher" | "student" | "parent" | "coach";

const ROLE_REDIRECT: Record<AppRole, string> = {
  admin: "/",
  teacher: "/",
  coach: "/",
  parent: "/",
  student: "/student-home",
};

type Status = "waiting" | "setting-up" | "set-password" | "done" | "no-invite" | "error";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("waiting");
  const [userName, setUserName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [roleRedirect, setRoleRedirect] = useState<string>("/");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  // One-shot guard: the auth listener fires multiple events during magic-link
  // processing (SIGNED_IN / INITIAL_SESSION / TOKEN_REFRESHED); handle only the
  // first one that carries a session, ignore the rest.
  const handledRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Wait for an active session (either SIGNED_IN or INITIAL_SESSION with a user)
      if (!session?.user) return;
      if (handledRef.current) return;
      handledRef.current = true;

      setStatus("setting-up");

      const userId = session.user.id;
      const email = (session.user.email ?? "").toLowerCase().trim();

      // Defer all Supabase calls out of the auth callback — supabase-js holds an
      // internal auth lock while onAuthStateChange callbacks run, and awaiting
      // client calls inside it can deadlock (same workaround as AuthContext).
      setTimeout(async () => {
      // אם למשתמש כבר יש role — לא צריך onboarding, פשוט תעביר
      const { data: existingRolesCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (existingRolesCheck && existingRolesCheck.length > 0) {
        const existingRole = existingRolesCheck[0].role as AppRole;
        const target = ROLE_REDIRECT[existingRole] ?? "/";
        navigate(target);
        return;
      }

      try {
        // Claim the admin-created invite server-side (SECURITY DEFINER function).
        // Role + links come ONLY from the admin-only pending_invites row matched
        // to this user's verified email — the client cannot influence the role.
        const { data: claimData, error: claimErr } = await (supabase.rpc as any)("claim_pending_invite");
        if (claimErr) throw claimErr;

        const claim = claimData as { status: string; role?: AppRole; full_name?: string | null };

        if (claim?.status === "no_invite" || claim?.status === "invite_expired") {
          // No silent fallback role — an honest message instead
          setErrorMsg(claim.status === "invite_expired"
            ? "ההזמנה שקיבלת פגה תוקף. בקש/י מהמנהל לשלוח הזמנה חדשה."
            : "לא נמצאה הזמנה עבור המייל הזה. פנה/י למנהל המערכת.");
          setStatus("no-invite");
          return;
        }

        if (claim?.status === "already_has_role") {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
          const existingRole = roles?.[0]?.role as AppRole | undefined;
          navigate(existingRole ? (ROLE_REDIRECT[existingRole] ?? "/") : "/login");
          return;
        }

        if (claim?.status !== "claimed" || !claim.role) {
          throw new Error("תשובה לא צפויה מהשרת");
        }

        setUserName(claim.full_name || session.user.user_metadata?.full_name || email);
        setRoleRedirect(ROLE_REDIRECT[claim.role] ?? "/");
        setStatus("set-password");
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message
          : (typeof err === "object" && err !== null && "message" in err) ? String((err as { message: unknown }).message)
          : "שגיאה לא ידועה";
        setErrorMsg(msg);
        setStatus("error");
      }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (password.length < 6) { setPasswordError("הסיסמה חייבת להיות לפחות 6 תווים"); return; }
    if (password !== passwordConfirm) { setPasswordError("הסיסמאות אינן תואמות"); return; }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordLoading(false);
    if (error) { setPasswordError("שגיאה: " + error.message); return; }
    setStatus("done");
    setTimeout(() => navigate(roleRedirect), 2000);
  };

  const skipPassword = () => {
    setStatus("done");
    setTimeout(() => navigate(roleRedirect), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-[400px] px-6">
        <div className="flex justify-center mb-7">
          <WingateBadge size="lg" />
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-[var(--shadow-card)] p-8 text-center space-y-4">
          {status === "set-password" ? (
            <form onSubmit={handleSetPassword} className="space-y-4 text-right">
              <p className="text-[18px] font-bold text-foreground">ברוך הבא/ה, {userName}! 👋</p>
              <p className="text-[13px] text-muted-foreground">הגדר/י סיסמה לכניסות הבאות — כך לא תצטרך/י קישור בכל פעם.</p>
              <div className="space-y-1.5">
                <Label className="text-[13px]">סיסמה</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="לפחות 6 תווים"
                    dir="ltr"
                    className="text-left pl-10"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">אימות סיסמה</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  placeholder="הכנס/י שוב"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              {passwordError && <p className="text-[12px] text-destructive">{passwordError}</p>}
              <button
                type="submit"
                disabled={passwordLoading || !password || !passwordConfirm}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-[14px] font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור סיסמה וכנס למערכת"}
              </button>
              <button type="button" onClick={skipPassword} className="w-full text-[12px] text-muted-foreground hover:text-foreground">
                דלג — אכנס עם קישור בכל פעם
              </button>
            </form>
          ) : status === "waiting" || status === "setting-up" ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-[15px] font-semibold text-foreground">
                {status === "waiting" ? "מאמת את הקישור..." : "מגדיר/ה את החשבון שלך..."}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {status === "waiting"
                  ? "אם זה לוקח הרבה זמן, ייתכן שהקישור פג תוקף"
                  : "זה ייקח שנייה. אנחנו מכינים הכל עבורך."}
              </p>
            </>
          ) : status === "done" ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="text-[18px] font-bold text-foreground">ברוך הבא/ה, {userName}! 🎉</p>
              <p className="text-[13px] text-muted-foreground">החשבון שלך מוכן. מעביר/ה אותך למערכת...</p>
            </>
          ) : status === "no-invite" ? (
            <>
              <p className="text-[28px]">🤔</p>
              <p className="text-[15px] font-semibold text-foreground">לא נמצאו פרטי הזמנה</p>
              <p className="text-[12px] text-muted-foreground">
                {errorMsg || "נראה שאתה כבר רשום/ה, או שפרטי ההזמנה לא נמצאו. פנה/י למנהל המערכת."}
              </p>
              <button onClick={() => navigate("/login")} className="text-[13px] text-primary hover:underline">
                חזרה לדף ההתחברות
              </button>
            </>
          ) : (
            <>
              <p className="text-[28px]">⚠️</p>
              <p className="text-[15px] font-semibold text-foreground">אירעה שגיאה בהגדרת החשבון</p>
              <p className="text-[12px] text-muted-foreground">{errorMsg}</p>
              <p className="text-[12px] text-muted-foreground">פנה/י למנהל המערכת לעזרה.</p>
              <button onClick={() => navigate("/login")} className="text-[13px] text-primary hover:underline">
                חזרה לדף ההתחברות
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
