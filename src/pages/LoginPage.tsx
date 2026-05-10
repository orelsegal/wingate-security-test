import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLogger";
import WingateBadge from "@/components/WingateBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LoginPage = () => {
  useAuth(); // ensure context is mounted
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("פרטי ההתחברות שגויים. אנא נסה/י שוב.");
        setLoading(false);
        return;
      }

      // Resolve role to know where to redirect
      const userId = data.user?.id;
      let role: string | null = null;
      let fullName = data.user?.email ?? "";
      if (userId) {
        const [{ data: roles }, { data: profile }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", userId),
          supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
        ]);
        const roleList = (roles ?? []).map((r) => r.role as string);
        role = roleList.includes("admin") ? "admin" : roleList[0] ?? null;
        if (profile?.full_name) fullName = profile.full_name;
      }

      if (!role) {
        setError("לא הוגדר תפקיד למשתמש זה. פנה/י למנהל המערכת.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const target = role === "student" ? "/student-home" : "/";
      logActivity(fullName, role as never, email.trim(), "login", target);

      setExiting(true);
      setTimeout(() => navigate(target), 400);
    } catch {
      setError("שגיאה בלתי צפויה. נסה/י שוב.");
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-background flex items-center justify-center relative overflow-hidden transition-all duration-500 ${
        exiting ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100"
      }`}
      dir="rtl"
    >
      {/* Soft circular background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-[12%] -right-[8%] w-[620px] h-[620px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsla(150,38%,70%,0.14) 0%, transparent 60%)" }}
        />
        <div
          className="absolute top-[38%] -right-[3%] w-[420px] h-[420px] rounded-full blur-2xl"
          style={{ background: "radial-gradient(circle, hsla(38,42%,78%,0.12) 0%, transparent 58%)" }}
        />
        <div
          className="absolute -bottom-[10%] -left-[12%] w-[580px] h-[580px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsla(155,28%,65%,0.11) 0%, transparent 60%)" }}
        />
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsla(148,30%,68%,0.08) 0%, transparent 55%)" }}
        />
      </div>

      <div className="w-full max-w-[400px] px-6 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-7 animate-fade-in-up">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full scale-[1.8]"
              style={{ background: "radial-gradient(circle, hsla(152,30%,50%,0.06) 0%, transparent 70%)" }}
            />
            <WingateBadge size="lg" className="shadow-[0_4px_24px_-6px_hsla(150,20%,20%,0.07)] relative" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-9 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[22px] font-bold text-primary tracking-tight leading-snug mb-2.5">
            האקדמיה למצוינות בספורט
          </h1>
          <div className="w-10 h-[2px] rounded-full bg-primary/25 mx-auto mb-2.5" />
          <p className="text-[11px] font-light leading-relaxed tracking-wide text-muted-foreground/50">
            התחברות למערכת
          </p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl border border-border/50 shadow-[var(--shadow-card)] p-6 animate-fade-in-up space-y-4"
          style={{ animationDelay: "120ms" }}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px] text-foreground/80">
              אימייל
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@wingate.ac.il"
              disabled={loading}
              className="text-left"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[13px] text-foreground/80">
              סיסמה
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="text-left"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-[13px]">{error}</AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-[14px] font-medium transition-all duration-200 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                מתחבר...
              </>
            ) : (
              "התחבר"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="w-12 h-[1px] rounded-full bg-primary/15 mx-auto mb-3" />
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary/45">
            WINGATE INSTITUTE
          </p>
          <p className="text-[9px] font-normal tracking-[0.12em] text-primary/30 mt-1">
            מכון וינגייט
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
