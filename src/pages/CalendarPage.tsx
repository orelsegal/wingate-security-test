import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Plus, Pencil, Trash2, ChevronRight, ChevronLeft, CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";

/* ═══ Types ═══ */
type EventType = "task" | "exam" | "lesson" | "event";

interface CalendarEvent {
  id: string;
  title: string;
  subject?: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  note?: string;
}

const typeLabels: Record<EventType, string> = {
  task: "משימה",
  exam: "מבחן",
  lesson: "שיעור",
  event: "אירוע",
};

const typeColors: Record<EventType, { bg: string; text: string; dot: string }> = {
  task: { bg: "bg-primary/8", text: "text-primary", dot: "bg-primary" },
  exam: { bg: "bg-destructive/8", text: "text-destructive", dot: "bg-destructive" },
  lesson: { bg: "bg-[hsl(210,50%,50%)]/8", text: "text-[hsl(210,50%,45%)]", dot: "bg-[hsl(210,50%,50%)]" },
  event: { bg: "bg-[hsl(var(--warning))]/10", text: "text-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]" },
};

const hebrewMonths = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const hebrewDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/* ═══ Demo events ═══ */
const demoEvents: CalendarEvent[] = [
  { id: "e1", title: "הגשת עבודה – היסטוריה", subject: "היסטוריה", date: "2026-03-25", type: "task" },
  { id: "e2", title: "מבחן אנגלית Module E", subject: "אנגלית", date: "2026-03-27", type: "exam" },
  { id: "e3", title: "שיעור מתמטיקה – משוואות", subject: "מתמטיקה", date: "2026-03-24", type: "lesson" },
  { id: "e4", title: "יום ספורט שנתי", date: "2026-03-30", type: "event", note: "אירוע כלל מכללתי" },
  { id: "e5", title: "הגשת דו״ח מדעים", subject: "מבוא למדעים", date: "2026-04-02", type: "task" },
  { id: "e6", title: "מבחן אזרחות 30%", subject: "אזרחות", date: "2026-04-06", type: "exam" },
];

/* ═══ Helpers ═══ */
const pad = (n: number) => n.toString().padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

