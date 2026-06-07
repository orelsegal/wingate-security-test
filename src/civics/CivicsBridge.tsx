/**
 * CivicsBridge — Context bridge for the civics 30% research stations,
 * mirroring the LarutzBridge pattern (page state + localStorage progress).
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocalStorage } from '@/larutz/hooks/useLocalStorage.js';

interface CivicsCtx {
  navigate: (page: string) => void;
  page: string;
  completed: Record<string, boolean>;
  markDone: (key: string) => void;
  saveAnswer: (key: string, val: any) => void;
  getAnswer: (key: string) => any;
  isDone: (key: string) => boolean;
  stationsDone: number;
  pct: number;
  answers: Record<string, any>;
  user: any;
  isTeacher: boolean;
}

const Ctx = createContext<CivicsCtx | null>(null);

export const useCivics = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCivics must be used inside CivicsBridge');
  return ctx;
};

export function CivicsBridge({ children }: { children: React.ReactNode }) {
  const { user: wingateUser } = useAuth();

  const [page, setPage] = useState<string>('dashboard');
  const [completed, setCompleted] = useLocalStorage<Record<string, boolean>>('civics-research-done', {});
  const [answers, setAnswers] = useLocalStorage<Record<string, any>>('civics-research-answers', {});

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
  const isDone    = useCallback((key: string) => Boolean(completed[key]), [completed]);

  const stationsDone = [1, 2, 3, 4, 5, 6].filter(n => isDone(`civics-${n}`)).length;
  const pct          = Math.round((stationsDone / 6) * 100);

  const wu = wingateUser as any;
  const user = wu ? {
    uid: wu.id || wu.uid,
    email: wu.email,
    displayName: wu.name || wu.displayName || wu.email,
  } : null;

  const isTeacher = wingateUser?.role === 'teacher' || wingateUser?.role === 'admin';

  return (
    <Ctx.Provider value={{
      navigate, page, completed, markDone, saveAnswer, getAnswer,
      isDone, stationsDone, pct, answers, user, isTeacher,
    }}>
      {children}
    </Ctx.Provider>
  );
}
