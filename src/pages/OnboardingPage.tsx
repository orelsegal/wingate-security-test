import { useEffect, useState } from "react";
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Wait for an active session (either SIGNED_IN or INITIAL_SESSION with a user)
      if (!session?.user) return;

      setStatus("setting-up");

      const userId = session.user.id;
      const email = (session.user.email ?? "").toLowerCase().trim();

      // Read pending invite data stored by the admin at invite time
      let inviteData: { full_name?: string; role?: AppRole; linked_sport?: string | null } | null = null;
      try {
        const stored = JSON.parse(localStorage.getItem("pending_invites") || "{}");
        inviteData = stored[email] ?? null;
      } catch { /* ignore parse errors */ }

      const fullName = inviteData?.full_name || session.user.user_metadata?.full_name || email;
      const role: AppRole = inviteData?.role ?? "teacher";
      const linkedSport = inviteData?.linked_sport ?? null;

      setUserName(fullName);

      try {
        // 1. Upsert profile row (may already exist from trigger, or need creation)
        const { error: profileErr } = await supabase.from("profiles").upsert(
          {
            id: userId,
            email,
            full_name: fullName,
            linked_sport: linkedSport,
          },
          { onConflict: "id" }
        );
        if (profileErr) throw profileErr;

        // 2. Insert role (only if not already set)
        const { data: existingRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        if (!existingRoles || existingRoles.length === 0) {
          const { error: roleErr } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role });
          if (roleErr) throw roleErr;
        }

        // 3. אם תלמיד — קשר אוטומטית לפרופיל ספורטאי לפי מייל
        if (role === "student") {
          const { data: studentRow } = await supabase
            .from("students")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (studentRow?.id) {
            await supabase
              .from("profiles")
              .update({ linked_student_id: studentRow.id })
              .eq("id", userId);
          }
        }

        // 4. Clean up localStorage entry
        try {
          const stored = JSON.parse(localStorage.getItem("pending_invites") || "{}");
          delete stored[email];
          localStorage.setItem("pending_invites", JSON.stringify(stored));
        } catch { /* ignore */ }

        setRoleRedirect(ROLE_REDIRECT[role]);
        setStatus("set-password");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
        setErrorMsg(msg);
        setStatus("error");
      }
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
                נראה שאתה כבר רשום/ה, או שפרטי ההזמנה לא נמצאו. פנה/י למנהל המערכת.
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
