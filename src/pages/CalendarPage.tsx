import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { he } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";

type EventType = "assignment" | "test" | "lesson" | "event";

interface CalendarEvent {
  id: string;
  title: string;
  subject: string;
  date: Date;
  type: EventType;
  notes?: string;
}

const typeConfig: Record<
  EventType,
  { label: string; dotClass: string; textClass: string }
> = {
  assignment: {
    label: "משימה",
    dotClass: "bg-primary",
    textClass: "text-primary",
  },
  test: {
    label: "מבחן",
    dotClass: "bg-destructive",
    textClass: "text-destructive",
  },
  lesson: {
    label: "שיעור / מפגש",
    dotClass: "bg-green-500",
    textClass: "text-green-600",
  },
  event: {
    label: "אירוע",
    dotClass: "bg-yellow-500",
    textClass: "text-yellow-600",
  },
};

const now = new Date();

const initialEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "הגשת עבודה – היסטוריה 70%",
    subject: "היסטוריה",
    date: new Date(now.getFullYear(), now.getMonth(), 5),
    type: "assignment",
  },
  {
    id: "2",
    title: "מבחן אזרחות – 30%",
    subject: "אזרחות",
    date: new Date(now.getFullYear(), now.getMonth(), 10),
    type: "test",
  },
  {
    id: "3",
    title: "שיעור אנגלית – Module E",
    subject: "אנגלית",
    date: new Date(now.getFullYear(), now.getMonth(), 12),
    type: "lesson",
  },
  {
    id: "4",
    title: "הגשת פרויקט לשון",
    subject: "לשון",
    date: new Date(now.getFullYear(), now.getMonth(), 18),
    type: "assignment",
  },
  {
    id: "5",
    title: "מבחן מתמטיקה",
    subject: "מתמטיקה",
    date: new Date(now.getFullYear(), now.getMonth(), 22),
    type: "test",
  },
];

