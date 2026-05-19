import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { CalendarDays, GraduationCap, PartyPopper, Sun, AlertTriangle, ClipboardList, Plus, Pencil, Trash2, X, Filter, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type EventType = "holiday" | "vacation" | "bagrut" | "task" | "important";
type EventStatus = "planned" | "upcoming" | "past" | "needs_attention";
type Grade = "ז" | "ח" | "ט" | "י" | "יא" | "יב";

interface YearEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  type: EventType;
  subject?: string;
  grade?: Grade;
  exam_code?: string;
  time?: string;
  status: EventStatus;
  notes?: string;
  isDemo?: boolean;
}

const BAGRUT_SUBJECTS = ["אנגלית", "מתמטיקה", "לשון", "אזרחות", "ספרות", "תנ״ך", "היסטוריה", "חינוך גופני"];
const GRADES: Grade[] = ["ז", "ח", "ט", "י", "יא", "יב"];

const typeMeta: Record<EventType, { label: string; color: string; bg: string; border: string; icon: typeof CalendarDays }> = {
  holiday:   { label: "חג",           color: "text-sky-700",     bg: "bg-sky-100",     border: "border-sky-300",     icon: PartyPopper },
  vacation:  { label: "חופשה",        color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300", icon: Sun },
  bagrut:    { label: "בגרות",        color: "text-orange-700",  bg: "bg-orange-100",  border: "border-orange-300",  icon: GraduationCap },
  important: { label: "תאריך חשוב",   color: "text-red-700",     bg: "bg-red-100",     border: "border-red-300",     icon: AlertTriangle },
  task:      { label: "משימה פנימית", color: "text-violet-700",  bg: "bg-violet-100",  border: "border-violet-300",  icon: ClipboardList },
};

const statusMeta: Record<EventStatus, { label: string; color: string }> = {
  planned:          { label: "מתוכנן",      color: "bg-muted text-muted-foreground" },
  upcoming:         { label: "קרוב",        color: "bg-amber-100 text-amber-800" },
  past:             { label: "עבר",         color: "bg-zinc-100 text-zinc-500" },
  needs_attention:  { label: "דורש טיפול",  color: "bg-red-100 text-red-800" },
};

const STORAGE_KEY = "wingate_year_plan_2026";

/* ---------- Demo seed data (clearly marked, requires update from MoE) ---------- */
function seedDemo(): YearEvent[] {
  const id = () => Math.random().toString(36).slice(2, 10);
  const demoBagrut = (s: string, date: string, grade: Grade, code = ""): YearEvent => ({
    id: id(), title: `בגרות ${s}${code ? " · שאלון " + code : ""}`,
    date, type: "bagrut", subject: s, grade, exam_code: code,
    status: "planned", isDemo: true,
    notes: "תאריך לדוגמה — נדרש עדכון לפי משרד החינוך",
  });
  return [
    // Jewish holidays / vacations 2026 (approx — demo)
    { id: id(), title: "ראש השנה", date: "2026-09-12", endDate: "2026-09-13", type: "holiday", status: "planned", isDemo: true },
    { id: id(), title: "יום כיפור", date: "2026-09-21", type: "holiday", status: "planned", isDemo: true },
    { id: id(), title: "סוכות", date: "2026-09-26", endDate: "2026-10-03", type: "holiday", status: "planned", isDemo: true },
    { id: id(), title: "חנוכה", date: "2026-12-04", endDate: "2026-12-12", type: "holiday", status: "planned", isDemo: true },
    { id: id(), title: "פורים", date: "2026-03-03", type: "holiday", status: "planned", isDemo: true },
    { id: id(), title: "פסח", date: "2026-04-01", endDate: "2026-04-09", type: "vacation", status: "planned", isDemo: true },
    { id: id(), title: "יום העצמאות", date: "2026-04-22", type: "holiday", status: "planned", isDemo: true },
    { id: id(), title: "שבועות", date: "2026-05-22", type: "holiday", status: "planned", isDemo: true },
    { id: id(), title: "חופשת קיץ", date: "2026-06-21", endDate: "2026-08-31", type: "vacation", status: "planned", isDemo: true },

    // Bagrut exams (demo placeholders)
    demoBagrut("אנגלית",      "2026-05-18", "יב", "16381"),
    demoBagrut("מתמטיקה",     "2026-05-25", "יב", "35381"),
    demoBagrut("לשון",        "2026-06-02", "יב", "11281"),
    demoBagrut("אזרחות",      "2026-06-08", "יא", "34281"),
    demoBagrut("ספרות",       "2026-06-15", "יב", "08281"),
    demoBagrut("תנ״ך",        "2026-05-11", "יא", "01281"),
    demoBagrut("היסטוריה",    "2026-06-21", "יא", "22281"),
    demoBagrut("חינוך גופני", "2026-04-14", "יב"),

    // Sample internal tasks
    { id: id(), title: "מועצה פדגוגית — מחצית א׳", date: "2026-01-28", type: "task", status: "planned", isDemo: true },
    { id: id(), title: "הגשת ציוני סוף שנה", date: "2026-06-25", type: "important", status: "planned", isDemo: true },
  ];
}

function loadEvents(): YearEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDemo();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  } catch {
    return seedDemo();
  }
}
function saveEvents(events: YearEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function computeStatus(ev: YearEvent): EventStatus {
  if (ev.status === "needs_attention") return "needs_attention";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(ev.date);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "past";
  if (days <= 14) return "upcoming";
  return "planned";
}

const MONTH_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/* ============================= MAIN PAGE ============================= */
export default function YearPlan2026Page() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role === "admin";

  const [events, setEvents] = useState<YearEvent[]>([]);
  const [view, setView] = useState<"year" | "month" | "week">("year");
  const [monthIdx, setMonthIdx] = useState(new Date().getFullYear() === 2026 ? new Date().getMonth() : 0);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(2026, 0, 1);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<Grade | "all">("all");
  const [filterStatus, setFilterStatus] = useState<EventStatus | "all">("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<YearEvent | null>(null);

  useEffect(() => { setEvents(loadEvents()); }, []);

  const enriched = useMemo(() => events.map(e => ({ ...e, status: computeStatus(e) })), [events]);

  const filtered = useMemo(() => enriched.filter(e => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterSubject !== "all" && e.subject !== filterSubject) return false;
    if (filterGrade !== "all" && e.grade !== filterGrade) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    return true;
  }), [enriched, filterType, filterSubject, filterGrade, filterStatus]);

  /* ---------- KPIs ---------- */
  const kpis = useMemo(() => {
    const thisMonth = filtered.filter(e => new Date(e.date).getMonth() === monthIdx && new Date(e.date).getFullYear() === 2026);
    const bagrutMonth = thisMonth.filter(e => e.type === "bagrut").length;
    const holidaysMonth = thisMonth.filter(e => e.type === "holiday" || e.type === "vacation").length;
    const upcoming = filtered.filter(e => e.status === "upcoming").length;
    const needsAttention = filtered.filter(e => e.status === "needs_attention").length;
    // Heavy weeks: weeks (ISO-ish) with 3+ events
    const buckets = new Map<string, number>();
    filtered.forEach(e => {
      const d = new Date(e.date);
      const start = new Date(d); start.setDate(d.getDate() - d.getDay());
      const key = start.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    const heavyWeeks = [...buckets.values()].filter(v => v >= 3).length;
    // heavy subjects
    const subjCount = new Map<string, number>();
    filtered.filter(e => e.type === "bagrut" && e.subject).forEach(e => subjCount.set(e.subject!, (subjCount.get(e.subject!) || 0) + 1));
    const heavySubjects = [...subjCount.entries()].filter(([, c]) => c >= 1).length;
    return { bagrutMonth, holidaysMonth, upcoming, needsAttention, heavyWeeks, heavySubjects };
  }, [filtered, monthIdx]);

  /* ---------- CRUD ---------- */
  const openNew = () => {
    if (!canEdit) return;
    setDraft({
      id: Math.random().toString(36).slice(2, 10),
      title: "", date: `2026-${String(monthIdx + 1).padStart(2, "0")}-15`,
      type: "task", status: "planned",
    });
    setEditorOpen(true);
  };
  const openEdit = (ev: YearEvent) => {
    if (!canEdit) return;
    setDraft({ ...ev });
    setEditorOpen(true);
  };
  const saveDraft = () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.date) {
      toast({ title: "חסר מידע", description: "יש למלא שם ותאריך", variant: "destructive" });
      return;
    }
    const exists = events.some(e => e.id === draft.id);
    const next = exists ? events.map(e => e.id === draft.id ? draft : e) : [...events, draft];
    setEvents(next); saveEvents(next); setEditorOpen(false);
    toast({ title: exists ? "אירוע עודכן" : "אירוע נוסף" });
  };
  const removeEvent = (id: string) => {
    if (!canEdit) return;
    const next = events.filter(e => e.id !== id);
    setEvents(next); saveEvents(next);
    toast({ title: "אירוע נמחק" });
  };

  /* ============================= RENDER ============================= */
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] text-muted-foreground/70 tracking-[0.12em] uppercase mb-1">מרכז ניהול</p>
          <h1 className="text-2xl font-bold tracking-tight">גאנט שנתי 2026</h1>
          <p className="text-[12.5px] text-muted-foreground mt-1">תכנון שנתי של חגים, חופשות, בגרויות ומשימות פנימיות</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-card p-0.5">
            {(["year", "month", "week"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {v === "year" ? "שנתית" : v === "month" ? "חודשית" : "שבועית"}
              </button>
            ))}
          </div>
          {canEdit && (
            <button onClick={openNew} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3.5 py-2 text-[12px] font-semibold hover:opacity-90 transition">
              <Plus className="h-3.5 w-3.5" /> אירוע חדש
            </button>
          )}
        </div>
      </div>

      {/* Demo banner */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-2.5 mb-5">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="text-[12px] leading-relaxed">
          התאריכים מסומנים <strong>״תאריך לדוגמה״</strong> ומחייבים עדכון לפי משרד החינוך. כל אירוע ניתן לעריכה מלאה.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <KPI label="בגרויות החודש" value={kpis.bagrutMonth} tone="orange" />
        <KPI label="חגים וחופשות" value={kpis.holidaysMonth} tone="sky" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5 bg-card border border-border rounded-xl px-3 py-2.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground ms-1">סינון:</span>
        <FilterSelect value={filterType} onChange={v => setFilterType(v as any)}
          options={[{ v: "all", label: "כל הסוגים" }, ...Object.entries(typeMeta).map(([k, m]) => ({ v: k, label: m.label }))]} />
        <FilterSelect value={filterSubject} onChange={setFilterSubject}
          options={[{ v: "all", label: "כל המקצועות" }, ...BAGRUT_SUBJECTS.map(s => ({ v: s, label: s }))]} />
        <FilterSelect value={filterGrade} onChange={v => setFilterGrade(v as any)}
          options={[{ v: "all", label: "כל השכבות" }, ...GRADES.map(g => ({ v: g, label: `שכבה ${g}׳` }))]} />
        <FilterSelect value={filterStatus} onChange={v => setFilterStatus(v as any)}
          options={[{ v: "all", label: "כל הסטטוסים" }, ...Object.entries(statusMeta).map(([k, m]) => ({ v: k, label: m.label }))]} />
        <button onClick={() => { setFilterType("all"); setFilterSubject("all"); setFilterGrade("all"); setFilterStatus("all"); }}
          className="text-[11px] text-muted-foreground hover:text-foreground ms-auto">איפוס</button>
      </div>

      {/* Views */}
      {view === "year" && <YearView events={filtered} onSelectMonth={(m) => { setMonthIdx(m); setView("month"); }} onEdit={openEdit} />}
      {view === "month" && (
        <MonthView events={filtered} monthIdx={monthIdx} setMonthIdx={setMonthIdx} onEdit={openEdit} onRemove={removeEvent} canEdit={canEdit} />
      )}
      {view === "week" && (
        <WeekView events={filtered} weekStart={weekStart} setWeekStart={setWeekStart} onEdit={openEdit} onRemove={removeEvent} canEdit={canEdit} />
      )}

      {/* Editor modal */}
      {editorOpen && draft && (
        <EventEditor draft={draft} setDraft={setDraft} onClose={() => setEditorOpen(false)} onSave={saveDraft} onDelete={() => { removeEvent(draft.id); setEditorOpen(false); }} />
      )}
    </div>
  );
}

