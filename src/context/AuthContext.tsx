import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type UserRole = "admin" | "teacher" | "parent" | "coach" | "student";

export interface AppUser {
  name: string;
  role: UserRole;
  email: string;
  /** For parent: student IDs. For coach: sport names. For student: own student ID */
  scopeFilter?: string[];
}

interface AuthContextType {
  user: AppUser | null;
  setRole: (role: UserRole) => void;
  logout: () => void;
  isLoggedIn: boolean;
  /** @deprecated use setRole */
  login: (user: AppUser) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setRole: () => {},
  logout: () => {},
  isLoggedIn: false,
  login: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const roleLabels: Record<UserRole, string> = {
  admin: "מנהל",
  teacher: "מורה",
  parent: "הורה",
  coach: "מאמן",
  student: "תלמיד",
};

export const roleDescriptions: Record<UserRole, string> = {
  admin: "ניהול מלא — ספורטאים, ציונים, דוחות והגדרות",
  teacher: "מעקב אחר כל הספורטאים והמקצועות",
  parent: "צפייה בהתקדמות הילד/ה שלי",
  coach: "מעקב אחר ספורטאי הענף שלי",
  student: "צפייה בלוח זמנים, מפת דרכים ולמידה",
};

/** Preset users per role */
const roleUsers: Record<UserRole, AppUser> = {
  admin: { name: "דני כהן", role: "admin", email: "admin@test.com" },
  teacher: { name: "רונית לוי", role: "teacher", email: "teacher@test.com" },
  student: { name: "נועם שטיינר", role: "student", email: "student@test.com", scopeFilter: ["adbc2bd3-ccaf-420b-9fcc-c82fe6e3b8f5"] },
  parent: { name: "יוסי אברהם", role: "parent", email: "parent@test.com", scopeFilter: ["adbc2bd3-ccaf-420b-9fcc-c82fe6e3b8f5"] },
  coach: { name: "מיכל דוד", role: "coach", email: "coach@test.com", scopeFilter: ["כדורגל"] },
};

/** @deprecated use roleUsers */
export const mockUsers: AppUser[] = Object.values(roleUsers);
/** @deprecated */
export const demoUsers = mockUsers;

const STORAGE_KEY = "wingate_auth_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const setRole = useCallback((role: UserRole) => {
    const u = roleUsers[role];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback((u: AppUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setRole, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
