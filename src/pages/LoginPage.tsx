import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, BookOpen, Heart, Dumbbell, GraduationCap } from "lucide-react";
import { useAuth, demoUsers, roleLabels, roleDescriptions } from "@/context/AuthContext";
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
  teacher: "text-[hsl(35,40%,45%)]",
  parent: "text-[hsl(350,35%,52%)]",
  coach: "text-[hsl(25,45%,48%)]",
  student: "text-[hsl(210,40%,50%)]",
};

const shortDescriptions: Record<UserRole, string> = {
  admin: "ניהול כללי של המערכת",
  teacher: "מעקב לימודי והזנת נתונים",
  parent: "צפייה בהתקדמות הילד/ה",
  coach: "ספורטאי הענף שלי",
  student: "המרחב האישי שלי",
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
        className={`group relative bg-card rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all duration-300 cursor-pointer animate-fade-in-up border ${
          isSelected
            ? "shadow-[var(--shadow-card-hover)] scale-[0.97] border-primary/20"
            : `shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 ${isActive ? "border-primary/12" : "border-border"}`
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div
          className={`w-10 h-10 rounded-xl ${roleCircleColors[role]} flex items-center justify-center transition-transform duration-300 ${
            isActive ? "scale-110" : ""
          }`}
        >
          <Icon className={`h-[16px] w-[16px] ${roleIconColors[role]}`} strokeWidth={1.5} />
        </div>
        <div>
          <p
            className={`text-[12px] font-medium leading-tight transition-colors duration-200 ${
              isActive ? "text-primary" : "text-foreground/75"
            }`}
          >
            {roleLabels[role]}
          </p>
          <p className="text-[9px] text-muted-foreground/50 mt-0.5 leading-snug line-clamp-1">
            {shortDescriptions[role]}
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
        <div className="absolute -top-[120px] -left-[80px] w-[380px] h-[380px] rounded-full bg-primary/[0.025]" />
        <div className="absolute -bottom-[60px] -right-[100px] w-[280px] h-[280px] rounded-full bg-[hsl(35,30%,93%)]/40" />
      </div>

      <div className="w-full max-w-[460px] px-6 relative z-10">
        {/* Logo Badge */}
        <div className="flex justify-center mb-8 animate-fade-in-up">
          <WingateBadge size="lg" className="shadow-[var(--shadow-card-hover)]" />
        </div>

        {/* Title */}
        <div className="text-center mb-10 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[18px] font-semibold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          {/* Signature underline */}
          <div className="flex justify-center mt-3">
            <div
              className="h-[1.5px] w-[72px] rounded-full"
              style={{ background: "linear-gradient(to left, transparent, hsl(var(--primary-soft) / 0.5), transparent)" }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed mt-3.5 font-normal tracking-wide">
            ניהול ולמידה מותאמים לספורטאים
          </p>
        </div>

        {/* Role Cards — Top Row (3) */}
        <div className="grid grid-cols-3 gap-3.5 mb-3.5">
          {topRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={120 + i * 60} />
          ))}
        </div>

        {/* Role Cards — Bottom Row (2) */}
        <div className="grid grid-cols-2 gap-3.5 mb-8">
          {bottomRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={300 + i * 60} />
          ))}
        </div>

        {/* Branding */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "440ms" }}>
          <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
            מכון וינגייט · סמסטר א׳ תשפ״ה
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
