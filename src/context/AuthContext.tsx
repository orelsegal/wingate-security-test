import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type UserRole = "admin" | "teacher" | "parent" | "coach";

export interface AppUser {
  name: string;
  role: UserRole;
  email: string;
  /** For parent: student IDs. For coach: sport names */
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
};

export const roleDescriptions: Record<UserRole, string> = {
  admin: "ניהול מלא — ספורטאים, ציונים, דוחות והגדרות",
  teacher: "מעקב אחר כל הספורטאים והמקצועות",
  parent: "צפייה בהתקדמות הילד/ה שלי",
  coach: "מעקב אחר ספורטאי הענף שלי",
};

/** Demo users for each role — scopeFilter uses DB UUIDs */
export const demoUsers: AppUser[] = [
  { name: "דני כהן", role: "admin", email: "admin@wingate.ac.il" },
  { name: "רונית לוי", role: "teacher", email: "ronit@wingate.ac.il" },
  { name: "משה אברהם", role: "parent", email: "moshe@parent.com", scopeFilter: ["adbc2bd3-ccaf-420b-9fcc-c82fe6e3b8f5"] },
  { name: "יוסי גולן", role: "coach", email: "yossi@wingate.ac.il", scopeFilter: ["כדורסל"] },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);

  const login = useCallback((u: AppUser) => setUser(u), []);
  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
