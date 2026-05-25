import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type UserRole = "developer" | "admin" | "teacher" | "parent" | "coach" | "student";

export interface AppUser {
  name: string;
  role: UserRole;
  email: string;
  /** For parent: student IDs. For coach: sport names. For student: own student ID */
  scopeFilter?: string[];
}

interface AuthContextType {
  user: AppUser | null;
  realUser: AppUser | null;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  login: (user: AppUser) => void;
  logout: () => void;
  isLoggedIn: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  realUser: null,
  previewRole: null,
  setPreviewRole: () => {},
  login: () => {},
  logout: () => {},
  isLoggedIn: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const roleLabels: Record<UserRole, string> = {
  developer: "מפתח",
  admin: "מנהל",
  teacher: "מורה",
  parent: "הורה",
  coach: "מאמן",
  student: "תלמיד",
};

export const roleDescriptions: Record<UserRole, string> = {
  developer: "פיתוח ועיצוב המערכת — גישה מלאה לכלי הבנייה",
  admin: "ניהול מלא — ספורטאים, ציונים, דוחות והגדרות",
  teacher: "מעקב אחר כל הספורטאים והמקצועות",
  parent: "צפייה בהתקדמות הילד/ה שלי",
  coach: "מעקב אחר ספורטאי הענף שלי",
  student: "צפייה בלוח זמנים, מפת דרכים ולמידה",
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

  // Priority: developer > admin > others
  const roleList = roles.map((r) => r.role as UserRole);
  const role: UserRole = roleList.includes("developer") ? "developer"
    : roleList.includes("admin") ? "admin"
    : roleList[0];

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
  const [user, setUser] = useState<AppUser | null>(null);
  const [previewRole, setPreviewRoleState] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const setPreviewRole = useCallback((role: UserRole | null) => {
    setPreviewRoleState(role);
  }, []);

  const previewScopeFilter = previewRole
    ? demoUsers.find(d => d.role === previewRole)?.scopeFilter
    : undefined;

  const effectiveUser = user && previewRole
    ? { ...user, role: previewRole, scopeFilter: previewScopeFilter }
    : user;

  useEffect(() => {
    // Clear any leftover legacy demo auth keys — real auth is Supabase only.
    try {
      ["wingate_demo_user", "demo_user", "wingate_role", "demo_role"].forEach((k) =>
        window.localStorage.removeItem(k),
      );
    } catch { /* ignore */ }

    // Subscribe FIRST, then check the existing session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // No session => signed out. Always clear the in-memory user.
        setUser(null);
        return;
      }
      // Defer DB calls to avoid deadlock inside the auth callback
      setTimeout(async () => {
        const appUser = await buildAppUserFromSession(session);
        setUser(appUser); // null if no role — ProtectedRoute will bounce to /login
      }, 0);
    });

    // Initial session check
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const appUser = await buildAppUserFromSession(session);
        setUser(appUser);
      }
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback((u: AppUser) => setUser(u), []);

  const logout = useCallback(async () => {
    setUser(null);
    setPreviewRoleState(null);
    try {
      ["wingate_demo_user", "demo_user", "wingate_role", "demo_role"].forEach((k) =>
        window.localStorage.removeItem(k),
      );
    } catch { /* ignore */ }
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{
      user: effectiveUser,
      realUser: user,
      previewRole,
      setPreviewRole,
      login,
      logout,
      isLoggedIn: !!user,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