/* ═══ Component ═══ */
const CalendarPage = () => {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "teacher" || user?.role === "coach";

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>(demoEvents);
  const [selectedDate, setSelectedDate] = useState<string | null>(toKey(today));
  const [view, setView] = useState<"month" | "week">("month");

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState<EventType>("task");
  const [formNote, setFormNote] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const eventsMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [events]);

  const selectedEvents = selectedDate ? (eventsMap[selectedDate] || []) : [];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const openAdd = (date?: string) => {
    setEditingEvent(null);
    setFormTitle("");
    setFormSubject("");
    setFormDate(date || selectedDate || toKey(today));
    setFormType("task");
    setFormNote("");
    setDialogOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormSubject(ev.subject || "");
    setFormDate(ev.date);
    setFormType(ev.type);
    setFormNote(ev.note || "");
    setDialogOpen(true);
  };

  const saveEvent = () => {
    if (!formTitle.trim() || !formDate) return;
    const ev: CalendarEvent = {
      id: editingEvent?.id || `ev-${Date.now()}`,
      title: formTitle.trim(),
      subject: formSubject.trim() || undefined,
      date: formDate,
      type: formType,
      note: formNote.trim() || undefined,
    };
    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? ev : e));
      toast.success("האירוע עודכן");
    } else {
      setEvents(prev => [...prev, ev]);
      toast.success("האירוע נוסף");
    }
    setDialogOpen(false);
  };

  const deleteEvent = () => {
    if (!deleteTarget) return;
    setEvents(prev => prev.filter(e => e.id !== deleteTarget));
    setDeleteTarget(null);
    toast.success("האירוע נמחק");
  };

  const todayKey = toKey(today);

  // Week view helpers
  const getWeekDays = () => {
    const sel = selectedDate ? new Date(selectedDate) : today;
    const day = sel.getDay();
    const start = new Date(sel);
    start.setDate(start.getDate() - day);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  return (
    <div className="p-5 md:p-8 max-w-[720px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" strokeWidth={1.5} />
          <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight">לוח שנה</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === "month" ? "week" : "month")}
            className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
          >
            {view === "month" ? "שבועי" : "חודשי"}
          </button>
          {canEdit && (
            <Button size="sm" onClick={() => openAdd()} className="gap-1.5 text-[11px]">
              <Plus className="h-3.5 w-3.5" />
              הוסף אירוע
            </Button>
          )}
        </div>
      </div>

      {/* Month nav */}
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <h2 className="text-[14px] font-semibold text-foreground">
            {hebrewMonths[currentMonth]} {currentYear}
          </h2>
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {hebrewDays.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground/60 py-1">{d}</div>
          ))}
        </div>

        {view === "month" ? (
          /* Month grid */
          <div className="grid grid-cols-7 gap-0">
            {monthDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="h-10" />;
              const key = toKey(day);
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const dayEvents = eventsMap[key] || [];
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`h-10 flex flex-col items-center justify-center rounded-xl transition-all relative ${
                    isSelected ? "bg-primary text-primary-foreground" :
                    isToday ? "bg-primary/10 text-primary font-semibold" :
                    "hover:bg-accent text-foreground"
                  }`}
                >
                  <span className="text-[12px]">{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <span key={ev.id} className={`w-1 h-1 rounded-full ${isSelected ? "bg-primary-foreground/70" : typeColors[ev.type].dot}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Week view */
          <div className="grid grid-cols-7 gap-1">
            {getWeekDays().map(day => {
              const key = toKey(day);
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const dayEvents = eventsMap[key] || [];
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-[72px] flex flex-col items-center py-2 rounded-xl transition-all ${
                    isSelected ? "bg-primary text-primary-foreground" :
                    isToday ? "bg-primary/10 text-primary" :
                    "hover:bg-accent text-foreground"
                  }`}
                >
                  <span className="text-[12px] font-medium">{day.getDate()}</span>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {dayEvents.slice(0, 2).map(ev => (
                      <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/70" : typeColors[ev.type].dot}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-muted-foreground">
              {(() => {
                const d = new Date(selectedDate);
                return `${hebrewDays[d.getDay()]} ${d.getDate()} ${hebrewMonths[d.getMonth()]}`;
              })()}
            </h3>
            {selectedEvents.length === 0 && (
              <span className="text-[10px] text-muted-foreground/50">אין אירועים</span>
            )}
          </div>

          {selectedEvents.map(ev => (
            <div
              key={ev.id}
              className={`bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] transition-all`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeColors[ev.type].dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md ${typeColors[ev.type].bg} ${typeColors[ev.type].text}`}>
                      {typeLabels[ev.type]}
                    </span>
                    {ev.subject && (
                      <span className="text-[9px] text-muted-foreground/60">{ev.subject}</span>
                    )}
                  </div>
                  <h4 className="text-[13px] font-medium text-foreground leading-tight">{ev.title}</h4>
                  {ev.note && <p className="text-[10.5px] text-muted-foreground mt-1">{ev.note}</p>}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => setDeleteTarget(ev.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              {editingEvent ? "עריכת אירוע" : "הוספת אירוע"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">כותרת</label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="שם האירוע" className="text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-medium">סוג</label>
                <Select value={formType} onValueChange={v => setFormType(v as EventType)}>
                  <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-[12px]">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-medium">תאריך</label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="text-[12px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">מקצוע (אופציונלי)</label>
              <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="למשל: היסטוריה" className="text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">הערה (אופציונלי)</label>
              <Textarea value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="פרטים נוספים..." className="text-[12px] min-h-[60px]" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEvent} className="flex-1 text-[12px]" disabled={!formTitle.trim() || !formDate}>
                {editingEvent ? "עדכן" : "הוסף"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-[12px]">ביטול</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteEvent}
        title="מחיקת אירוע"
        description="האם למחוק את האירוע? הפעולה לא ניתנת לביטול."
        confirmLabel="מחק"
        destructive
      />
    </div>
  );
};

export default CalendarPage;