const dayNames = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const sendSingleEventToWhatsApp = (ev: CalendarEvent) => {
  const message = `שם אירוע: ${ev.title}
מקצוע: ${ev.subject}
סוג: ${typeConfig[ev.type].label}
תאריך: ${new Date(ev.date).toLocaleDateString("he-IL")}
${ev.notes ? `הערות: ${ev.notes}` : ""}

נשלח מתוך מערכת וינגייט`;

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

const sendDayEventsToWhatsApp = (
  events: CalendarEvent[],
  selectedDate: Date | null
) => {
  if (!selectedDate || events.length === 0) return;

  const dateLabel = selectedDate.toLocaleDateString("he-IL");
  const lines = events.map(
    (ev, index) =>
      `${index + 1}. ${ev.title} | ${ev.subject} | ${typeConfig[ev.type].label}`
  );

  const message = `אירועים ליום ${dateLabel}

${lines.join("\n")}

נשלח מתוך מערכת וינגייט`;

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

const exportDayEventsToCsv = (
  events: CalendarEvent[],
  selectedDate: Date | null
) => {
  if (!selectedDate || events.length === 0) return;

  const headers = ["תאריך", "כותרת", "מקצוע", "סוג", "הערות"];
  const rows = events.map((ev) => [
    new Date(ev.date).toLocaleDateString("he-IL"),
    ev.title,
    ev.subject,
    typeConfig[ev.type].label,
    ev.notes || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateLabel = selectedDate.toLocaleDateString("he-IL").replace(/\//g, "-");
  link.href = url;
  link.setAttribute("download", `אירועים-${dateLabel}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const CalendarPage = () => {
  const { user } = useAuth();

  const canEdit =
    user?.role === "admin" ||
    user?.role === "teacher" ||
    user?.role === "coach";

  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [view, setView] = useState<"month" | "week">("month");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate || new Date(), {
      weekStartsOn: 0,
    });
    const weekEnd = endOfWeek(selectedDate || new Date(), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [selectedDate]);

  const displayDays = view === "month" ? calendarDays : weekDays;

  const eventsForDate = (date: Date) =>
    events.filter((e) => isSameDay(e.date, date));

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  const handleAddEvent = () => {
    const title = window.prompt("כותרת האירוע");
    if (!title) return;

    const subject = window.prompt("מקצוע") || "";
    const typeInput =
      (window.prompt("סוג: assignment / test / lesson / event") as EventType) ||
      "assignment";
    const notes = window.prompt("הערות (לא חובה)") || "";

    const safeType: EventType =
      typeInput === "assignment" ||
      typeInput === "test" ||
      typeInput === "lesson" ||
      typeInput === "event"
        ? typeInput
        : "assignment";

    const eventDate = selectedDate || new Date();

    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title,
      subject,
      date: eventDate,
      type: safeType,
      notes,
    };

    setEvents((prev) => [...prev, newEvent]);
  };

  const handleEditEvent = (ev: CalendarEvent) => {
    const title = window.prompt("כותרת האירוע", ev.title);
    if (!title) return;

    const subject = window.prompt("מקצוע", ev.subject) || "";
    const typeInput =
      (window.prompt(
        "סוג: assignment / test / lesson / event",
        ev.type
      ) as EventType) || ev.type;
    const notes = window.prompt("הערות", ev.notes || "") || "";

    const safeType: EventType =
      typeInput === "assignment" ||
      typeInput === "test" ||
      typeInput === "lesson" ||
      typeInput === "event"
        ? typeInput
        : ev.type;

    setEvents((prev) =>
      prev.map((item) =>
        item.id === ev.id
          ? {
              ...item,
              title,
              subject,
              type: safeType,
              notes,
            }
          : item
      )
    );
  };

  const handleDeleteEvent = (ev: CalendarEvent) => {
    const ok = window.confirm(`האם למחוק את "${ev.title}"?`);
    if (!ok) return;
    setEvents((prev) => prev.filter((item) => item.id !== ev.id));
  };

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight leading-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" strokeWidth={1.5} />
            לוח שנה
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            משימות, מבחנים ומפגשים
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleAddEvent}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              הוסף אירוע
            </button>
          )}

          <button
            onClick={() => setView(view === "month" ? "week" : "month")}
            className="text-[11px] px-3 py-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            {view === "month" ? "תצוגה שבועית" : "תצוגה חודשית"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <h2 className="text-[14px] font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy", { locale: he })}
        </h2>

        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-muted-foreground/60 py-1.5"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {displayDays.map((day, i) => {
          const dayEvents = eventsForDate(day);
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
                {dayEvents.slice(0, 2).map((ev) => (
                  <div key={ev.id} className="flex items-center gap-1">
                    <span
                      className={`w-[5px] h-[5px] rounded-full shrink-0 ${typeConfig[ev.type].dotClass}`}
                    />
                    <span className="text-[8px] text-muted-foreground truncate leading-tight">
                      {ev.title}
                    </span>
                  </div>
                ))}

                {dayEvents.length > 2 && (
                  <span className="text-[8px] text-muted-foreground/50">
                    +{dayEvents.length - 2} נוספים
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h3 className="text-[13px] font-semibold text-foreground">
                {format(selectedDate, "EEEE, d בMMMM", { locale: he })}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {canEdit && selectedEvents.length > 0 && (
                <>
                  <button
                    onClick={() =>
                      sendDayEventsToWhatsApp(selectedEvents, selectedDate)
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px]"
                  >
                    <MessageCircle className="h-3 w-3" />
                    שלח לוואטסאפ
                  </button>

                  <button
                    onClick={() =>
                      exportDayEventsToCsv(selectedEvents, selectedDate)
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px]"
                  >
                    <FileSpreadsheet className="h-3 w-3" />
                    ייצא לאקסל
                  </button>
                </>
              )}

              {canEdit && (
                <button
                  onClick={handleAddEvent}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px]"
                >
                  <Plus className="h-3 w-3" />
                  הוסף
                </button>
              )}
            </div>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <p className="text-[12px] text-muted-foreground">
                אין אירועים ביום זה
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)] flex items-center gap-3"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${typeConfig[ev.type].dotClass}`}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground">
                      {ev.title}
                    </p>

                    <div className="flex items-center gap-2 mt-0.5">
                      <p
                        className={`text-[10px] font-medium ${typeConfig[ev.type].textClass}`}
                      >
                        {typeConfig[ev.type].label}
                      </p>

                      {ev.subject && (
                        <span className="text-[10px] text-muted-foreground">
                          · {ev.subject}
                        </span>
                      )}
                    </div>

                    {ev.notes && (
                      <p className="text-[9.5px] text-muted-foreground/70 mt-0.5">
                        {ev.notes}
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => sendSingleEventToWhatsApp(ev)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-100 transition-colors"
                        title="שלח לוואטסאפ"
                      >
                        💬
                      </button>

                      <button
                        onClick={() => handleEditEvent(ev)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="ערוך"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={1.5} />
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="מחק"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-16 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>
    </div>
  );
};

export default CalendarPage;
