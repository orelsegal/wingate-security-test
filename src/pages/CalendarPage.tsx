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

/* ═══ Types ═══ */
interface CalendarEvent {
  id: string;
  title: string;
  subject: string;
  date: Date;
  type: "assignment" | "test" | "lesson" | "event";
  notes?: string;
}

const sendToWhatsApp = (ev: CalendarEvent) => {
  const message = `שם אירוע: ${ev.title}
מקצוע: ${ev.subject}
תאריך: ${new Date(ev.date).toLocaleDateString("he-IL")}
