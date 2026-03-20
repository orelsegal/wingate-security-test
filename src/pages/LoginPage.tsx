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

const topRowRoles: UserRole[] = ["coach", "admin", "parent"];
const bottomRowRoles: UserRole[] = ["student", "teacher"];

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
        className={`group relative bg-card rounded-2xl flex flex-col items-center justify-center gap-2 text-center cursor-pointer animate-fade-in-up border transition-all duration-200 ease-out p-4 ${
          isSelected
            ? "shadow-md scale-[0.97] border-primary/20"
            : `hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] shadow-sm border-border/60 ${
                isActive ? "border-primary/15" : ""
              }`
        }`}
        style={{ animationDelay: `${delay}ms` }}
      >
        {/* Circular icon background */}
        <div
          className={`w-12 h-12 rounded-full ${roleCircleColors[role]} flex items-center justify-center transition-transform duration-200 ease-out ${
            isActive ? "scale-110" : ""
          }`}
        >
          <Icon
            className={`h-5 w-5 ${roleIconColors[role]}`}
            strokeWidth={1.6}
          />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p
            className={`text-[13.5px] font-medium leading-tight transition-colors duration-200 ${
              isActive ? "text-primary" : "text-foreground/85"
            }`}
          >
            {roleLabels[role]}
          </p>
          <p className="text-[10px] text-muted-foreground/50 leading-tight">
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
      {/* Decorative background */}
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

      <div className="w-full max-w-[400px] px-6 relative z-10">
        {/* Logo — slightly reduced */}
        <div className="flex justify-center mb-6 animate-fade-in-up">
          <WingateBadge size="md" className="shadow-[0_4px_20px_-6px_hsla(150,20%,20%,0.08)]" />
        </div>

        {/* Title */}
        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[17px] font-semibold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[10px] font-light leading-relaxed mt-1.5 tracking-wide text-muted-foreground/50">
            למידה וניהול מותאמים לספורטאי על
          </p>
        </div>

        {/* Top Row — 3 cards */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {topRowRoles.map((role, i) => (
            <RoleCard key={role} role={role} delay={120 + i * 60} />
          ))}
        </div>

        {/* Bottom Row — 2 cards, centered */}
        <div className="flex justify-center gap-3 mb-9">
          {bottomRowRoles.map((role, i) => (
            <div key={role} className="w-[calc((100%-0.75rem)/3)]">
              <RoleCard role={role} delay={300 + i * 60} />
            </div>
          ))}
        </div>

        {/* Branding */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "440ms" }}>
          <p className="text-[8.5px] font-normal tracking-[0.18em] text-muted-foreground/35">
            WINGATE INSTITUTE · מכון וינגייט
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
