import { createContext, useContext } from "react";
import type { Course, DataAdapter, Session, Student, SubjectTheme } from "./types";

export interface AppValue {
  course: Course;
  theme: SubjectTheme;
  students: Student[];
  data: DataAdapter;
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

export const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
