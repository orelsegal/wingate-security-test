import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, BookOpen, Heart, Dumbbell, Sparkles, GraduationCap } from "lucide-react";
import { useAuth, demoUsers, roleLabels, roleDescriptions } from "@/context/AuthContext";
import type { UserRole, AppUser } from "@/context/AuthContext";
import wingateLogoSrc from "@/assets/wingate-logo.png";

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield,
  teacher: BookOpen,
  parent: Heart,
  coach: Dumbbell,
  student: GraduationCap,
};

const roleCircleColors: Record<UserRole, string> = {
  admin: "bg-primary/10",
  teacher: "bg-[hsl(35,35%,93%)]",
  parent: "bg-[hsl(350,25%,94%)]",
  coach: "bg-[hsl(25,35%,92%)]",
  student: "bg-[hsl(210,35%,93%)]",
};

const roleIconColors: Record<UserRole, string> = {
  admin: "text-primary",
  teacher: "text-[hsl(35,45%,42%)]",
  parent: "text-[hsl(350,40%,50%)]",
  coach: "text-[hsl(25,50%,45%)]",
  student: "text-[hsl(210,45%,48%)]",
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [exiting, setExiting] = useState(false);

  const handleLogin = (user: AppUser) => {
    setSelectedRole(user.role);
    setExiting(true);
    setTimeout(() => {
      login(user);
      navigate(user.role === "student" ? "/student-home" : "/");
    }, 400);
  };

  return (
    <div
      className={`min-h-screen bg-background flex items-center justify-center relative overflow-hidden transition-all duration-500 ${
        exiting ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100"
      }`}
      dir="rtl"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[120px] -left-[80px] w-[380px] h-[380px] rounded-full bg-primary/[0.03]" />
        <div className="absolute -bottom-[60px] -right-[100px] w-[280px] h-[280px] rounded-full bg-[hsl(35,30%,93%)]/50" />
        <div className="absolute top-[18%] right-[10%] w-[60px] h-[60px] rounded-full bg-primary/[0.04]" />
      </div>

      <div className="w-full max-w-[440px] px-6 relative z-10">

        {/* Logo */}
        <div className="flex justify-center mb-6 animate-fade-in-up">
          <div className="w-[72px] h-[72px] rounded-2xl bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)]">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-10 h-10 object-contain" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[20px] font-semibold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[12px] text-muted-foreground leading-relaxed mt-2 max-w-[280px] mx-auto font-medium">
            מערכת חכמה לניהול ובקרת התקדמות לימודית
          </p>
        </div>

        {/* Role Cards - 3 column top */}
        <div className="grid grid-cols-3 gap-2.5 mb-2.5">
          {demoUsers.slice(0, 3).map((demoUser, i) => {
            const Icon = roleIcons[demoUser.role];
            const isSelected = selectedRole === demoUser.role;
            const isHovered = hoveredRole === demoUser.role;
            const isActive = isSelected || isHovered;

            return (
              <button
                key={demoUser.role}
                onClick={() => handleLogin(demoUser)}
                onMouseEnter={() => setHoveredRole(demoUser.role)}
                onMouseLeave={() => setHoveredRole(null)}
                className={`group relative bg-card rounded-2xl p-3.5 flex flex-col items-center gap-2 text-center transition-all duration-300 cursor-pointer animate-fade-in-up border ${
                  isSelected
                    ? "shadow-[var(--shadow-card-hover)] scale-[0.97] border-primary/20"
                    : `shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 ${isActive ? "border-primary/15" : "border-border"}`
                }`}
                style={{ animationDelay: `${120 + i * 60}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl ${roleCircleColors[demoUser.role]} flex items-center justify-center transition-transform duration-300 ${
                  isActive ? "scale-110" : ""
                }`}>
                  <Icon className={`h-[17px] w-[17px] ${roleIconColors[demoUser.role]}`} strokeWidth={1.5} />
                </div>
                <div>
                  <p className={`text-[12px] font-semibold leading-tight transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-foreground/80"
                  }`}>
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5 leading-snug line-clamp-2">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>
                <div className={`absolute top-2 start-2 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-300 ${
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`} />
              </button>
            );
          })}
        </div>

        {/* Role Cards - 2 column bottom */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {demoUsers.slice(3).map((demoUser, i) => {
            const Icon = roleIcons[demoUser.role];
            const isSelected = selectedRole === demoUser.role;
            const isHovered = hoveredRole === demoUser.role;
            const isActive = isSelected || isHovered;

            return (
              <button
                key={demoUser.role}
                onClick={() => handleLogin(demoUser)}
                onMouseEnter={() => setHoveredRole(demoUser.role)}
                onMouseLeave={() => setHoveredRole(null)}
                className={`group relative bg-card rounded-2xl p-3.5 flex flex-col items-center gap-2 text-center transition-all duration-300 cursor-pointer animate-fade-in-up border ${
                  isSelected
                    ? "shadow-[var(--shadow-card-hover)] scale-[0.97] border-primary/20"
                    : `shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 ${isActive ? "border-primary/15" : "border-border"}`
                }`}
                style={{ animationDelay: `${300 + i * 60}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl ${roleCircleColors[demoUser.role]} flex items-center justify-center transition-transform duration-300 ${
                  isActive ? "scale-110" : ""
                }`}>
                  <Icon className={`h-[17px] w-[17px] ${roleIconColors[demoUser.role]}`} strokeWidth={1.5} />
                </div>
                <div>
                  <p className={`text-[12px] font-semibold leading-tight transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-foreground/80"
                  }`}>
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5 leading-snug line-clamp-2">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>
                <div className={`absolute top-2 start-2 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-300 ${
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`} />
              </button>
            );
          })}
        </div>

        {/* System hint */}
        <div className="animate-fade-in-up" style={{ animationDelay: "440ms" }}>
          <div className="flex items-center justify-center gap-2 py-2">
            <Sparkles className="h-3 w-3 text-primary/25 shrink-0" strokeWidth={1.5} />
            <span className="text-[9.5px] text-muted-foreground/35 font-medium">
              מעקב חכם · מקצועות · חוסרים · מפות דרכים
            </span>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-2 text-center animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <div className="inline-flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full overflow-hidden opacity-25">
              <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[9px] text-muted-foreground/20 font-medium">
              מכון וינגייט · סמסטר א׳ תשפ״ה
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
