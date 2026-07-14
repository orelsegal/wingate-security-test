import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, GraduationCap, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { bagrutRoadmap, type BagrutSection } from "@/data/bagrutRoadmap";

/**
 * מפת הדרך לבגרות — read-only snapshot of the school's bagrut tracking sheet.
 * Admin + teacher only (personal data + grades). Data is a local verbatim
 * snapshot in src/data/bagrutRoadmap.ts — no live Google Sheets dependency.
 */

// Freeze the first identity columns while scrolling horizontally.
const STICKY_COUNT = 3;
const STICKY_WIDTHS = [44, 128, 104]; // px, for #, surname, first-name

const rightOffset = (i: number) =>
  STICKY_WIDTHS.slice(0, i).reduce((a, b) => a + b, 0);

const BagrutRoadmapPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Reuse the existing permission model: admin/developer/teacher only.
  const allowed = user?.role === "admin" || user?.role === "developer" || user?.role === "teacher";
  useEffect(() => {
    if (user && !allowed) navigate("/", { replace: true });
  }, [user, allowed, navigate]);

  const [activeId, setActiveId] = useState(bagrutRoadmap.sections[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const section: BagrutSection | undefined = useMemo(
    () => bagrutRoadmap.sections.find((s) => s.id === activeId),
    [activeId],
  );

  // Search by student name (surname col 1 + first-name col 2).
  const rows = useMemo(() => {
    if (!section) return [];
    const q = query.trim();
    if (!q) return section.rows;
    return section.rows.filter((r) => `${r[1] ?? ""} ${r[2] ?? ""}`.includes(q));
  }, [section, query]);

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center" dir="rtl">
        <Lock className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
        <p className="text-[14px] font-medium text-foreground">אין לך הרשאה לצפות בעמוד זה</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-primary" strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-[20px] md:text-[22px] font-semibold text-foreground tracking-tight leading-tight">
              מפת הדרך לבגרות
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              תמונת מצב מרוכזת של מקצועות ובגרויות · לצפייה בלבד
            </p>
          </div>
        </div>
        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם תלמיד..."
            className="w-full h-9 pr-9 pl-3 rounded-lg border border-border bg-card text-[13px] text-foreground outline-none focus:border-primary/40"
          />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-4 bg-muted/40 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {bagrutRoadmap.sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
              activeId === s.id
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.title}
            <span className="mr-1.5 text-[11px] text-muted-foreground/70">({s.rows.length})</span>
          </button>
        ))}
      </div>

      {section && (
        <>
          <p className="text-[11.5px] text-muted-foreground mb-2">
            מציג {rows.length} מתוך {section.rows.length} תלמידים
            {query.trim() && ` · חיפוש: "${query.trim()}"`}
          </p>

          {/* Scrollable table */}
          <div className="border border-border rounded-xl overflow-auto max-h-[calc(100vh-260px)] bg-card">
            <table className="border-collapse text-[12px]" style={{ minWidth: "max-content" }}>
              <thead>
                <tr>
                  {section.columns.map((col, ci) => {
                    const sticky = ci < STICKY_COUNT;
                    return (
                      <th
                        key={ci}
                        className="sticky top-0 z-20 bg-muted text-foreground font-semibold text-start px-3 py-2 border-b border-l border-border whitespace-nowrap"
                        style={
                          sticky
                            ? {
                                position: "sticky",
                                right: rightOffset(ci),
                                zIndex: 30,
                                width: STICKY_WIDTHS[ci],
                                minWidth: STICKY_WIDTHS[ci],
                              }
                            : undefined
                        }
                        title={col}
                      >
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={section.columns.length} className="px-4 py-10 text-center text-muted-foreground">
                      אין תוצאות לחיפוש
                    </td>
                  </tr>
                ) : (
                  rows.map((row, ri) => (
                    <tr key={ri} className="even:bg-muted/20 hover:bg-accent/30">
                      {section.columns.map((_, ci) => {
                        const sticky = ci < STICKY_COUNT;
                        const val = row[ci] ?? "";
                        return (
                          <td
                            key={ci}
                            className={`px-3 py-1.5 border-b border-l border-border/60 whitespace-nowrap ${
                              sticky ? "font-medium text-foreground" : "text-foreground/90"
                            }`}
                            style={
                              sticky
                                ? {
                                    position: "sticky",
                                    right: rightOffset(ci),
                                    zIndex: 10,
                                    width: STICKY_WIDTHS[ci],
                                    minWidth: STICKY_WIDTHS[ci],
                                    background: "inherit",
                                    backgroundColor: ri % 2 ? "hsl(var(--muted) / 0.2)" : "hsl(var(--card))",
                                  }
                                : undefined
                            }
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[10.5px] text-muted-foreground/60 mt-3">
            {bagrutRoadmap.note}
          </p>
        </>
      )}
    </div>
  );
};

export default BagrutRoadmapPage;
