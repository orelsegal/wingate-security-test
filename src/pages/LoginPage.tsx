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

/* Card order: admin, teacher, parent → top row; student, coach → bottom row */
const topRowRoles: UserRole[] = ["admin", "teacher", "parent"];
const bottomRowRoles: UserRole[] = ["student", "coach"];

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

  const findUser = (role: UserRole) => demoUsers.find((u) => u.role === role)!;

  const RoleCard = ({ role, delay }: { role: UserRole; delay: number }) => {
    const demoUser = findUser(role);
    const Icon = roleIcons[role];
    const isSelected = selectedRole === role;
    const isHovered = hoveredRole === role;
    const isActive = isSelected || isHovered;

    return (
      <button
        onClick={() => handleLogin(demoUser)}
        onMouseEnter={() => setHoveredRole(role)}
        onMouseLeave={() => setHoveredRole(null)}
        className={`group relative bg-card rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center transition-all duration-300 cursor-pointer animate-fade-in-up border ${
          isSelected
            ? "shadow-[var(--shadow-card-hover)] scale-[0.97] border-primary/20"
            : `shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 ${isActive ? "border-primary/15" : "border-border"}`
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div
          className={`w-11 h-11 rounded-xl ${roleCircleColors[role]} flex items-center justify-center transition-transform duration-300 ${
            isActive ? "scale-110" : ""
          }`}
        >
          <Icon className={`h-[18px] w-[18px] ${roleIconColors[role]}`} strokeWidth={1.5} />
        </div>
        <div>
          <p
            className={`text-[12.5px] font-semibold leading-tight transition-colors duration-200 ${
              isActive ? "text-primary" : "text-foreground/80"
            }`}
          >
            {roleLabels[role]}
          </p>
          <p className="text-[9.5px] text-muted-foreground/60 mt-1 leading-snug line-clamp-2">
            {roleDescriptions[role]}
          </p>
        </div>
        <div
          className={`absolute top-2.5 start-2.5 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-300 ${
            isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
          }`}
        />
      </button>
    );
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

      <div className="w-full max-w-[460px] px-6 relative z-10">
        {/* Logo Badge */}
        <div className="flex justify-center mb-7 animate-fade-in-up">
          <div className="w-[80px] h-[80px] rounded-2xl bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card-hover)]">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-11 h-11 object-contain" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-9 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[19px] font-semibold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-2.5 max-w-[280px] mx-auto font-medium">
            מערכת חכמה לניהול ובקרת התקדמות לימודית
          </p>
        </div>

        {/* Role Cards — Top Row (3) */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {topRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={120 + i * 60} />
          ))}
        </div>

        {/* Role Cards — Bottom Row (2) */}
        <div className="grid grid-cols-2 gap-3 mb-7">
          {bottomRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={300 + i * 60} />
          ))}
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
        <div className="mt-3 text-center animate-fade-in-up" style={{ animationDelay: "500ms" }}>
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
