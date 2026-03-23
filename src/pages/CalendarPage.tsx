import { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, ListChecks, Plus, Pencil, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { he } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";

/* ═══ Types ═══ */
interface CalendarEvent {
  id: string;
  title: string;
  subject: string;
  date: Date;
  type: "assignment" | "test" | "lesson" | "event";
  notes?: string;
}

const typeConfig: Record<string, { label: string; dotClass: string; textClass: string }> = {
  assignment: { label: "משימה", dotClass: "bg-primary", textClass: "text-primary" },
  test: { label: "מבחן", dotClass: "bg-destructive", textClass: "text-destructive" },
  lesson: { label: "שיעור", dotClass: "bg-[hsl(var(--success))]", textClass: "text-[hsl(var(--success))]" },
  event: { label: "אירוע", dotClass: "bg-[hsl(var(--warning))]", textClass: "text-[hsl(var(--warning))]" },
};

const typeOptions = [
  { value: "assignment", label: "משימה" },
  { value: "test", label: "מבחן" },
  { value: "lesson", label: "שיעור / מפגש" },
  { value: "event", label: "אירוע" },
];

/* ═══ Demo Data ═══ */
const now = new Date();
const initialEvents: CalendarEvent[] = [
  { id: "1", title: "הגשת עבודה – היסטוריה 70%", subject: "היסטוריה", date: new Date(now.getFullYear(), now.getMonth(), 5), type: "assignment" },
  { id: "2", title: "מבחן אזרחות – 30%", subject: "אזרחות", date: new Date(now.getFullYear(), now.getMonth(), 10), type: "test" },
  { id: "3", title: "שיעור אנגלית – Module E", subject: "אנגלית", date: new Date(now.getFullYear(), now.getMonth(), 12), type: "lesson" },
  { id: "4", title: "הגשת פרויקט לשון", subject: "לשון", date: new Date(now.getFullYear(), now.getMonth(), 18), type: "assignment" },
  { id: "5", title: "מבחן מתמטיקה", subject: "מתמטיקה", date: new Date(now.getFullYear(), now.getMonth(), 22), type: "test" },
  { id: "6", title: "שיעור היסטוריה – סיכום", subject: "היסטוריה", date: new Date(now.getFullYear(), now.getMonth(), 25), type: "lesson" },
  { id: "7", title: "הגשת תרגיל אנגלית", subject: "אנגלית", date: new Date(now.getFullYear(), now.getMonth() + 1, 3), type: "assignment" },
];

const dayNames = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/* ═══ Calendar Page ═══ */
const CalendarPage = () => {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "teacher" || user?.role === "coach";
  // parent + student = view only (already handled by canEdit being false)

  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  // Event form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formType, setFormType] = useState<"assignment" | "test" | "lesson" | "event">("assignment");
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

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
    events.filter((e) => isSameDay(e.date, date));

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  const openAddForm = () => {
    setEditingEvent(null);
    setFormTitle("");
    setFormSubject("");
    setFormType("assignment");
    setFormDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setFormNotes("");
    setFormOpen(true);
  };

  const openEditForm = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormSubject(ev.subject);
    setFormType(ev.type);
    setFormDate(format(ev.date, "yyyy-MM-dd"));
    setFormNotes(ev.notes || "");
    setFormOpen(true);
  };

  const handleSaveEvent = () => {
    if (!formTitle.trim() || !formDate) return;
    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, title: formTitle.trim(), subject: formSubject.trim(), type: formType, date: new Date(formDate), notes: formNotes.trim() } : e));
    } else {
      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        subject: formSubject.trim(),
        date: new Date(formDate),
        type: formType,
        notes: formNotes.trim(),
      };
      setEvents(prev => [...prev, newEvent]);
    }
    setFormOpen(false);
  };

  const handleDeleteEvent = () => {
    if (!deleteTarget) return;
    setEvents(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

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
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button size="sm" className="gap-1.5 text-[11px]" onClick={openAddForm}>
              <Plus className="h-3.5 w-3.5" />
              הוסף אירוע
            </Button>
          )}
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
                    <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${typeConfig[ev.type].dotClass}`} />
                    <span className="text-[8px] text-muted-foreground truncate leading-tight">{ev.title}</span>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[8px] text-muted-foreground/50">+{dayEvents.length - 2} נוספים</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Events */}
      {selectedDate && (
        <div className="mt-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <h3 className="text-[13px] font-semibold text-foreground">
                {format(selectedDate, "EEEE, d בMMMM", { locale: he })}
              </h3>
            </div>
            {canEdit && (
              <Button size="sm" variant="outline" className="gap-1 text-[10px] h-7" onClick={openAddForm}>
                <Plus className="h-3 w-3" />
                הוסף
              </Button>
            )}
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-[10px] font-medium ${typeConfig[ev.type].textClass}`}>
                        {typeConfig[ev.type].label}
                      </p>
                      {ev.subject && (
                        <span className="text-[10px] text-muted-foreground">· {ev.subject}</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditForm(ev)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Pencil className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => setDeleteTarget(ev)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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

      {/* Branding */}
      <div className="mt-16 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">{editingEvent ? "עריכת אירוע" : "הוספת אירוע"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">כותרת</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="שם האירוע..." className="text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">מקצוע</label>
              <Input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="היסטוריה, מתמטיקה..." className="text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">סוג</label>
              <Select value={formType} onValueChange={(v) => setFormType(v as any)}>
                <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">תאריך</label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="text-[13px]" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveEvent} className="flex-1 text-[12px]" disabled={!formTitle.trim() || !formDate}>
                {editingEvent ? "שמור שינויים" : "הוסף אירוע"}
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)} className="text-[12px]">ביטול</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEvent}
        title="מחיקת אירוע"
        description={`האם למחוק את "${deleteTarget?.title}"?`}
        confirmLabel="מחק"
        destructive
      />
    </div>
  );
};

export default CalendarPage;
