import { useNavigate } from "react-router-dom";
import { Shield, BookOpen, Heart, Dumbbell } from "lucide-react";
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
    <div className="min-h-screen bg-background flex items-center justify-center p-5" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-card border border-border p-2.5 flex items-center justify-center">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">האקדמיה למצוינות בספורט</h1>
            <p className="text-[13px] text-muted-foreground mt-1">מערכת מעקב אקדמי · מכון וינגייט</p>
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <p className="text-[13px] text-muted-foreground text-center">בחר תפקיד להתחברות</p>

          <div className="grid grid-cols-1 gap-2.5">
            {demoUsers.map((demoUser) => {
              const Icon = roleIcons[demoUser.role];
              return (
                <button
                  key={demoUser.role}
                  onClick={() => handleLogin(demoUser)}
                  className="card-premium p-4 flex items-center gap-4 text-start hover:border-primary/30 transition-all duration-150 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors duration-150">
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-150" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-foreground">{roleLabels[demoUser.role]}</span>
                      <span className="text-[11px] text-muted-foreground">· {demoUser.name}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{roleDescriptions[demoUser.role]}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-muted-foreground/50 text-center">
          גרסת הדגמה · אין צורך בסיסמה
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