/* ============================= SUB-COMPONENTS ============================= */
function KPI({ label, value, tone }: { label: string; value: number; tone: string }) {
  const tones: Record<string, string> = {
    orange:  "bg-orange-50  border-orange-200  text-orange-700",
    amber:   "bg-amber-50   border-amber-200   text-amber-700",
    violet:  "bg-violet-50  border-violet-200  text-violet-700",
    sky:     "bg-sky-50     border-sky-200     text-sky-700",
    red:     "bg-red-50     border-red-200     text-red-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  return (
    <div className={`rounded-xl border p-3.5 ${tones[tone]}`}>
      <p className="text-[10.5px] font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-0.5 leading-none">{value}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-[11.5px] bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary">
      {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  );
}

function EventChip({ ev, onEdit, compact = false }: { ev: YearEvent; onEdit?: (e: YearEvent) => void; compact?: boolean }) {
  const meta = typeMeta[ev.type];
  const Icon = meta.icon;
  return (
    <button onClick={() => onEdit?.(ev)}
      className={`text-start w-full rounded-md border ${meta.border} ${meta.bg} ${meta.color} px-1.5 py-1 hover:opacity-90 transition group`}>
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 shrink-0" strokeWidth={2} />
        <span className={`font-semibold truncate ${compact ? "text-[9.5px]" : "text-[10.5px]"}`}>{ev.title}</span>
      </div>
      {!compact && (ev.grade || ev.subject) && (
        <p className="text-[9px] opacity-70 truncate mt-0.5">
          {ev.grade && `שכבה ${ev.grade}׳`}{ev.grade && ev.subject ? " · " : ""}{ev.subject}
        </p>
      )}
    </button>
  );
}

function YearView({ events, onSelectMonth, onEdit }: { events: YearEvent[]; onSelectMonth: (m: number) => void; onEdit: (e: YearEvent) => void }) {
  const byMonth = useMemo(() => {
    const arr: YearEvent[][] = Array.from({ length: 12 }, () => []);
    events.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === 2026) arr[d.getMonth()].push(e);
    });
    arr.forEach(list => list.sort((a, b) => a.date.localeCompare(b.date)));
    return arr;
  }, [events]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {MONTH_NAMES.map((name, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition">
          <button onClick={() => onSelectMonth(i)} className="flex items-center justify-between w-full mb-2 group">
            <h3 className="text-[13px] font-bold tracking-tight group-hover:text-primary">{name}</h3>
            <span className="text-[10px] text-muted-foreground">{byMonth[i].length} אירועים</span>
          </button>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {byMonth[i].length === 0 && <p className="text-[10.5px] text-muted-foreground/60 text-center py-3">אין אירועים</p>}
            {byMonth[i].slice(0, 6).map(e => (
              <div key={e.id} className="flex items-center gap-1.5">
                <span className="text-[9.5px] text-muted-foreground tabular-nums w-7 shrink-0">{e.date.slice(8, 10)}/{e.date.slice(5, 7)}</span>
                <div className="flex-1 min-w-0"><EventChip ev={e} onEdit={onEdit} compact /></div>
              </div>
            ))}
            {byMonth[i].length > 6 && <p className="text-[9.5px] text-primary text-center pt-1">+{byMonth[i].length - 6} נוספים</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthView({ events, monthIdx, setMonthIdx, onEdit, onRemove, canEdit }: {
  events: YearEvent[]; monthIdx: number; setMonthIdx: (n: number) => void;
  onEdit: (e: YearEvent) => void; onRemove: (id: string) => void; canEdit: boolean;
}) {
  const first = new Date(2026, monthIdx, 1);
  const daysInMonth = new Date(2026, monthIdx + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = useMemo(() => {
    const m = new Map<number, YearEvent[]>();
    events.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === 2026 && d.getMonth() === monthIdx) {
        const day = d.getDate();
        if (!m.has(day)) m.set(day, []);
        m.get(day)!.push(e);
      }
    });
    return m;
  }, [events, monthIdx]);

  const monthEvents = useMemo(() => events.filter(e => {
    const d = new Date(e.date); return d.getFullYear() === 2026 && d.getMonth() === monthIdx;
  }).sort((a, b) => a.date.localeCompare(b.date)), [events, monthIdx]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonthIdx(Math.max(0, monthIdx - 1))} disabled={monthIdx === 0}
            className="text-[12px] px-2 py-1 rounded-lg hover:bg-muted disabled:opacity-30">‹ קודם</button>
          <h3 className="text-[15px] font-bold">{MONTH_NAMES[monthIdx]} 2026</h3>
          <button onClick={() => setMonthIdx(Math.min(11, monthIdx + 1))} disabled={monthIdx === 11}
            className="text-[12px] px-2 py-1 rounded-lg hover:bg-muted disabled:opacity-30">הבא ›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(w => <div key={w} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => (
            <div key={i} className={`min-h-[78px] rounded-lg border p-1 ${d ? "bg-background border-border" : "bg-muted/30 border-transparent"}`}>
              {d && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 text-end">{d}</p>
                  <div className="space-y-0.5">
                    {(eventsByDay.get(d) || []).slice(0, 3).map(e => <EventChip key={e.id} ev={e} onEdit={onEdit} compact />)}
                    {(eventsByDay.get(d)?.length || 0) > 3 && (
                      <p className="text-[9px] text-primary text-center">+{(eventsByDay.get(d)?.length || 0) - 3}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Side: month summary */}
      <aside className="bg-card border border-border rounded-xl p-4">
        <h4 className="text-[13px] font-bold mb-3">תקציר {MONTH_NAMES[monthIdx]}</h4>
        <ul className="space-y-1.5 max-h-[480px] overflow-y-auto">
          {monthEvents.length === 0 && <li className="text-[11px] text-muted-foreground">אין אירועים</li>}
          {monthEvents.map(e => (
            <li key={e.id} className="flex items-center gap-2 group">
              <span className="text-[10px] tabular-nums text-muted-foreground w-9 shrink-0">{e.date.slice(8, 10)}/{e.date.slice(5, 7)}</span>
              <div className="flex-1 min-w-0"><EventChip ev={e} onEdit={onEdit} compact /></div>
              {canEdit && (
                <button onClick={() => onRemove(e.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function WeekView({ events, weekStart, setWeekStart, onEdit, onRemove, canEdit }: {
  events: YearEvent[]; weekStart: Date; setWeekStart: (d: Date) => void;
  onEdit: (e: YearEvent) => void; onRemove: (id: string) => void; canEdit: boolean;
}) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
  const evByDay = (d: Date) => events.filter(e => {
    const ed = new Date(e.date);
    return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate();
  });

  const shift = (n: number) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + n); setWeekStart(d); };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shift(-7)} className="text-[12px] px-2 py-1 rounded-lg hover:bg-muted">‹ שבוע קודם</button>
        <h3 className="text-[14px] font-bold">
          שבוע {days[0].getDate()}/{days[0].getMonth() + 1} — {days[6].getDate()}/{days[6].getMonth() + 1}
        </h3>
        <button onClick={() => shift(7)} className="text-[12px] px-2 py-1 rounded-lg hover:bg-muted">שבוע הבא ›</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d, i) => {
          const list = evByDay(d);
          const isToday = new Date().toDateString() === d.toDateString();
          return (
            <div key={i} className={`rounded-lg border p-2 min-h-[180px] ${isToday ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground">{WEEKDAYS[d.getDay()]}</span>
                <span className="text-[14px] font-bold">{d.getDate()}</span>
              </div>
              <div className="space-y-1">
                {list.length === 0 && <p className="text-[10px] text-muted-foreground/50 text-center py-4">—</p>}
                {list.map(e => (
                  <div key={e.id} className="group relative">
                    <EventChip ev={e} onEdit={onEdit} />
                    {canEdit && (
                      <button onClick={() => onRemove(e.id)} className="absolute top-1 start-1 opacity-0 group-hover:opacity-100 bg-card border border-border rounded p-0.5">
                        <Trash2 className="h-2.5 w-2.5 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventEditor({ draft, setDraft, onClose, onSave, onDelete }: {
  draft: YearEvent; setDraft: (e: YearEvent) => void; onClose: () => void; onSave: () => void; onDelete: () => void;
}) {
  const upd = (patch: Partial<YearEvent>) => setDraft({ ...draft, ...patch });
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 animate-fade-in" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold">{draft.title ? "עריכת אירוע" : "אירוע חדש"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <Field label="שם האירוע">
            <input value={draft.title} onChange={e => upd({ title: e.target.value })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-3 py-2" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך"><input type="date" value={draft.date} onChange={e => upd({ date: e.target.value })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-2 py-2" /></Field>
            <Field label="תאריך סיום (אופציונלי)"><input type="date" value={draft.endDate || ""} onChange={e => upd({ endDate: e.target.value || undefined })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-2 py-2" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="סוג">
              <select value={draft.type} onChange={e => upd({ type: e.target.value as EventType })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-2 py-2">
                {Object.entries(typeMeta).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="סטטוס">
              <select value={draft.status} onChange={e => upd({ status: e.target.value as EventStatus })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-2 py-2">
                {Object.entries(statusMeta).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </Field>
          </div>
          {draft.type === "bagrut" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="מקצוע">
                  <select value={draft.subject || ""} onChange={e => upd({ subject: e.target.value || undefined })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-2 py-2">
                    <option value="">—</option>
                    {BAGRUT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="שאלון / רמה"><input value={draft.exam_code || ""} onChange={e => upd({ exam_code: e.target.value || undefined })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-2 py-2" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="שעה"><input type="time" value={draft.time || ""} onChange={e => upd({ time: e.target.value || undefined })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-2 py-2" /></Field>
                <Field label="שכבה">
                  <select value={draft.grade || ""} onChange={e => upd({ grade: (e.target.value as Grade) || undefined })} className="w-full text-[12.5px] bg-background border border-border rounded-lg px-2 py-2">
                    <option value="">—</option>
                    {GRADES.map(g => <option key={g} value={g}>שכבה {g}׳</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}
          <Field label="הערות פנימיות"><textarea rows={2} value={draft.notes || ""} onChange={e => upd({ notes: e.target.value || undefined })} className="w-full text-[12px] bg-background border border-border rounded-lg px-3 py-2 resize-none" /></Field>
        </div>

        <div className="flex items-center justify-between mt-5">
          <button onClick={onDelete} className="text-[12px] text-destructive hover:underline inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> מחיקה</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[12px] px-3 py-2 rounded-lg hover:bg-muted">ביטול</button>
            <button onClick={onSave} className="text-[12px] px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90">שמירה</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-semibold text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}
