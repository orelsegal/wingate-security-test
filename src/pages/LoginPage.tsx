import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, BookOpen, Heart, Dumbbell, ArrowLeft, Sparkles } from "lucide-react";
import { useAuth, demoUsers, roleLabels, roleDescriptions } from "@/context/AuthContext";
import type { UserRole, AppUser } from "@/context/AuthContext";
import wingateLogoSrc from "@/assets/wingate-logo.png";

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield,
  teacher: BookOpen,
  parent: Heart,
  coach: Dumbbell,
};

const roleCircleColors: Record<UserRole, string> = {
  admin: "bg-[hsl(150,20%,92%)]",
  teacher: "bg-[hsl(35,40%,92%)]",
  parent: "bg-[hsl(350,30%,93%)]",
  coach: "bg-[hsl(25,45%,91%)]",
};

const roleIconColors: Record<UserRole, string> = {
  admin: "text-primary",
  teacher: "text-[hsl(35,50%,45%)]",
  parent: "text-[hsl(350,40%,50%)]",
  coach: "text-[hsl(25,55%,45%)]",
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
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[hsl(40,25%,96%)] flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Decorative organic background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large soft circle top-right */}
        <div className="absolute -top-[120px] -left-[80px] w-[400px] h-[400px] rounded-full bg-primary/[0.04]" />
        {/* Medium circle bottom-left */}
        <div className="absolute -bottom-[60px] -right-[100px] w-[300px] h-[300px] rounded-full bg-[hsl(35,40%,92%)]/60" />
        {/* Small accent circle */}
        <div className="absolute top-[15%] right-[8%] w-[80px] h-[80px] rounded-full bg-primary/[0.06]" />
        <div className="absolute bottom-[25%] left-[12%] w-[50px] h-[50px] rounded-full bg-[hsl(25,45%,90%)]/50" />
        {/* Decorative star/sparkle elements inspired by yoga pin */}
        <svg className="absolute top-[12%] left-[18%] w-5 h-5 text-primary/10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
        </svg>
        <svg className="absolute bottom-[18%] right-[20%] w-4 h-4 text-primary/8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
        </svg>
        {/* Leaf-like decorative element */}
        <svg className="absolute top-[60%] left-[6%] w-12 h-12 text-primary/[0.05] rotate-45" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
      </div>

      <div className="w-full max-w-[380px] px-6 relative z-10">

        {/* ── Logo in soft pastel circle ── */}
        <div className="flex justify-center mb-6 animate-fade-in-up">
          <div className="relative">
            <div className="w-[72px] h-[72px] rounded-full bg-[hsl(40,20%,94%)] border border-[hsl(40,15%,90%)] flex items-center justify-center shadow-[0_4px_20px_-4px_hsl(40,20%,50%,0.1)]">
              <div className="w-[44px] h-[44px] rounded-full bg-card flex items-center justify-center shadow-[0_2px_8px_-2px_hsl(150,20%,30%,0.08)]">
                <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-7 h-7 object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <h1 className="text-[22px] font-bold text-primary tracking-tight leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed mt-2 max-w-[300px] mx-auto">
            מערכת חכמה לניהול ובקרת התקדמות לימודית
          </p>
        </div>

        {/* ── Role Cards – pastel circle style ── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {demoUsers.map((demoUser, i) => {
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
                className={`group relative bg-card rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center transition-all duration-300 cursor-pointer animate-fade-in-up ${
                  isSelected
                    ? "shadow-[0_8px_30px_-6px_hsl(150,30%,30%,0.15)] scale-[0.97] ring-1 ring-primary/20"
                    : "shadow-[0_2px_12px_-4px_hsl(40,20%,40%,0.08)] hover:shadow-[0_8px_30px_-6px_hsl(150,20%,30%,0.12)] hover:-translate-y-1"
                } border ${isActive ? "border-primary/20" : "border-[hsl(40,15%,91%)]"}`}
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                {/* Pastel circle icon – inspired by Pin 1 */}
                <div className={`w-12 h-12 rounded-full ${roleCircleColors[demoUser.role]} flex items-center justify-center transition-all duration-300 ${
                  isActive ? "scale-110 shadow-[0_4px_16px_-4px_hsl(150,20%,40%,0.15)]" : ""
                }`}>
                  <Icon className={`h-5 w-5 ${roleIconColors[demoUser.role]} transition-all duration-300`} strokeWidth={1.5} />
                </div>

                <div>
                  <p className={`text-[13px] font-semibold leading-tight transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-foreground/85"
                  }`}>
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-snug">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>

                {/* Active indicator dot */}
                <div className={`absolute top-2.5 start-2.5 w-2 h-2 rounded-full bg-primary transition-all duration-300 ${
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`} />
              </button>
            );
          })}
        </div>

        {/* ── System capability hint ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: "420ms" }}>
          <div className="flex items-center justify-center gap-2 py-2.5 px-3">
            <Sparkles className="h-3 w-3 text-primary/30 shrink-0" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground/45 font-medium leading-relaxed">
              מעקב חכם · מקצועות · חוסרים · מפות דרכים
            </span>
          </div>
        </div>

        {/* ── Bottom branding ── */}
        <div className="mt-4 text-center animate-fade-in-up" style={{ animationDelay: "480ms" }}>
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
