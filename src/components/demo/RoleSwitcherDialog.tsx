/**
 * RoleSwitcherDialog — modal with 3 large role cards used to instantly
 * switch the active demo identity. No password, no email, just one tap.
 */
import { useNavigate } from "react-router-dom";
import { Briefcase, GraduationCap, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { DEMO_COORDINATOR, DEMO_STAFF, DEMO_STUDENT, demoRoleHome } from "@/lib/demoUsers";
import type { AppUser } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES: Array<{
  user: AppUser;
  title: string;
  subtitle: string;
  icon: typeof Users;
  tint: string;
  bg: string;
}> = [
  {
    user: DEMO_COORDINATOR,
    title: "כניסה כרכז/ת",
    subtitle: "מרכז שליטה — ניהול מפגשים, צוות וספורטאים",
    icon: Users,
    tint: "hsl(220, 70%, 55%)",
    bg: "hsl(220, 70%, 55% / 0.08)",
  },
  {
    user: DEMO_STAFF,
    title: "כניסה כמתרגל/ת",
    subtitle: "המפגשים שלי, אישורים וסיכומים",
    icon: Briefcase,
    tint: "hsl(160, 60%, 40%)",
    bg: "hsl(160, 60%, 40% / 0.08)",
  },
  {
    user: DEMO_STUDENT,
    title: "כניסה כתלמיד/ה",
    subtitle: "המרחב שלי — בקשות, מפגשים ועדכונים",
    icon: GraduationCap,
    tint: "hsl(280, 60%, 55%)",
    bg: "hsl(280, 60%, 55% / 0.08)",
  },
];

const RoleSwitcherDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { user, demoLogin } = useAuth();

  const handlePick = (u: AppUser) => {
    demoLogin(u);
    onOpenChange(false);
    const home = demoRoleHome[u.role as UserRole] ?? "/login";
    navigate(home, { replace: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-[520px] p-0 gap-0">
        <DialogHeader className="p-5 pb-3 text-right">
          <DialogTitle className="text-[16px]">החלפת תפקיד דמו</DialogTitle>
          <DialogDescription className="text-[12px]">
            בחר/י תפקיד כדי להיכנס מיידית למרחב המתאים. ללא סיסמה.
          </DialogDescription>
        </DialogHeader>
        <div className="p-5 pt-2 space-y-2.5">
          {ROLES.map(({ user: u, title, subtitle, icon: Icon, tint, bg }) => {
            const active = user?.role === u.role;
            return (
              <button
                key={u.role}
                onClick={() => handlePick(u)}
                className={cn(
                  "w-full text-right flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                  "hover:shadow-md hover:-translate-y-px active:scale-[0.99]",
                  active ? "border-foreground/30 bg-accent/40" : "border-border hover:border-foreground/20",
                )}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: bg, color: tint }}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                    {title}
                    {active && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/70">
                        נוכחי
                      </span>
                    )}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleSwitcherDialog;
