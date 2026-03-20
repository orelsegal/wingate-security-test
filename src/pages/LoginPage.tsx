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
    const isAdmin = role === "admin";

    return (
      <button
        onClick={() => handleLogin(demoUser)}
        onMouseEnter={() => setHoveredRole(role)}
        onMouseLeave={() => setHoveredRole(null)}
        className={`group relative bg-card rounded-2xl flex flex-col items-center justify-center gap-2 text-center cursor-pointer animate-fade-in-up border transition-all duration-200 ease-out p-4 aspect-square ${
          isSelected
            ? "shadow-[var(--shadow-card-hover)] scale-[0.97] border-primary/20"
            : `hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:scale-[0.98] shadow-[var(--shadow-card)] border-border/80 ${
                isActive ? "border-primary/12" : ""
              }`
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div
          className={`w-11 h-11 rounded-xl ${roleCircleColors[role]} flex items-center justify-center transition-transform duration-200 ease-out ${
            isActive ? "scale-110" : ""
          }`}
        >
          <Icon
            className={`${isAdmin ? "h-[20px] w-[20px]" : "h-[18px] w-[18px]"} ${roleIconColors[role]}`}
            strokeWidth={1.5}
          />
        </div>
        <p
          className={`text-[13px] font-medium leading-tight transition-colors duration-200 ${
            isActive ? "text-primary" : "text-foreground/80"
          }`}
        >
          {roleLabels[role]}
        </p>
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
      {/* Decorative background circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(152,34%,34%,0.045) 0%, transparent 65%)" }}
        />
        <div
          className="absolute bottom-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(35,30%,80%,0.07) 0%, transparent 65%)" }}
        />
        <div
          className="absolute top-[60%] left-[-10%] w-[350px] h-[350px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(152,30%,50%,0.03) 0%, transparent 65%)" }}
        />
        <div
          className="absolute top-[-8%] right-[15%] w-[250px] h-[250px] rounded-full"
          style={{ background: "radial-gradient(circle, hsla(210,20%,70%,0.04) 0%, transparent 65%)" }}
        />
      </div>

      <div className="w-full max-w-[440px] px-6 relative z-10">
        {/* Logo Badge */}
        <div className="flex justify-center mb-7 animate-fade-in-up">
          <WingateBadge size="lg" className="shadow-[0_4px_24px_-6px_hsla(150,20%,20%,0.1)]" />
        </div>

        {/* Title */}
        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[18px] font-semibold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[10.5px] font-light leading-relaxed mt-2 tracking-wide text-muted-foreground/60">
            למידה וניהול מותאמים לספורטאי על
          </p>
        </div>

        {/* Role Cards — Top Row (3) */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {topRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={120 + i * 60} />
          ))}
        </div>

        {/* Role Cards — Bottom Row (2) */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {bottomRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={300 + i * 60} />
          ))}
        </div>

        {/* Branding */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "440ms" }}>
          <p className="text-[9px] font-normal tracking-[0.15em] text-muted-foreground/40">
            THE WINGATE INSTITUTE
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
