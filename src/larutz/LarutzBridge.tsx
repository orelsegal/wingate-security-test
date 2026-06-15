/**
 * LarutzBridge — Context bridge between the Wingate platform and the
 * "לרוץ עם מילים" app components (originally a standalone React app).
 *
 * Replaces Firebase auth + Firestore with:
 *  - Auth: Wingate's Supabase-backed AuthContext
 *  - Progress: localStorage (same keys as the original app — data persists)
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocalStorage } from './hooks/useLocalStorage.js';

/* ── Context type matching the original App.jsx API ── */
interface LarutzCtx {
  navigate: (page: string) => void;
  page: string;
  completed: Record<string, boolean>;
  markDone: (key: string) => void;
  saveAnswer: (key: string, val: any) => void;
  getAnswer: (key: string) => any;
  isDone: (key: string) => boolean;
  stationsDone: number;
  poemsDone: number;
  pct: number;
  answers: Record<string, any>;
  user: any;
  isTeacher: boolean;
  studentViewMode: boolean;
  setStudentViewMode: (v: boolean) => void;
}

const Ctx = createContext<LarutzCtx | null>(null);

/** Hook used by every station component: `const { navigate, isDone } = useApp()` */
export const useApp = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside LarutzBridge');
  return ctx;
};

interface Props {
  children: React.ReactNode;
  onExit?: () => void;
  initialPage?: string;
}

export function LarutzBridge({ children, onExit, initialPage }: Props) {
  const { user: wingateUser } = useAuth();

  const [page, setPage] = useState<string>(initialPage || 'dashboard');
  const [completed, setCompleted] = useLocalStorage<Record<string, boolean>>('mlri2-done', {});
  const [answers, setAnswers] = useLocalStorage<Record<string, any>>('mlri2-answers', {});
  const [studentViewMode, setStudentViewMode] = useState(false);

  const navigate = useCallback((p: string) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const markDone = useCallback((key: string) => {
    setCompleted((prev: Record<string, boolean>) => ({ ...prev, [key]: true }));
  }, [setCompleted]);

  const saveAnswer = useCallback((key: string, val: any) => {
    setAnswers((prev: Record<string, any>) => ({ ...prev, [key]: val }));
  }, [setAnswers]);

  const getAnswer = useCallback((key: string) => answers[key], [answers]);
  const isDone = useCallback((key: string) => Boolean(completed[key]), [completed]);

  const stationsDone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(n => isDone(`station-${n}`)).length;
  const poemsDone    = [1, 2, 3, 4, 5, 6, 7, 8].filter(n => isDone(`poem-${n}`)).length;
  const pct          = Math.round(((stationsDone + poemsDone) / 18) * 100);

  const isTeacher = wingateUser?.role === 'teacher' || wingateUser?.role === 'admin';

  /* Adapt the Wingate user object to match what the original app expects */
  const wu = wingateUser as any;
  const user = wu ? {
    uid:         wu.id || wu.uid,
    email:       wu.email,
    displayName: wu.name || wu.displayName || wu.email,
    photoURL:    wu.photoURL || null,
  } : null;

  const ctx: LarutzCtx = {
    navigate, page, completed, markDone, saveAnswer, getAnswer,
    isDone, stationsDone, poemsDone, pct, answers,
    user, isTeacher, studentViewMode, setStudentViewMode,
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}
