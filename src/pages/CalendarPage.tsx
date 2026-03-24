import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ListChecks,
  Plus,
  Pencil,
  Trash2,
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";

/* ===== WhatsApp ===== */
const sendToWhatsApp = (ev: any) => {
  const message = `
שם אירוע: ${ev.title}
מקצוע: ${ev.subject}
תאריך: ${new Date(ev.date).toLocaleDateString("he-IL")}

נשלח מתוך מערכת וינגייט
  `;

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
};

/* ===== Types ===== */
interface CalendarEvent {
  id: string;
  title: string;
  subject: string;
  date: Date;
  type: "assignment" | "test" | "lesson" | "event";
  notes?: string;
}

const typeConfig: Record<
  string,
  { label: string; dotClass: string; textClass: string }
> = {
  assignment: { label: "משימה", dotClass: "bg-primary", textClass: "text-primary" },
  test: { label: "מבחן", dotClass: "bg-destructive", textClass: "text-destructive" },
  lesson: { label: "שיעור", dotClass: "bg-green-500", textClass: "text-green-600" },
  event: { label: "אירוע", dotClass: "bg-yellow-500", textClass: "text-yellow-600" },
};

const typeOptions = [
  { value: "assignment", label: "משימה" },
  { value: "test", label: "מבחן" },
  { value: "lesson", label: "שיעור / מפגש" },
  { value: "event", label: "אירוע" },
];

/* ===== Demo Data ===== */
const now = new Date();
const initialEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "מבחן מתמטיקה",
    subject: "מתמטיקה",
    date: new Date(now.getFullYear(), now.getMonth(), 5),
    type: "test",
  },
];

const dayNames = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/* ===== Main ===== */
const CalendarPage = () => {
  const { user } = useAuth();
  const canEdit =
    user?.role === "admin" ||
    user?.role === "teacher" ||
    user?.role === "coach";

  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formType, setFormType] = useState<any>("assignment");
  const [formDate, setFormDate] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const eventsForDate = (date: Date) =>
    events.filter((e) => isSameDay(e.date, date));

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  const handleSave = () => {
    if (!formTitle || !formDate) return;

    if (editingEvent) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === editingEvent.id
            ? { ...e, title: formTitle, subject: formSubject, date: new Date(formDate), type: formType }
            : e
        )
      );
    } else {
      setEvents((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: formTitle,
          subject: formSubject,
          date: new Date(formDate),
          type: formType,
        },
      ]);
    }

    setFormOpen(false);
  };

  return (
    <div className="p-6 max-w-[900px] mx-auto" dir="rtl">

      {/* Header */}
      <div className="flex justify-between mb-4">
        <h1 className="text-lg font-semibold flex gap-2 items-center">
          <CalendarDays className="w-5 h-5" />
          לוח שנה
        </h1>

        {canEdit && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" />
            הוסף
          </Button>
        )}
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-7 gap-1 border rounded-xl overflow-hidden">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => setSelectedDate(day)}
            className="p-2 min-h-[70px] bg-white"
          >
            <div className="text-xs">{format(day, "d")}</div>
            {eventsForDate(day).map((e) => (
              <div key={e.id} className="text-[10px] truncate">
                • {e.title}
              </div>
            ))}
          </button>
        ))}
      </div>

      {/* Selected */}
      {selectedDate && (
        <div className="mt-6 space-y-2">
          {selectedEvents.map((ev) => (
            <div key={ev.id} className="p-3 border rounded-xl flex justify-between items-center">
              <div>
                <p>{ev.title}</p>
                <p className="text-xs text-gray-500">{ev.subject}</p>
              </div>

              {canEdit && (
                <div className="flex gap-2">

                  <button onClick={() => sendToWhatsApp(ev)}>💬</button>

                  <button onClick={() => setEditingEvent(ev)}>
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button onClick={() => setDeleteTarget(ev)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>

                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>אירוע</DialogTitle>
          </DialogHeader>

          <Input placeholder="כותרת" onChange={(e) => setFormTitle(e.target.value)} />
          <Input placeholder="מקצוע" onChange={(e) => setFormSubject(e.target.value)} />
          <Input type="date" onChange={(e) => setFormDate(e.target.value)} />

          <Button onClick={handleSave}>שמור</Button>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          setEvents((prev) => prev.filter((e) => e.id !== deleteTarget?.id));
          setDeleteTarget(null);
        }}
        title="מחיקה"
        description="למחוק אירוע?"
        confirmLabel="מחק"
      />
    </div>
  );
};

export default CalendarPage;
