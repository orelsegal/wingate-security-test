import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, BookOpen, Heart, Dumbbell, GraduationCap } from "lucide-react";
import { useAuth, demoUsers, roleLabels } from "@/context/AuthContext";
import type { UserRole, AppUser } from "@/context/AuthContext";
import WingateBadge from "@/components/WingateBadge";

const roleIcons: Record<UserRole, typeof Settings> = {
  admin: Settings,
  teacher: BookOpen,
  parent: Heart,
  coach: Dumbbell,
  student: GraduationCap,
};

const roleCircleColors: Record<UserRole, string> = {
  admin: "bg-primary/10",
  teacher: "bg-[hsl(35,30%,92%)]",
  parent: "bg-[hsl(350,25%,93%)]",
  coach: "bg-[hsl(25,30%,92%)]",
  student: "bg-[hsl(210,30%,92%)]",
};

const roleIconColors: Record<UserRole, string> = {
  admin: "text-primary",
  teacher: "text-[hsl(35,45%,38%)]",
  parent: "text-[hsl(350,38%,45%)]",
  coach: "text-[hsl(25,48%,42%)]",
  student: "text-[hsl(210,45%,42%)]",
};

const roleDescriptions: Record<UserRole, string> = {
  admin: "ניהול המערכת",
  teacher: "מערכת הוראה",
  parent: "מעקב הורים",
  coach: "ניהול אימונים",
  student: "המרחב האישי",
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
        className={`group relative bg-card rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer animate-fade-in-up border transition-all duration-200 ease-out py-5 px-3 ${
          isSelected
            ? "shadow-md scale-[0.97] border-primary/20"
            : `hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] shadow-[var(--shadow-card)] border-border/50 ${
                isActive ? "border-primary/15" : ""
              }`
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        {/* Circular icon background */}
        <div
          className={`w-[52px] h-[52px] rounded-full ${roleCircleColors[role]} flex items-center justify-center transition-transform duration-200 ease-out ${
            isActive ? "scale-110" : ""
          }`}
        >
          <Icon
            className={`h-[22px] w-[22px] ${roleIconColors[role]}`}
            strokeWidth={1.5}
          />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p
            className={`text-[14px] font-medium leading-tight transition-colors duration-200 ${
              isActive ? "text-primary" : "text-foreground/85"
            }`}
          >
            {roleLabels[role]}
          </p>
          <p className="text-[10.5px] text-muted-foreground/55 leading-tight">
            {roleDescriptions[role]}
          </p>
        </div>
        <div
          className={`absolute top-2 start-2 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-200 ${
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
      {/* Decorative background circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(152,34%,34%,0.05) 0%, transparent 60%)" }}
        />
        <div
          className="absolute bottom-[-8%] right-[-8%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(35,30%,80%,0.08) 0%, transparent 60%)" }}
        />
        <div
          className="absolute top-[55%] left-[-12%] w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(152,30%,50%,0.04) 0%, transparent 60%)" }}
        />
        <div
          className="absolute top-[-10%] right-[10%] w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(210,20%,70%,0.05) 0%, transparent 60%)" }}
        />
        <div
          className="absolute bottom-[20%] left-[60%] w-[250px] h-[250px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(150,25%,60%,0.03) 0%, transparent 60%)" }}
        />
      </div>

      <div className="w-full max-w-[400px] px-6 relative z-10">
        {/* Logo with soft halo */}
        <div className="flex justify-center mb-7 animate-fade-in-up">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full scale-[1.8]"
              style={{ background: "radial-gradient(circle, hsla(152,30%,50%,0.06) 0%, transparent 70%)" }}
            />
            <WingateBadge size="lg" className="shadow-[0_4px_24px_-6px_hsla(150,20%,20%,0.07)] relative" />
          </div>
        </div>

        {/* Welcome + Title + Subtitle */}
        <div className="text-center mb-9 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <p className="text-[11px] font-light text-muted-foreground/50 tracking-wide mb-2">
            ברוכים הבאים
          </p>
          <h1 className="text-[18px] font-semibold text-primary tracking-tight leading-snug mb-2.5">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[10.5px] font-light leading-relaxed tracking-wide text-muted-foreground/45">
            למידה וניהול מותאמים לספורטאים מצטיינים
          </p>
        </div>

        {/* Top Row — 3 cards */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {topRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={120 + i * 60} />
          ))}
        </div>

        {/* Bottom Row — 2 wider cards, centered */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {bottomRowRoles.map((role, i) => (
            <div key={role}>
              <RoleCard role={role} delay={300 + i * 60} />
            </div>
          ))}
        </div>

        {/* Footer branding */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "440ms" }}>
          <p className="text-[9px] font-normal tracking-[0.15em] text-primary-soft/50">
            מכון וינגייט • WINGATE INSTITUTE
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
