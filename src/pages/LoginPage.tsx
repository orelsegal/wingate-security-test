import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, BookOpen, Heart, Dumbbell, ArrowLeft, BarChart3, Target, Route } from "lucide-react";
import { useAuth, demoUsers, roleLabels, roleDescriptions } from "@/context/AuthContext";
import type { UserRole, AppUser } from "@/context/AuthContext";
import wingateLogoSrc from "@/assets/wingate-logo.png";

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield,
  teacher: BookOpen,
  parent: Heart,
  coach: Dumbbell,
};

const roleAccents: Record<UserRole, string> = {
  admin: "from-primary/8 to-primary/3",
  teacher: "from-[hsl(200_50%_94%)] to-[hsl(200_40%_97%)]",
  parent: "from-[hsl(340_40%_95%)] to-[hsl(340_30%_97%)]",
  coach: "from-warning/8 to-warning/3",
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleLogin = (user: AppUser) => {
    setSelectedRole(user.role);
    setTimeout(() => {
      login(user);
      navigate("/");
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Ambient background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,hsl(150_20%_95%)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,hsl(148_15%_94%)_0%,transparent_50%)]" />
        <div className="absolute top-[20%] start-[10%] w-[300px] h-[300px] rounded-full bg-primary/[0.025] blur-[80px]" />
        <div className="absolute bottom-[15%] end-[15%] w-[250px] h-[250px] rounded-full bg-primary/[0.02] blur-[60px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(hsl(150 30% 40%) 1px, transparent 1px), linear-gradient(90deg, hsl(150 30% 40%) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div className="w-full max-w-[420px] px-6 relative z-10">

        {/* ── Logo ── */}
        <div className="flex justify-center mb-5 animate-fade-in-up">
          <div className="relative">
            <div className="w-[56px] h-[56px] rounded-2xl bg-card border border-border/80 p-2.5 flex items-center justify-center shadow-[0_4px_24px_-4px_hsl(150_20%_20%/0.08)]">
              <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
            </div>
            {/* Glow ring */}
            <div className="absolute -inset-2 rounded-3xl bg-primary/[0.04] blur-xl -z-10" />
          </div>
        </div>

        {/* ── Title ── */}
        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed mt-2 max-w-[320px] mx-auto">
            מערכת חכמה לניהול ובקרת התקדמות לימודית
          </p>
        </div>

        {/* ── Role Cards ── */}
        <div className="space-y-2.5 mb-5">
          <p className="text-[10.5px] text-muted-foreground/40 text-center mb-3 animate-fade-in-up font-medium tracking-wide" style={{ animationDelay: "80ms" }}>
            בחירת תפקיד
          </p>

          {demoUsers.map((demoUser, i) => {
            const Icon = roleIcons[demoUser.role];
            const isSelected = selectedRole === demoUser.role;
            const isHovered = hoveredRole === demoUser.role;

            return (
              <button
                key={demoUser.role}
                onClick={() => handleLogin(demoUser)}
                onMouseEnter={() => setHoveredRole(demoUser.role)}
                onMouseLeave={() => setHoveredRole(null)}
                className={`w-full group relative bg-card border rounded-2xl p-4 flex items-center gap-4 text-start transition-all duration-300 cursor-pointer animate-fade-in-up overflow-hidden ${
                  isSelected
                    ? "border-primary/30 shadow-[0_8px_32px_-8px_hsl(150_30%_30%/0.15)] scale-[0.98]"
                    : "border-border/70 hover:border-primary/20 hover:shadow-[0_8px_32px_-8px_hsl(150_20%_20%/0.1)] hover:translate-y-[-1px]"
                }`}
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                {/* Gradient accent background */}
                <div className={`absolute inset-0 bg-gradient-to-l ${roleAccents[demoUser.role]} opacity-0 transition-opacity duration-300 ${isHovered || isSelected ? "opacity-100" : ""}`} />

                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isHovered || isSelected ? "bg-primary/10" : "bg-accent/70"
                }`}>
                  <Icon className={`h-[18px] w-[18px] transition-all duration-300 ${
                    isHovered || isSelected ? "text-primary" : "text-muted-foreground/60"
                  }`} strokeWidth={1.5} />
                </div>

                <div className="relative flex-1 min-w-0">
                  <p className={`text-[13.5px] font-semibold leading-tight transition-colors duration-200 ${
                    isHovered || isSelected ? "text-foreground" : "text-foreground/90"
                  }`}>
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>

                <div className={`relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isHovered || isSelected ? "opacity-100 bg-primary/8 translate-x-0" : "opacity-0 translate-x-1"
                }`}>
                  <ArrowLeft className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Capability hint ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: "380ms" }}>
          <div className="flex items-center justify-center gap-4 py-3 px-4 rounded-xl bg-accent/30 border border-border/40">
            {[
              { icon: BarChart3, label: "ציונים" },
              { icon: Route, label: "מפות דרכים" },
              { icon: Target, label: "חוסרים" },
            ].map(({ icon: FIcon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <FIcon className="h-3 w-3 text-primary/40" strokeWidth={1.5} />
                <span className="text-[10px] text-muted-foreground/50 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom branding ── */}
        <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: "420ms" }}>
          <div className="inline-flex items-center gap-2">
            <div className="w-3 h-3 rounded overflow-hidden opacity-40">
              <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[10px] text-muted-foreground/30 font-medium">
              מכון וינגייט · סמסטר א׳ תשפ״ה
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
