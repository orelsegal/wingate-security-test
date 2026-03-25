import { useNavigate } from "react-router-dom";
import { useAuth, roleLabels } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import WingateBadge from "@/components/WingateBadge";
import { GraduationCap, Shield, Users, Dumbbell, Heart } from "lucide-react";

const roleCards: { role: UserRole; icon: typeof Users }[] = [
  { role: "parent", icon: Heart },
  { role: "admin", icon: Shield },
  { role: "coach", icon: Dumbbell },
  { role: "teacher", icon: GraduationCap },
  { role: "student", icon: Users },
];

const roleColors: Record<UserRole, { bg: string; icon: string }> = {
  parent: { bg: "bg-[hsl(350,25%,93%)]", icon: "text-[hsl(350,40%,50%)]" },
  admin: { bg: "bg-[hsl(210,40%,93%)]", icon: "text-[hsl(210,45%,48%)]" },
  coach: { bg: "bg-[hsl(25,35%,92%)]", icon: "text-[hsl(25,50%,45%)]" },
  teacher: { bg: "bg-primary/10", icon: "text-primary" },
  student: { bg: "bg-[hsl(270,25%,93%)]", icon: "text-[hsl(270,35%,50%)]" },
};

const roleHomeMap: Record<UserRole, string> = {
  teacher: "/teacher-home",
  student: "/student-home",
  admin: "/admin-dashboard",
  parent: "/parent-home",
  coach: "/coach-home",
};

const WelcomePage = () => {
  const navigate = useNavigate();
  const { setRole } = useAuth();

  const handleRoleClick = (role: UserRole) => {
    setRole(role);
    navigate(roleHomeMap[role]);
  };

  const topRow = roleCards.slice(0, 3);
  const bottomRow = roleCards.slice(3);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[12%] -right-[8%] w-[620px] h-[620px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, hsla(150,38%,70%,0.14) 0%, transparent 60%)" }} />
        <div className="absolute top-[38%] -right-[3%] w-[420px] h-[420px] rounded-full blur-2xl" style={{ background: "radial-gradient(circle, hsla(38,42%,78%,0.12) 0%, transparent 58%)" }} />
        <div className="absolute -bottom-[10%] -left-[12%] w-[580px] h-[580px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, hsla(155,28%,65%,0.11) 0%, transparent 60%)" }} />
      </div>

      <div className="w-full max-w-[440px] px-6 relative z-10">
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

        {/* Role Cards - Top row (3) */}
        <div className="grid grid-cols-3 gap-3 mb-3 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          {topRow.map((card) => {
            const colors = roleColors[card.role];
            return (
              <button
                key={card.role}
                onClick={() => handleRoleClick(card.role)}
                className="group bg-card rounded-2xl border border-border/50 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 p-4 text-center cursor-pointer"
              >
                <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center mx-auto mb-2.5 transition-transform duration-300 group-hover:scale-110`}>
                  <card.icon className={`h-[18px] w-[18px] ${colors.icon}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-[12.5px] font-semibold text-foreground leading-tight">
                  {roleLabels[card.role]}
                </h3>
              </button>
            );
          })}
        </div>

        {/* Role Cards - Bottom row (2) */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          {bottomRow.map((card) => {
            const colors = roleColors[card.role];
            return (
              <button
                key={card.role}
                onClick={() => handleRoleClick(card.role)}
                className="group bg-card rounded-2xl border border-border/50 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 p-5 text-center cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mx-auto mb-2.5 transition-transform duration-300 group-hover:scale-110`}>
                  <card.icon className={`h-5 w-5 ${colors.icon}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-[13.5px] font-semibold text-foreground leading-tight">
                  {roleLabels[card.role]}
                </h3>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 animate-fade-in-up" style={{ animationDelay: "280ms" }}>
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary/45">WINGATE INSTITUTE</p>
          <p className="text-[9px] tracking-[0.12em] text-primary/30 mt-1">מכון וינגייט</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
