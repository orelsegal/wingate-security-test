import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "teacher" | "parent" | "coach" | "student" | "coordinator" | "staff";

export interface AppUser {
  name: string;
  role: UserRole;
  email: string;
  /** Optional sub-type for "staff" demo role (e.g. "tutor"). */
  staff_type?: string;
  /** For parent: student IDs. For coach: sport names. For student: own student ID */
  scopeFilter?: string[];
}

interface AuthContextType {
  user: AppUser | null;
  login: (user: AppUser) => void;
  /** Demo-only: persist a mock user in localStorage and set the session. */
  demoLogin: (user: AppUser) => void;
  /** Demo-only: clear the mock user. */
  demoLogout: () => void;
  logout: () => void;
  isLoggedIn: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  demoLogin: () => {},
  demoLogout: () => {},
  logout: () => {},
  isLoggedIn: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

const DEMO_USER_KEY = "wingate_demo_user";

export const roleLabels: Record<UserRole, string> = {
  admin: "מנהל",
  teacher: "מורה",
  parent: "הורה",
  coach: "מאמן",
  student: "תלמיד",
  coordinator: "רכזת",
  staff: "צוות",
};

export const roleDescriptions: Record<UserRole, string> = {
  admin: "ניהול מלא — ספורטאים, ציונים, דוחות והגדרות",
  teacher: "מעקב אחר כל הספורטאים והמקצועות",
  parent: "צפייה בהתקדמות הילד/ה שלי",
  coach: "מעקב אחר ספורטאי הענף שלי",
  student: "צפייה בלוח זמנים, מפת דרכים ולמידה",
  coordinator: "מרכז שליטה — ניהול כולל של מפגשים, צוות וספורטאים",
  staff: "המפגשים שלי, אישורים, סיכומים וספורטאים משויכים",
};

/** Demo users for each role — kept for LoginPage fallback (mock mode) */
export const demoUsers: AppUser[] = [
  { name: "דני כהן", role: "admin", email: "admin@wingate.ac.il" },
  { name: "רונית לוי", role: "teacher", email: "ronit@wingate.ac.il" },
  { name: "משה אברהם", role: "parent", email: "moshe@parent.com", scopeFilter: ["adbc2bd3-ccaf-420b-9fcc-c82fe6e3b8f5"] },
  { name: "יוסי גולן", role: "coach", email: "yossi@wingate.ac.il", scopeFilter: ["כדורסל"] },
  { name: "נועם שטיינר", role: "student", email: "noam@student.wingate.ac.il", scopeFilter: ["adbc2bd3-ccaf-420b-9fcc-c82fe6e3b8f5"] },
];

/** Build AppUser from Supabase session by fetching profile + role. */
async function buildAppUserFromSession(session: Session): Promise<AppUser | null> {
  const userId = session.user.id;
  const email = session.user.email ?? "";

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, linked_student_id, linked_sport").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  if (!roles || roles.length === 0) {
    // No role assigned yet — cannot resolve a typed AppUser
    return null;
  }

  // Prefer admin if multiple roles exist, otherwise pick the first
  const roleList = roles.map((r) => r.role as UserRole);
  const role: UserRole = roleList.includes("admin") ? "admin" : roleList[0];

  let scopeFilter: string[] | undefined;
  if (role === "parent" || role === "student") {
    if (profile?.linked_student_id) scopeFilter = [profile.linked_student_id];
  } else if (role === "coach") {
    if (profile?.linked_sport) scopeFilter = [profile.linked_sport];
  }

  return {
    name: profile?.full_name || email,
    email: profile?.email || email,
    role,
    scopeFilter,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    // Hydrate demo user synchronously so first paint is already authed
    try {
      const raw = localStorage.getItem(DEMO_USER_KEY);
      if (raw) return JSON.parse(raw) as AppUser;
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return; // keep any mock/demo user in state
      setTimeout(async () => {
        const appUser = await buildAppUserFromSession(session);
        if (appUser) setUser(appUser);
      }, 0);
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const appUser = await buildAppUserFromSession(session);
        if (appUser) setUser(appUser);
      }
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback((u: AppUser) => setUser(u), []);

  const demoLogin = useCallback((u: AppUser) => {
    try { localStorage.setItem(DEMO_USER_KEY, JSON.stringify(u)); } catch {}
    setUser(u);
  }, []);

  const demoLogout = useCallback(() => {
    try { localStorage.removeItem(DEMO_USER_KEY); } catch {}
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(DEMO_USER_KEY); } catch {}
    setUser(null);
    void supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, demoLogin, demoLogout, logout, isLoggedIn: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
