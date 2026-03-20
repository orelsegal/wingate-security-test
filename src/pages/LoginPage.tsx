import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, BookOpen, Heart, Dumbbell, GraduationCap } from "lucide-react";
import { useAuth, demoUsers, roleLabels } from "@/context/AuthContext";
import type { UserRole, AppUser } from "@/context/AuthContext";
import WingateBadge from "@/components/WingateBadge";

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield,
  teacher: BookOpen,
  parent: Heart,
  coach: Dumbbell,
  student: GraduationCap,
};

const roleCircleColors: Record<UserRole, string> = {
  admin: "bg-primary/8",
  teacher: "bg-[hsl(35,30%,94%)]",
  parent: "bg-[hsl(350,20%,95%)]",
  coach: "bg-[hsl(25,30%,93%)]",
  student: "bg-[hsl(210,30%,94%)]",
};

const roleIconColors: Record<UserRole, string> = {
  admin: "text-primary",
  teacher: "text-[hsl(35,45%,40%)]",
  parent: "text-[hsl(350,38%,48%)]",
  coach: "text-[hsl(25,48%,44%)]",
  student: "text-[hsl(210,45%,45%)]",
};

const shortDescriptions: Record<UserRole, string> = {
  admin: "ניהול כללי של המערכת",
  teacher: "מעקב לימודי והזנת נתונים",
  parent: "צפייה בהתקדמות הילד/ה",
  coach: "ספורטאי הענף שלי",
  student: "המרחב האישי שלי",
};

const microCta: Partial<Record<UserRole, string>> = {
  student: "למרחב האישי",
  teacher: "למערכת ההוראה",
};

const primaryCardTint: Partial<Record<UserRole, string>> = {
  student: "bg-[hsl(210,25%,97.5%)]",
  teacher: "bg-[hsl(35,25%,97%)]",
};

const topRowRoles: UserRole[] = ["parent", "admin", "coach"];
const bottomRowRoles: UserRole[] = ["teacher", "student"];

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
  const isPrimary = (role: UserRole) => role === "student" || role === "teacher";

  const RoleCard = ({ role, delay }: { role: UserRole; delay: number }) => {
    const demoUser = findUser(role);
    const Icon = roleIcons[role];
    const isSelected = selectedRole === role;
    const isHovered = hoveredRole === role;
    const isActive = isSelected || isHovered;
    const primary = isPrimary(role);
    const bgTint = primaryCardTint[role] || "bg-card";

    return (
      <button
        onClick={() => handleLogin(demoUser)}
        onMouseEnter={() => setHoveredRole(role)}
        onMouseLeave={() => setHoveredRole(null)}
        className={`group relative ${bgTint} rounded-2xl flex flex-col items-center gap-1.5 text-center cursor-pointer animate-fade-in-up border transition-all duration-200 ease-out ${
          primary ? "p-[18px]" : "p-4"
        } ${
          isSelected
            ? "shadow-[var(--shadow-card-hover)] scale-[0.97] border-primary/20"
            : `hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:scale-[0.98] active:shadow-[var(--shadow-card)] ${
                primary
                  ? "shadow-[0_2px_12px_-3px_hsla(150,20%,20%,0.08)] border-border"
                  : "shadow-[var(--shadow-card)] border-border/80"
              } ${isActive ? "border-primary/12" : ""}`
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div
          className={`${primary ? "w-12 h-12" : "w-11 h-11"} rounded-xl ${roleCircleColors[role]} flex items-center justify-center transition-transform duration-200 ease-out ${
            isActive ? "scale-110" : ""
          }`}
        >
          <Icon className={`${primary ? "h-[19px] w-[19px]" : "h-[17px] w-[17px]"} ${roleIconColors[role]}`} strokeWidth={1.6} />
        </div>
        <div className="mt-0.5">
          <p
            className={`${primary ? "text-[13.5px]" : "text-[12.5px]"} font-medium leading-tight transition-colors duration-200 ${
              isActive ? "text-primary" : "text-foreground/80"
            }`}
          >
            {roleLabels[role]}
          </p>
          <p className={`${primary ? "text-[10px]" : "text-[9.5px]"} text-muted-foreground/50 mt-0.5 leading-snug line-clamp-1`}>
            {shortDescriptions[role]}
          </p>
          {microCta[role] && (
            <p className={`text-[8.5px] font-medium mt-1 transition-colors duration-200 ${isActive ? "text-primary/70" : "text-primary/40"}`}>
              {microCta[role]} ←
            </p>
          )}
        </div>
        <div
          className={`absolute top-2.5 start-2.5 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-200 ${
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
        <div
          className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(152,34%,34%,0.03) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(35,30%,80%,0.06) 0%, transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-[460px] px-6 relative z-10">
        {/* Logo Badge */}
        <div className="flex justify-center mb-8 animate-fade-in-up">
          <WingateBadge size="lg" className="shadow-[0_4px_24px_-6px_hsla(150,20%,20%,0.1)]" />
        </div>

        {/* Title — clean, no underline */}
        <div className="text-center mb-9 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[18px] font-semibold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[10.5px] font-light leading-relaxed mt-2.5 tracking-wide" style={{ color: "hsl(160, 5%, 48%)" }}>
            למידה וניהול מותאמים לספורטאי על
          </p>
        </div>

        {/* Role Cards — Top Row (3) */}
        <div className="grid grid-cols-3 gap-3.5 mb-3.5">
          {topRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={120 + i * 60} />
          ))}
        </div>

        {/* Role Cards — Bottom Row (2) */}
        <div className="grid grid-cols-2 gap-3.5 mb-10">
          {bottomRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={300 + i * 60} />
          ))}
        </div>

        {/* Branding — minimal */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "440ms" }}>
          <span className="text-[8px] font-light tracking-widest" style={{ color: "hsl(150, 5%, 78%)" }}>
            מכון וינגייט
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
