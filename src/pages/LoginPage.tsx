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
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 start-0 w-full h-[340px] bg-gradient-to-b from-primary/[0.04] to-transparent" />
        <div className="absolute -bottom-40 start-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,hsl(152_42%_28%/0.03)_0%,transparent_70%)]" />
      </div>

      <div className="w-full max-w-[420px] px-6 relative z-10">
        {/* Logo + Title — compact hero */}
        <div className="flex flex-col items-center mb-8 animate-fade-in-up pt-2">
          <div className="w-16 h-16 rounded-2xl bg-card border border-primary/15 p-2.5 flex items-center justify-center shadow-sm mb-5">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-[22px] md:text-[26px] font-medium text-primary tracking-tight text-center leading-snug">
            האקדמיה למצוינות בספורט
          </h1>
          <p className="text-[13px] text-foreground/60 leading-relaxed mt-1.5 text-center">
            ניהול ובקרת התקדמות לימודית — מכון וינגייט
          </p>
        </div>

        {/* Role cards */}
        <div className="space-y-2.5 mb-6">
          <p className="text-[11px] text-muted-foreground/60 text-center mb-3 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            בחירת תפקיד לכניסה
          </p>

          {demoUsers.map((demoUser, i) => {
            const Icon = roleIcons[demoUser.role];
            return (
              <button
                key={demoUser.role}
                onClick={() => handleLogin(demoUser)}
                className="w-full group relative bg-card border border-primary/10 rounded-2xl p-4 flex items-center gap-3.5 text-start transition-all duration-200 hover:border-primary/25 hover:shadow-[0_4px_20px_-6px_hsl(152_42%_28%/0.15)] active:scale-[0.995] cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${180 + i * 60}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/[0.06] flex items-center justify-center shrink-0 group-hover:bg-primary/[0.12] transition-colors duration-200">
                  <Icon className="h-[18px] w-[18px] text-primary/70 group-hover:text-primary transition-colors duration-200" strokeWidth={1.5} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground leading-tight">
                    {roleLabels[demoUser.role]}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                    {roleDescriptions[demoUser.role]}
                  </p>
                </div>

                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-primary/10">
                  <ArrowLeft className="h-3.5 w-3.5 text-primary" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom branding */}
        <div className="mt-10 text-center animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/[0.04] border border-primary/[0.08]">
            <div className="w-3.5 h-3.5 rounded overflow-hidden">
              <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] text-muted-foreground/70">
              האקדמיה למצוינות בספורט · מכון וינגייט
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
