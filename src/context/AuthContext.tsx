import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type UserRole = "admin" | "teacher" | "parent" | "coach";

export interface AppUser {
  name: string;
  role: UserRole;
  email: string;
  /** For parent: child IDs. For coach: branch name */
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
  admin: "גישה מלאה לכל הנתונים וההגדרות",
  teacher: "צפייה בכל הספורטאים והמקצועות",
  parent: "צפייה בנתוני הילד/ה בלבד",
  coach: "צפייה בספורטאי הענף בלבד",
};

/** Demo users for each role */
export const demoUsers: AppUser[] = [
  { name: "דני כהן", role: "admin", email: "admin@wingate.ac.il" },
  { name: "רונית לוי", role: "teacher", email: "ronit@wingate.ac.il" },
  { name: "משה אברהם", role: "parent", email: "moshe@parent.com", scopeFilter: ["4"] },
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
