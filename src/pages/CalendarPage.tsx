import { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, ListChecks } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { he } from "date-fns/locale";

/* ═══ Types ═══ */
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "assignment" | "test" | "lesson";
}

const typeConfig = {
  assignment: { label: "משימה", dotClass: "bg-primary", textClass: "text-primary" },
  test: { label: "מבחן", dotClass: "bg-destructive", textClass: "text-destructive" },
  lesson: { label: "שיעור", dotClass: "bg-[hsl(var(--success))]", textClass: "text-[hsl(var(--success))]" },
};

/* ═══ Demo Data ═══ */
const now = new Date();
const demoEvents: CalendarEvent[] = [
  { id: "1", title: "הגשת עבודה – היסטוריה 70%", date: new Date(now.getFullYear(), now.getMonth(), 5), type: "assignment" },
  { id: "2", title: "מבחן אזרחות – 30%", date: new Date(now.getFullYear(), now.getMonth(), 10), type: "test" },
  { id: "3", title: "שיעור אנגלית – Module E", date: new Date(now.getFullYear(), now.getMonth(), 12), type: "lesson" },
  { id: "4", title: "הגשת פרויקט לשון", date: new Date(now.getFullYear(), now.getMonth(), 18), type: "assignment" },
  { id: "5", title: "מבחן מתמטיקה", date: new Date(now.getFullYear(), now.getMonth(), 22), type: "test" },
  { id: "6", title: "שיעור היסטוריה – סיכום", date: new Date(now.getFullYear(), now.getMonth(), 25), type: "lesson" },
  { id: "7", title: "הגשת תרגיל אנגלית", date: new Date(now.getFullYear(), now.getMonth() + 1, 3), type: "assignment" },
];

const dayNames = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/* ═══ Calendar Page ═══ */
const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 });
    const weekEnd = endOfWeek(selectedDate || new Date(), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [selectedDate]);

  const displayDays = view === "month" ? calendarDays : weekDays;

  const eventsForDate = (date: Date) =>
    demoEvents.filter((e) => isSameDay(e.date, date));

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight leading-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" strokeWidth={1.5} />
            לוח שנה
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1">משימות, מבחנים ומפגשים</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView(view === "month" ? "week" : "month")}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            {view === "month" ? "תצוגה שבועית" : "תצוגה חודשית"}
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <h2 className="text-[14px] font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy", { locale: he })}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground/60 py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {displayDays.map((day, i) => {
          const events = eventsForDate(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[72px] md:min-h-[88px] p-1.5 text-start transition-colors cursor-pointer ${
                selected
                  ? "bg-primary/5"
                  : today
                  ? "bg-accent/50"
                  : inMonth
                  ? "bg-card hover:bg-muted/50"
                  : "bg-muted/30"
              }`}
            >
              <span
                className={`text-[11px] font-medium block mb-1 ${
                  selected
                    ? "text-primary font-semibold"
                    : today
                    ? "text-primary"
                    : inMonth
                    ? "text-foreground"
                    : "text-muted-foreground/40"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {events.slice(0, 2).map((ev) => (
                  <div key={ev.id} className="flex items-center gap-1">
                    <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${typeConfig[ev.type].dotClass}`} />
                    <span className="text-[8px] text-muted-foreground truncate leading-tight">{ev.title}</span>
                  </div>
                ))}
                {events.length > 2 && (
                  <span className="text-[8px] text-muted-foreground/50">+{events.length - 2} נוספים</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Events */}
      {selectedDate && (
        <div className="mt-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-foreground">
              {format(selectedDate, "EEEE, d בMMMM", { locale: he })}
            </h3>
          </div>
          {selectedEvents.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <p className="text-[12px] text-muted-foreground">אין אירועים ביום זה</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)] flex items-center gap-3"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${typeConfig[ev.type].dotClass}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground">{ev.title}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${typeConfig[ev.type].textClass}`}>
                      {typeConfig[ev.type].label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Branding */}
      <div className="mt-16 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>
    </div>
  );
};

export default CalendarPage;
