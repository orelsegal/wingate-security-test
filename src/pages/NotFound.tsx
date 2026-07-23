import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
      <div className="flex flex-col items-center text-center px-8 animate-fade-in-up space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-muted/60 flex items-center justify-center animate-float">
          <Compass className="h-9 w-9 text-muted-foreground/40" strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[36px] font-bold text-foreground/20 tabular-nums leading-none">404</h1>
          <p className="text-[16px] font-semibold text-foreground">העמוד לא נמצא</p>
          <p className="text-[12px] text-muted-foreground max-w-[220px] leading-relaxed">
            הדף שחיפשת לא קיים. ייתכן שהוסר או שהכתובת שגויה.
          </p>
        </div>
        <Button
          onClick={() => navigate("/")}
          size="sm"
          className="gap-2 animate-scale-in"
          style={{ animationDelay: "200ms" }}
        >
          חזרה לדף הראשי
        </Button>
        <p className="text-[9px] text-muted-foreground/30 font-normal tracking-wider mt-4">
          מסלול · האקדמיה למצוינות בספורט
        </p>
      </div>
    </div>
  );
};

export default NotFound;
