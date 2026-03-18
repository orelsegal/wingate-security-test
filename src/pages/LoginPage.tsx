import { useNavigate } from "react-router-dom";
import { Shield, BookOpen, Heart, Dumbbell, ChevronLeft } from "lucide-react";
import { useAuth, demoUsers, roleLabels, roleDescriptions } from "@/context/AuthContext";
import type { UserRole, AppUser } from "@/context/AuthContext";
import wingateLogoSrc from "@/assets/wingate-logo.png";

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield,
  teacher: BookOpen,
  parent: Heart,
  coach: Dumbbell,
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (user: AppUser) => {
    login(user);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-[420px] space-y-10">
        {/* Header */}
        <div className="text-center space-y-5 animate-fade-in-up">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-card border border-border p-3 flex items-center justify-center shadow-sm">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>
          <div className="space-y-2">
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
              האקדמיה למצוינות בספורט
            </h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              מערכת מעקב אקדמי · מכון וינגייט
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="flex-1 h-px bg-border" />
          <span className="text-[12px] text-muted-foreground/60 px-1">כניסה למערכת</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          {demoUsers.map((demoUser, i) => {
            const Icon = roleIcons[demoUser.role];
            return (
              <button
                key={demoUser.role}
                onClick={() => handleLogin(demoUser)}
                className="w-full card-premium p-5 flex items-center gap-4 text-start hover:border-primary/25 transition-all duration-150 group cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors duration-150">
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-150" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground">
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors duration-150 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-muted-foreground/40 text-center leading-relaxed">
          גרסת הדגמה · אין צורך בסיסמה
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
