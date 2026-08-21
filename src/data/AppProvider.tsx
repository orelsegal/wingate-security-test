import { useMemo, useState, type ReactNode } from "react";
import { course } from "../content/course";
import { theme } from "../content/theme";
import { demoStudents } from "../content/students";
import { createLocalAdapter } from "./localAdapter";
import { loadSession, saveSession } from "./session";
import { AppContext, type AppValue } from "./appContext";

/**
 * Wires the content files and the data adapter into the app.
 * Swapping the backend = swapping the adapter created here.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => loadSession());

  const value = useMemo<AppValue>(() => {
    const data = createLocalAdapter(course, demoStudents);
    return {
      course,
      theme,
      students: demoStudents,
      data,
      session,
      signIn: (next) => {
        saveSession(next);
        setSession(next);
      },
      signOut: () => {
        saveSession(null);
        setSession(null);
      },
    };
  }, [session]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
