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
      {/* Subtle background warmth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 start-0 w-full h-[280px] bg-gradient-to-b from-primary/[0.03] to-transparent" />
      </div>

      <div className="w-full max-w-[400px] px-6 relative z-10">

        {/* ── Hero: Logo → Title → Subtitle ── */}
        <div className="flex flex-col items-center animate-fade-in-up">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl bg-card border border-primary/12 p-2 flex items-center justify-center shadow-sm">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>

          {/* Title */}
          <h1 className="text-[20px] md:text-[24px] font-medium text-primary tracking-tight text-center leading-snug mt-4">
            האקדמיה למצוינות בספורט
          </h1>

          {/* Subtitle */}
          <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 text-center">
            ניהול ובקרת התקדמות לימודית — מכון וינגייט
          </p>
        </div>

        {/* ── Role cards ── */}
        <div className="mt-7">
          <p className="text-[11px] text-muted-foreground/50 text-center mb-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            בחירת תפקיד לכניסה
          </p>

          <div className="space-y-2">
            {demoUsers.map((demoUser, i) => {
              const Icon = roleIcons[demoUser.role];
              return (
                <button
                  key={demoUser.role}
                  onClick={() => handleLogin(demoUser)}
                  className="w-full group relative bg-card border border-border rounded-2xl p-3.5 flex items-center gap-3 text-start transition-all duration-200 hover:border-primary/25 hover:shadow-[0_4px_16px_-4px_hsl(150_20%_20%/0.1)] active:scale-[0.997] cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${140 + i * 50}ms` }}
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/[0.06] flex items-center justify-center shrink-0 group-hover:bg-primary/[0.1] transition-colors duration-200">
                    <Icon className="h-[17px] w-[17px] text-primary/60 group-hover:text-primary transition-colors duration-200" strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-tight">
                      {roleLabels[demoUser.role]}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {roleDescriptions[demoUser.role]}
                    </p>
                  </div>

                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-primary/8">
                    <ArrowLeft className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bottom branding ── */}
        <div className="mt-8 mb-4 text-center animate-fade-in-up" style={{ animationDelay: "420ms" }}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/[0.03] border border-primary/[0.06]">
            <div className="w-3 h-3 rounded overflow-hidden opacity-60">
              <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[10px] text-muted-foreground/50">
              מכון וינגייט
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
