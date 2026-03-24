import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  MessageCircle,
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
  CalendarEvent["type"],
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

const typeOptions: { value: CalendarEvent["type"]; label: string }[] = [
  { value: "assignment", label: "משימה" },
  { value: "test", label: "מבחן" },
  { value: "lesson", label: "שיעור / מפגש" },
  { value: "event", label: "אירוע" },
];

/* ===== Helpers ===== */
const sendSingleEventToWhatsApp = (ev: CalendarEvent) => {
  const message = `שם אירוע: ${ev.title}
מקצוע: ${ev.subject}
סוג: ${typeConfig[ev.type]?.label || ev.type}
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
      `${index + 1}. ${ev.title} | ${ev.subject} | ${typeConfig[ev.type]?.label || ev.type}`
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
    typeConfig[ev.type]?.label || ev.type,
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

/* ===== Demo Data ===== */
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
  {
    id: "6",
    title: "שיעור היסטוריה – סיכום",
    subject: "היסטוריה",
    date: new Date(now.getFullYear(), now.getMonth(), 25),
    type: "lesson",
  },
  {
    id: "7",
    title: "הגשת תרגיל אנגלית",
    subject: "אנגלית",
    date: new Date(now.getFullYear(), now.getMonth() + 1, 3),
    type: "assignment",
  },
];

const dayNames = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/* ===== Page ===== */
const CalendarPage = () => {
  const { user } = useAuth();

  const canEdit =
    user?.role === "admin" ||
    user?.role === "teacher" ||
    user?.role === "coach";

  const canExport = canEdit;

  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [view, setView] = useState<"month" | "
