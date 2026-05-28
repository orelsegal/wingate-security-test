/**
 * Assessment30Page — הערכה פנימית 30% ספרות
 * Hub page showing all available roadmap units under the 30% assessment
 */
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight, BookOpen, ChevronLeft, Clock, Feather,
  Sparkles, Star, Users, CheckCircle2, Lock
} from "lucide-react";

interface RoadmapCard {
  id: string;
  title: string;
  subtitle: string;
  book: string;
  author: string;
  color: string;
  iconBg: string;
  emoji: string;
  tasks: number;
  estimatedHours: number;
  status: "available" | "coming-soon";
  route: string;
}

const ROADMAPS: RoadmapCard[] = [
  {
    id: "larutz-im-milim",
    title: "לרוץ עם מילים",
    subtitle: "יחידה ספרותית מלאה עם 6 שלבי למידה",
    book: "מישהו לרוץ איתו",
    author: "דוד גרוסמן",
    color: "from-violet-50 to-indigo-50 border-violet-200",
    iconBg: "bg-violet-100",
    emoji: "📖",
    tasks: 6,
    estimatedHours: 3,
    status: "available",
    route: "larutz-im-milim",
  },
  {
    id: "vehu-ha-or",
    title: "בדרך אל האור",
    subtitle: "בקרוב — יחידה על שירת ביאליק",
    book: "שירי ח״נ ביאליק",
    author: "חיים נחמן ביאליק",
    color: "from-amber-50 to-orange-50 border-amber-200",
    iconBg: "bg-amber-100",
    emoji: "✨",
    tasks: 5,
    estimatedHours: 2.5,
    status: "coming-soon",
    route: "",
  },
  {
    id: "agadat-shloshim",
    title: "אגדת שלושה ואחד",
    subtitle: "בקרוב — פרוזה של ש״י עגנון",
    book: "תמול שלשום",
    author: "ש״י עגנון",
    color: "from-emerald-50 to-teal-50 border-emerald-200",
    iconBg: "bg-emerald-100",
    emoji: "🕯️",
    tasks: 6,
    estimatedHours: 3.5,
    status: "coming-soon",
    route: "",
  },
];

const Assessment30Page = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(subjectName || "ספרות");

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1100px] mx-auto" dir="rtl">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-5 flex-wrap">
        <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">בית</button>
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        <button onClick={() => navigate("/subjects")} className="hover:text-foreground transition-colors">מקצועות</button>
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        <button onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}`)} className="hover:text-foreground transition-colors">{decoded}</button>
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        <span className="text-foreground font-medium">הערכה פנימית 30%</span>
      </div>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}`)}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              חזרה לספרות
            </button>
          </div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-tight">
            מפות דרכים — הערכה פנימית
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed max-w-[480px]">
            יחידות הלמידה הבאות מהוות את ה-30% הפנימי בציון הבגרות בספרות. כל יחידה מלווה במשימות, חומרי לימוד וכלים אינטראקטיביים.
          </p>
        </div>
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-[hsl(320,25%,94%)] flex items-center justify-center">
          <Feather className="h-6 w-6 text-[hsl(320,35%,50%)]" strokeWidth={1.6} />
        </div>
      </div>

      {/* ── Info strip ── */}
      <div className="bg-violet-50/60 border border-violet-100 rounded-2xl p-4 mb-7 flex items-center gap-4 flex-wrap">
        {[
          { icon: BookOpen, label: "3 יחידות זמינות", sub: "(1 פעילה)" },
          { icon: Clock,    label: "~9 שעות עבודה",   sub: "סה״כ" },
          { icon: Star,     label: "30% מהבגרות",     sub: "משקל" },
          { icon: Users,    label: "כיתה ד׳ 2026",    sub: "שנת לימודים" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-violet-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[11.5px] font-semibold text-foreground">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Roadmap cards ── */}
      <div className="space-y-4">
        {ROADMAPS.map((card) => {
          const isAvailable = card.status === "available";
          return (
            <div
              key={card.id}
              className={`bg-gradient-to-l ${card.color} border rounded-3xl p-5 md:p-6 transition-all duration-200 ${
                isAvailable ? "hover:shadow-lg cursor-pointer" : "opacity-70"
              }`}
              onClick={() => isAvailable && card.route && navigate(`/subjects/${encodeURIComponent(decoded)}/assessment-30/${card.route}`)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 ${card.iconBg} rounded-2xl flex items-center justify-center shrink-0 text-2xl`}>
                  {card.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[16px] font-bold text-foreground tracking-tight">{card.title}</h3>
                        {!isAvailable && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
                            <Lock className="h-2.5 w-2.5" strokeWidth={2} />
                            בקרוב
                          </span>
                        )}
                        {isAvailable && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />
                            זמין
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{card.subtitle}</p>
                    </div>
                    {isAvailable && (
                      <button className="shrink-0 inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11.5px] font-semibold px-4 py-2 rounded-full transition-colors">
                        כניסה
                        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-5 text-[11px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3" strokeWidth={1.5} />
                      <span className="font-medium text-foreground">{card.book}</span>
                      <span>|</span>
                      {card.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                      {card.tasks} שלבי למידה
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" strokeWidth={1.5} />
                      ~{card.estimatedHours} שעות
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom note ── */}
      <p className="mt-8 text-center text-[10.5px] text-muted-foreground">
        הציון הסופי מחושב מממוצע כל יחידות ה-30% שנלמדו במהלך השנה
      </p>
    </div>
  );
};

export default Assessment30Page;
