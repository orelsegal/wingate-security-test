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
  admin: "bg-[hsl(150,20%,92%)]",
  teacher: "bg-[hsl(35,40%,92%)]",
  parent: "bg-[hsl(350,30%,93%)]",
  coach: "bg-[hsl(25,45%,91%)]",
  student: "bg-[hsl(210,30%,92%)]",
};

const roleIconColors: Record<UserRole, string> = {
  admin: "text-primary",
  teacher: "text-[hsl(35,50%,45%)]",
  parent: "text-[hsl(350,40%,50%)]",
  coach: "text-[hsl(25,55%,45%)]",
  student: "text-[hsl(210,50%,45%)]",
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
      if (user.role === "student") {
        navigate("/student-home");
      } else {
        navigate("/");
      }
    }, 500);
  };

  return (
    <div
      className={`min-h-screen bg-[hsl(40,25%,96%)] flex items-center justify-center relative overflow-hidden transition-all duration-500 ${
        exiting ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100"
      }`}
      dir="rtl"
    >
      {/* Decorative organic background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[120px] -left-[80px] w-[400px] h-[400px] rounded-full bg-primary/[0.04]" />
        <div className="absolute -bottom-[60px] -right-[100px] w-[300px] h-[300px] rounded-full bg-[hsl(35,40%,92%)]/60" />
        <div className="absolute top-[15%] right-[8%] w-[80px] h-[80px] rounded-full bg-primary/[0.06]" />
        <div className="absolute bottom-[25%] left-[12%] w-[50px] h-[50px] rounded-full bg-[hsl(25,45%,90%)]/50" />
      </div>

      <div className="w-full max-w-[440px] px-6 relative z-10">

        {/* ── Logo ── */}
        <div className="flex justify-center mb-5 animate-fade-in-up">
          <div className="relative">
            <div className="w-[84px] h-[84px] rounded-full bg-[hsl(40,20%,94%)] border border-[hsl(40,15%,90%)] flex items-center justify-center shadow-[0_4px_20px_-4px_hsl(40,20%,50%,0.1)]">
              <div className="w-[52px] h-[52px] rounded-full bg-card flex items-center justify-center shadow-[0_2px_8px_-2px_hsl(150,20%,30%,0.08)]">
                <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-8 h-8 object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="text-center mb-7 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[22px] font-bold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed mt-2 max-w-[300px] mx-auto">
            מערכת חכמה לניהול ובקרת התקדמות לימודית
          </p>
        </div>

        {/* ── Role Cards ── */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
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
                className={`group relative bg-card rounded-2xl p-3.5 flex flex-col items-center gap-2 text-center transition-all duration-300 cursor-pointer animate-fade-in-up ${
                  isSelected
                    ? "shadow-[0_8px_30px_-6px_hsl(150,30%,30%,0.15)] scale-[0.97] ring-1 ring-primary/20"
                    : "shadow-[0_2px_12px_-4px_hsl(40,20%,40%,0.08)] hover:shadow-[0_8px_30px_-6px_hsl(150,20%,30%,0.12)] hover:-translate-y-1"
                } border ${isActive ? "border-primary/20" : "border-[hsl(40,15%,91%)]"}`}
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <div className={`w-10 h-10 rounded-full ${roleCircleColors[demoUser.role]} flex items-center justify-center transition-all duration-300 ${
                  isActive ? "scale-110" : ""
                }`}>
                  <Icon className={`h-4.5 w-4.5 ${roleIconColors[demoUser.role]} transition-all duration-300`} strokeWidth={1.5} />
                </div>
                <div>
                  <p className={`text-[12px] font-semibold leading-tight transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-foreground/85"
                  }`}>
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-snug line-clamp-2">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>
                <div className={`absolute top-2 start-2 w-2 h-2 rounded-full bg-primary transition-all duration-300 ${
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`} />
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
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
                className={`group relative bg-card rounded-2xl p-3.5 flex flex-col items-center gap-2 text-center transition-all duration-300 cursor-pointer animate-fade-in-up ${
                  isSelected
                    ? "shadow-[0_8px_30px_-6px_hsl(150,30%,30%,0.15)] scale-[0.97] ring-1 ring-primary/20"
                    : "shadow-[0_2px_12px_-4px_hsl(40,20%,40%,0.08)] hover:shadow-[0_8px_30px_-6px_hsl(150,20%,30%,0.12)] hover:-translate-y-1"
                } border ${isActive ? "border-primary/20" : "border-[hsl(40,15%,91%)]"}`}
                style={{ animationDelay: `${330 + i * 70}ms` }}
              >
                <div className={`w-10 h-10 rounded-full ${roleCircleColors[demoUser.role]} flex items-center justify-center transition-all duration-300 ${
                  isActive ? "scale-110" : ""
                }`}>
                  <Icon className={`h-4.5 w-4.5 ${roleIconColors[demoUser.role]} transition-all duration-300`} strokeWidth={1.5} />
                </div>
                <div>
                  <p className={`text-[12px] font-semibold leading-tight transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-foreground/85"
                  }`}>
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-snug line-clamp-2">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>
                <div className={`absolute top-2 start-2 w-2 h-2 rounded-full bg-primary transition-all duration-300 ${
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`} />
              </button>
            );
          })}
        </div>

        {/* ── System hint ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: "480ms" }}>
          <div className="flex items-center justify-center gap-2 py-2">
            <Sparkles className="h-3 w-3 text-primary/30 shrink-0" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground/45 font-medium leading-relaxed">
              מעקב חכם · מקצועות · חוסרים · מפות דרכים
            </span>
          </div>
        </div>

        {/* ── Branding ── */}
        <div className="mt-3 text-center animate-fade-in-up" style={{ animationDelay: "540ms" }}>
          <div className="inline-flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full overflow-hidden opacity-30">
              <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[9.5px] text-muted-foreground/25 font-medium">
              מכון וינגייט · סמסטר א׳ תשפ״ה
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
