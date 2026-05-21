/**
 * RoleSwitcherDialog — premium role switcher.
 *
 * Desktop: centered modal.
 * Mobile:  bottom sheet (vaul Drawer) for thumb-reach.
 *
 * One tap → demoLogin → toast → redirect to that role's dashboard.
 */
import { useNavigate } from "react-router-dom";
import { Briefcase, GraduationCap, Users2, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useAuth, type UserRole, type AppUser } from "@/context/AuthContext";
import { DEMO_COORDINATOR, DEMO_STAFF, DEMO_STUDENT, demoRoleHome } from "@/lib/demoUsers";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoleCard {
  user: AppUser;
  title: string;
  short: string;
  description: string;
  icon: typeof Users2;
  tint: string;          // hsl(...)
  toastLabel: string;
}

const ROLES: RoleCard[] = [
  {
    user: DEMO_COORDINATOR,
    title: "כניסה כרכז/ת",
    short: "רכז/ת",
    description: "ניהול מלא, בקשות, שיבוצים וסטטיסטיקות",
    icon: Users2,
    tint: "hsl(220, 70%, 55%)",
    toastLabel: "רכז/ת",
  },
  {
    user: DEMO_STAFF,
    title: "כניסה כמתרגל/ת",
    short: "מתרגל/ת",
    description: "מפגשים, אישורים, סיכומים ותלמידים משויכים",
    icon: Briefcase,
    tint: "hsl(160, 55%, 42%)",
    toastLabel: "מתרגל/ת",
  },
  {
    user: DEMO_STUDENT,
    title: "כניסה כתלמיד/ה",
    short: "תלמיד/ה",
    description: "בקשות תמיכה, מפגשים אישיים ועדכונים",
    icon: GraduationCap,
    tint: "hsl(30, 80%, 50%)",
    toastLabel: "תלמיד/ה",
  },
];

const RoleSwitcherDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { user, demoLogin } = useAuth();
  const isMobile = useIsMobile();

  const pick = (card: RoleCard) => {
    demoLogin(card.user);
    onOpenChange(false);
    toast.success(`עברת למצב ${card.toastLabel}`);
    const home = demoRoleHome[card.user.role as UserRole] ?? "/demo";
    // Small delay so the drawer close animation doesn't fight the route swap.
    requestAnimationFrame(() => navigate(home, { replace: true }));
  };

  const Cards = (
    <div className="space-y-3">
      {ROLES.map((c) => {
        const active = user?.role === c.user.role;
        return (
          <button
            key={c.user.role}
            onClick={() => pick(c)}
            className={cn(
              "w-full text-right group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-150",
              "hover:-translate-y-[1px] hover:shadow-[0_8px_24px_-12px_hsla(0,0%,0%,0.18)] active:scale-[0.99]",
              active
                ? "border-transparent bg-accent/40 ring-2 ring-offset-1 ring-offset-background"
                : "border-border hover:border-foreground/25 bg-card",
            )}
            style={active ? ({ "--tw-ring-color": c.tint } as React.CSSProperties) : undefined}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
              style={{ background: `${c.tint}15`, color: c.tint }}
            >
              <c.icon className="h-[22px] w-[22px]" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-semibold text-foreground truncate">{c.title}</p>
                {active && (
                  <span
                    className="inline-flex items-center gap-1 text-[9.5px] tracking-wide font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ background: `${c.tint}1f`, color: c.tint }}
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    נוכחי
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{c.description}</p>
            </div>
            <span
              className="hidden sm:inline-flex items-center justify-center h-8 px-3 rounded-lg text-[11.5px] font-semibold shrink-0 transition-opacity"
              style={{ background: `${c.tint}`, color: "white" }}
            >
              כניסה
            </span>
          </button>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent dir="rtl" className="px-0 pb-6 max-h-[88vh]">
          <DrawerHeader className="text-right px-5 pt-2 pb-3">
            <DrawerTitle className="text-[16px]">החלפת תפקיד</DrawerTitle>
            <DrawerDescription className="text-[12px]">
              בחר/י תפקיד כדי להיכנס מיידית — ללא סיסמה.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">{Cards}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-[540px] p-0 gap-0">
        <DialogHeader className="p-5 pb-3 text-right">
          <DialogTitle className="text-[17px]">החלפת תפקיד</DialogTitle>
          <DialogDescription className="text-[12px]">
            בחר/י תפקיד כדי להיכנס מיידית למרחב המתאים.
          </DialogDescription>
        </DialogHeader>
        <div className="p-5 pt-2">{Cards}</div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleSwitcherDialog;
