/**
 * Literature70Shell — מעטפת ויזואלית לספרות 70% תואמת לעיצוב של "לרוץ עם מילים" (30%):
 * סרגל נייבי דביק, פס התקדמות, תפריט עליון, צ'יפים ליחידות 1–8, ובאנר מורה.
 */
import { ReactNode, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, Map, Award, Notebook, ArrowRight } from "lucide-react";

import units from "@/lib/literature70Units.json";
import "@/larutz/larutz.css";

type Unit = { id: string; number: number; title: string };

type TopKey = "landing" | "dashboard" | "unit" | "rubric" | "portfolio";

const TOP_NAV: { key: TopKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "מסלול היחידות", icon: Map },
  { key: "unit",      label: "יחידה נוכחית",  icon: BookOpen },
  { key: "rubric",    label: "מחוון בגרות",   icon: Award },
  { key: "portfolio", label: "מחברת",         icon: Notebook },
];

type Props = {
  active: TopKey;
  currentUnitId?: string;
  children: ReactNode;
};

const Literature70Shell = ({ active, currentUnitId, children }: Props) => {
  const navigate = useNavigate();
  const { subjectName } = useParams<{ subjectName: string }>();
  const decoded = decodeURIComponent(subjectName || "ספרות");

  const allUnits = units as Unit[];

  // Progress from localStorage (same source as roadmap)
  const { done, pct } = useMemo(() => {
    let map: Record<string, boolean> = {};
    try { map = JSON.parse(localStorage.getItem("lit70-done") || "{}"); } catch {}
    const d = allUnits.filter((u) => map[u.id]).length;
    return { done: d, pct: Math.round((d / allUnits.length) * 100) };
  }, [allUnits]);

  const role = (typeof window !== "undefined" && localStorage.getItem("wingate_role")) || "student";
  const isTeacher = role === "admin" || role === "teacher";

  const goTab = (key: TopKey) => {
    if (key === "dashboard") {
      navigate(`/subjects/${encodeURIComponent(decoded)}/literature/70`);
    } else if (key === "unit") {
      const target = currentUnitId || allUnits[0]?.id;
      if (target) navigate(`/subjects/${encodeURIComponent(decoded)}/literature/70/${encodeURIComponent(target)}`);
    } else {
      // rubric / portfolio — לעת עתה מובילים למסלול עד שייבנו עמודים ייעודיים
      navigate(`/subjects/${encodeURIComponent(decoded)}/literature/70`);
    }
  };

  const onUnit = active === "unit";

  return (
    <div dir="rtl" className="min-h-screen font-heebo bg-[#F8F6F2]">
      {/* Wingate breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-border text-[11px] text-muted-foreground sticky top-0 z-[55]">
        <button
          onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/literature`)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          חזרה למפת הדרכים — ספרות 70%
        </button>
        <span className="text-border">|</span>
        <span>{decoded}</span>
        <span>›</span>
        <span className="text-foreground font-semibold">בגרות חיצונית 70%</span>
      </div>

      {/* Teacher banner */}
      {isTeacher && (
        <div className="bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span>👁️</span>
            <span>מצב מורה — מעקב כיתה בספרות 70%</span>
          </div>
        </div>
      )}

      {/* Top navy bar */}
      <header className="sticky top-[33px] z-50 bg-navy text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => goTab("dashboard")}
            className="flex items-center gap-2 shrink-0 hover:opacity-80"
          >
            <span className="text-xl">📖</span>
            <span className="font-black text-sm hidden sm:block text-white">ספרות לבגרות — 70%</span>
          </button>

          {/* Progress pill */}
          <div className="hidden md:flex items-center gap-2 bg-navy-700 rounded-full px-3 py-1">
            <div className="w-20 h-1.5 bg-navy-600 rounded-full overflow-hidden">
              <div className="h-full bg-terracotta transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-sand-200">{done}/{allUnits.length} יחידות</span>
          </div>

          {/* Tabs */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {TOP_NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => goTab(key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active === key
                    ? "bg-terracotta text-white"
                    : "text-sand-200 hover:bg-navy-700 hover:text-white"
                }`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Unit chips strip — מוצג כשנמצאים בתוך יחידה */}
        {onUnit && (
          <div className="bg-navy-700 border-t border-navy-600 px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => goTab("dashboard")}
              className="text-[11px] text-sand-300 hover:text-white shrink-0"
            >
              ← מסלול
            </button>
            {allUnits.map((u) => {
              const isCurrent = u.id === currentUnitId;
              return (
                <button
                  key={u.id}
                  onClick={() =>
                    navigate(
                      `/subjects/${encodeURIComponent(decoded)}/literature/70/${encodeURIComponent(u.id)}`,
                    )
                  }
                  title={u.title}
                  className={`shrink-0 w-5 h-5 rounded-full text-[9px] font-black transition-all ${
                    isCurrent
                      ? "bg-terracotta text-white"
                      : "bg-navy-600 text-sand-300 hover:bg-navy-500"
                  }`}
                >
                  {u.number}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main>{children}</main>
    </div>
  );
};

export default Literature70Shell;
