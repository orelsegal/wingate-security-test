import { useNavigate } from "react-router-dom";
import { Shield, BookOpen, Heart, Dumbbell, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Background — deep green radial + subtle track pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 start-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,hsl(152_42%_28%/0.07)_0%,transparent_65%)]" />
        <div className="absolute -bottom-32 -end-24 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,hsl(152_42%_28%/0.04)_0%,transparent_70%)]" />
        <div className="absolute inset-0 pattern-track" />
      </div>

      <div className="w-full max-w-[440px] px-6 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-10 animate-fade-in-up">
          <div className="w-[72px] h-[72px] rounded-2xl bg-card border border-border p-3 flex items-center justify-center shadow-sm">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Hero text */}
        <div className="text-center mb-12 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <p className="text-[14px] font-light text-muted-foreground tracking-wide">
            מערכת מעקב אקדמי
          </p>
          <h1 className="text-[22px] md:text-[26px] font-medium text-foreground tracking-tight mt-3">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed mt-4 max-w-[320px] mx-auto">
            ניהול ובקרת התקדמות לימודית — מכון וינגייט
          </p>
        </div>

        {/* Role cards */}
        <div className="space-y-2.5 mb-8">
          <p className="text-[12px] text-muted-foreground/50 text-center mb-4 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            בחירת תפקיד לכניסה למערכת
          </p>

          {demoUsers.map((demoUser, i) => {
            const Icon = roleIcons[demoUser.role];
            return (
              <button
                key={demoUser.role}
                onClick={() => handleLogin(demoUser)}
                className="w-full group relative bg-card border border-border rounded-2xl p-4 md:p-5 flex items-center gap-4 text-start transition-all duration-200 hover:border-primary/30 hover:shadow-[0_4px_20px_-4px_hsl(152_42%_28%/0.12)] active:scale-[0.995] cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${220 + i * 70}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors duration-200">
                  <Icon className="h-[20px] w-[20px] text-muted-foreground group-hover:text-primary transition-colors duration-200" strokeWidth={1.6} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground leading-tight">
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-primary/10">
                  <ArrowLeft className="h-4 w-4 text-primary" />
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "520ms" }}>
          <p className="text-[12px] text-muted-foreground/50 leading-relaxed">
            יש לבחור תפקיד כדי להמשיך
          </p>
        </div>

        {/* Bottom branding */}
        <div className="mt-14 text-center animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 border border-border/50">
            <div className="w-4 h-4 rounded overflow-hidden">
              <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] text-muted-foreground/60">
              האקדמיה למצוינות בספורט · מכון וינגייט
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
