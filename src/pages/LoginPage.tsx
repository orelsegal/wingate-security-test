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
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 start-0 w-full h-[320px] bg-gradient-to-b from-primary/[0.04] to-transparent" />
        <div className="absolute bottom-0 end-0 w-[400px] h-[400px] rounded-full bg-primary/[0.02] blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="w-full max-w-[380px] px-6 relative z-10">

        {/* ── Hero: Logo + Title ── */}
        <div className="flex flex-col items-center animate-fade-in-up">
          <div className="w-[52px] h-[52px] rounded-2xl bg-card border border-border p-2 flex items-center justify-center shadow-sm">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-[19px] md:text-[22px] font-semibold text-foreground tracking-tight text-center leading-snug mt-4">
            האקדמיה למצוינות בספורט
          </h1>

          <p className="text-[13px] text-muted-foreground leading-relaxed mt-1.5 text-center">
            ניהול ובקרת התקדמות לימודית — מכון וינגייט
          </p>
        </div>

        {/* ── Role cards ── */}
        <div className="mt-8">
          <p className="text-[11px] text-muted-foreground/50 text-center mb-3.5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            בחירת תפקיד לכניסה
          </p>

          <div className="space-y-2.5">
            {demoUsers.map((demoUser, i) => {
              const Icon = roleIcons[demoUser.role];
              return (
                <button
                  key={demoUser.role}
                  onClick={() => handleLogin(demoUser)}
                  className="w-full group relative bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 text-start transition-all duration-200 hover:border-primary/25 hover:shadow-[0_6px_24px_-6px_hsl(150_20%_20%/0.1)] active:scale-[0.998] cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${120 + i * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/[0.06] flex items-center justify-center shrink-0 group-hover:bg-primary/[0.1] transition-colors duration-200">
                    <Icon className="h-[18px] w-[18px] text-primary/60 group-hover:text-primary transition-colors duration-200" strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-foreground leading-tight">
                      {roleLabels[demoUser.role]}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
                      {roleDescriptions[demoUser.role]}
                    </p>
                  </div>

                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-primary/[0.06]">
                    <ArrowLeft className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bottom branding ── */}
        <div className="mt-10 text-center animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/50 border border-border/60">
            <div className="w-3 h-3 rounded overflow-hidden opacity-50">
              <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[10px] text-muted-foreground/40 font-medium">
              מכון וינגייט · תשפ״ה
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
