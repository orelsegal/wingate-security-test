import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

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
  login: (user: AppUser) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoggedIn: false,
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

/** Mock users for development — login with email + password "123456" */
export const mockUsers: AppUser[] = [
  { name: "דני כהן", role: "admin", email: "admin@test.com" },
  { name: "רונית לוי", role: "teacher", email: "teacher@test.com" },
  { name: "נועם שטיינר", role: "student", email: "student@test.com", scopeFilter: ["adbc2bd3-ccaf-420b-9fcc-c82fe6e3b8f5"] },
];

/** @deprecated use mockUsers */
export const demoUsers = mockUsers;

const STORAGE_KEY = "wingate_auth_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const login = useCallback((u: AppUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
