import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, mockUsers } from "@/context/AuthContext";
import WingateBadge from "@/components/WingateBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn, ArrowRight } from "lucide-react";

const MOCK_PASSWORD = "123456";

const roleRedirects: Record<string, string> = {
  teacher: "/teacher-home",
  student: "/student-home",
  admin: "/admin-dashboard",
  parent: "/",
  coach: "/",
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState(prefillEmail ? MOCK_PASSWORD : "");

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
      setPassword(MOCK_PASSWORD);
    }
  }, [prefillEmail]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const found = mockUsers.find((u) => u.email === email.trim().toLowerCase());
    if (!found || password !== MOCK_PASSWORD) {
      setError("אימייל או סיסמה שגויים");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      login(found);
      navigate(roleRedirects[found.role] || "/");
    }, 300);
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden"
      dir="rtl"
    >
      {/* Background shapes */}
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
      </div>

      <div className="w-full max-w-[380px] px-6 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6 animate-fade-in-up">
          <WingateBadge size="lg" className="shadow-[0_4px_24px_-6px_hsla(150,20%,20%,0.07)]" />
        </div>

        {/* Title */}
        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[22px] font-bold text-primary tracking-tight leading-snug mb-2">
            האקדמיה למצוינות בספורט
          </h1>
          <div className="w-10 h-[2px] rounded-full bg-primary/25 mx-auto mb-2" />
          <p className="text-[11px] font-light tracking-wide text-muted-foreground/50">
            למידה וניהול מותאמים לספורטאים מצטיינים
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl border border-border/50 shadow-[var(--shadow-card)] p-6 space-y-4 animate-fade-in-up"
          style={{ animationDelay: "120ms" }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">אימייל</label>
            <Input
              type="email"
              placeholder="teacher@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-start"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/80">סיסמה</label>
            <Input
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {loading ? "מתחבר..." : "כניסה"}
          </Button>
        </form>

        {/* Back button */}
        <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            חזרה לבחירת תפקיד
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in-up" style={{ animationDelay: "280ms" }}>
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary/45">WINGATE INSTITUTE</p>
          <p className="text-[9px] tracking-[0.12em] text-primary/30 mt-1">מכון וינגייט</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
