import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WingateBadge from "@/components/WingateBadge";

type AppRole = "admin" | "teacher" | "student" | "parent" | "coach";

const ROLE_REDIRECT: Record<AppRole, string> = {
  admin: "/",
  teacher: "/",
  coach: "/",
  parent: "/",
  student: "/student-home",
};

type Status = "waiting" | "setting-up" | "done" | "no-invite" | "error";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("waiting");
  const [userName, setUserName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

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

        // 3. Clean up localStorage entry
        try {
          const stored = JSON.parse(localStorage.getItem("pending_invites") || "{}");
          delete stored[email];
          localStorage.setItem("pending_invites", JSON.stringify(stored));
        } catch { /* ignore */ }

        setStatus("done");

        // Redirect after a short celebration pause
        setTimeout(() => navigate(ROLE_REDIRECT[role]), 2000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
        setErrorMsg(msg);
        setStatus("error");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-[400px] px-6">
        <div className="flex justify-center mb-7">
          <WingateBadge size="lg" />
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-[var(--shadow-card)] p-8 text-center space-y-4">
          {status === "waiting" || status === "setting-up" ? (
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
