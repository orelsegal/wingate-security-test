/**
 * Daily Quiz — DB-backed engine for "שנעלה על המסלול"
 * - 10 AI-generated multiple-choice questions per day per subject
 * - Subject rotates by weekday
 * - Class leaderboard from Supabase
 * - Yearly streak counter (1.9 → 20.6)
 */
import { supabase } from "@/integrations/supabase/client";
import type { DCTask } from "@/lib/dailyChallenge";

export type RawQuestion = {
  id?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type TodayQuiz = {
  date: string;
  subject: string;
  topic: string;
  questions: RawQuestion[];
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

/** School year window — daily streak counts only between these dates */
export const YEAR_START = "2025-09-01";
export const YEAR_END = "2026-06-20";
export const totalSchoolDays = () => {
  const start = new Date(YEAR_START);
  const end = new Date(YEAR_END);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
};

/** Fetch (or generate) today's quiz via edge function */
export async function loadTodayQuiz(): Promise<TodayQuiz> {
  const { data, error } = await supabase.functions.invoke("daily-quiz-generate", {
    body: {},
  });
  if (error) throw error;
  return data as TodayQuiz;
}

/** Convert raw AI questions to the existing DCTask shape (all "bubbles") */
export function toDCTasks(qs: RawQuestion[]): DCTask[] {
  return qs.map((q, i) => ({
    id: q.id || `q-${i}`,
    kind: "bubbles" as const,
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correctIndex,
    feedbackRight: q.explanation ? `נכון. ${q.explanation}` : "נכון!",
    feedbackWrong: q.explanation ? `לא מדויק. ${q.explanation}` : "לא נכון.",
  }));
}

export type QuizResultInput = {
  studentId: string;
  className: string;
  subject: string;
  correct: number;
  total: number;
  seconds: number;
};

export async function saveQuizResult(r: QuizResultInput) {
  const score = Math.round((r.correct / Math.max(1, r.total)) * 100);
  const { error } = await supabase
    .from("daily_quiz_results")
    .upsert(
      {
        student_id: r.studentId,
        class_name: r.className,
        quiz_date: todayKey(),
        subject: r.subject,
        correct: r.correct,
        total: r.total,
        score,
        seconds: r.seconds,
        daily_point: true,
      },
      { onConflict: "student_id,quiz_date" },
    );
  if (error) throw error;
}

export type LeaderRow = {
  student_id: string;
  full_name: string;
  score: number;
  correct: number;
  total: number;
};

/** Today's class leaderboard for a specific class */
export async function getClassLeaderboard(className: string, date = todayKey()): Promise<LeaderRow[]> {
  const { data: results } = await supabase
    .from("daily_quiz_results")
    .select("student_id, score, correct, total")
    .eq("class_name", className)
    .eq("quiz_date", date)
    .order("score", { ascending: false })
    .limit(20);
  if (!results?.length) return [];

  const ids = results.map((r) => r.student_id);
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .in("id", ids);
  const nameMap = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  return results.map((r) => ({
    student_id: r.student_id,
    full_name: nameMap.get(r.student_id) || "תלמיד/ה",
    score: r.score,
    correct: r.correct,
    total: r.total,
  }));
}

/** Class average for today */
export async function getClassAverageToday(className: string, date = todayKey()) {
  const { data } = await supabase
    .from("daily_quiz_results")
    .select("score")
    .eq("class_name", className)
    .eq("quiz_date", date);
  if (!data?.length) return null;
  return Math.round(data.reduce((s, r) => s + (r.score ?? 0), 0) / data.length);
}

/** Streak count = number of distinct days the student played within school year */
export async function getStudentStreakPoints(studentId: string) {
  const { data } = await supabase
    .from("daily_quiz_results")
    .select("quiz_date, daily_point")
    .eq("student_id", studentId)
    .gte("quiz_date", YEAR_START)
    .lte("quiz_date", YEAR_END);
  const days = new Set((data ?? []).filter((r) => r.daily_point).map((r) => r.quiz_date));
  return days.size;
}

/** Today's rank for a student inside their class */
export async function getStudentRankToday(studentId: string, className: string, date = todayKey()) {
  const board = await getClassLeaderboard(className, date);
  const idx = board.findIndex((b) => b.student_id === studentId);
  return idx >= 0 ? { rank: idx + 1, of: board.length } : { rank: 0, of: board.length };
}
