/**
 * DemoEntryPage — temporary one-tap demo role picker.
 *
 * Replaces the email/password login while the real auth flow is rebuilt.
 * One tap → set demo user in localStorage → navigate to the role dashboard.
 * No password, no email input, no second step.
 */
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Briefcase, GraduationCap, Users2 } from "lucide-react";
import { toast } from "sonner";
import WingateBadge from "@/components/WingateBadge";
import { useAuth } from "@/context/AuthContext";
import { DEMO_COORDINATOR, DEMO_STAFF, DEMO_STUDENT, demoRoleHome } from "@/lib/demoUsers";
import type { AppUser } from "@/context/AuthContext";

const cards: Array<{
  user: AppUser;
  title: string;
  subtitle: string;
  blurb: string;
  icon: typeof Users2;
  tint: string;
}> = [
  {
    user: DEMO_COORDINATOR,
    title: "כניסה כרכזת",
    subtitle: "Coordinator",
    blurb: "מרכז שליטה מלא — מפגשים, צוות, ספורטאים ודוחות",
    icon: Users2,
    tint: "hsl(220, 70%, 55%)",
  },
  {
    user: DEMO_STAFF,
    title: "כניסה כצוות / מורה פרטי",
    subtitle: "Staff · Tutor",
    blurb: "המפגשים שלי, אישורים, סיכומים וספורטאים משויכים",
    icon: Briefcase,
    tint: "hsl(160, 55%, 42%)",
  },
  {
    user: DEMO_STUDENT,
    title: "כניסה כספורטאי",
    subtitle: "Student",
    blurb: "הבקשות שלי, המפגשים שלי והעדכונים שלי",
    icon: GraduationCap,
    tint: "hsl(30, 80%, 50%)",
  },
];

const DemoEntryPage = () => {
  const navigate = useNavigate();
  const { user, demoLogin } = useAuth();
  // /demo is the always-on role hub. /login auto-redirects signed-in users.
  const isHub = typeof window !== "undefined" && window.location.pathname.startsWith("/demo");

  useEffect(() => {
    if (!isHub && user && demoRoleHome[user.role]) {
      navigate(demoRoleHome[user.role]!, { replace: true });
    }
  }, [user, navigate, isHub]);

  const enterAs = (u: AppUser) => {
    demoLogin(u);
    const label = u.role === "coordinator" ? "רכז/ת" : u.role === "staff" ? "מתרגל/ת" : "תלמיד/ה";
    toast.success(`עברת למצב ${label}`);
    navigate(demoRoleHome[u.role]!, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12" dir="rtl">
      <div className="w-full max-w-[1100px]">
        <div className="flex flex-col items-center mb-10">
          <WingateBadge size="md" />
          <h1 className="text-[22px] font-semibold text-foreground mt-5 tracking-tight">מרכז דמו</h1>
          <p className="text-[12.5px] text-muted-foreground mt-2 text-center max-w-md">
            בחרו תפקיד כדי להיכנס מיידית. ניתן להחליף תפקיד בכל רגע מהכותרת או מהסרגל הצדדי.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((c) => {
            const active = user?.role === c.user.role;
            return (
              <button
                key={c.user.role}
                onClick={() => enterAs(c.user)}
                className={`group relative bg-card border rounded-2xl p-7 text-start transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_32px_-14px_hsla(0,0%,0%,0.22)] active:scale-[0.99] ${
                  active ? "border-foreground/30 bg-accent/30" : "border-border hover:border-foreground/25"
                }`}
              >
                {active && (
                  <span
                    className="absolute top-4 start-4 text-[9.5px] tracking-wide font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ background: `${c.tint}1f`, color: c.tint }}
                  >
                    נוכחי
                  </span>
                )}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-105"
                  style={{ background: `${c.tint}15`, color: c.tint }}
                >
                  <c.icon className="h-6 w-6" strokeWidth={1.7} />
                </div>
                <p className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground/70 font-medium mb-1.5">
                  {c.subtitle}
                </p>
                <h2 className="text-[17px] font-semibold text-foreground leading-snug">{c.title}</h2>
                <p className="text-[12.5px] text-muted-foreground mt-2.5 leading-relaxed">{c.blurb}</p>
                <div
                  className="mt-6 inline-flex items-center justify-center h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white shadow-sm transition-transform group-hover:scale-[1.02]"
                  style={{ background: c.tint }}
                >
                  כניסה
                </div>
              </button>
            );
          })}
        </div>


        <p className="text-center text-[10.5px] text-muted-foreground/60 mt-10 tracking-wide">
          DEMO MODE · ניתן להחליף תפקיד בכל עת מהתפריט
        </p>
      </div>
    </div>
  );
};

export default DemoEntryPage;
