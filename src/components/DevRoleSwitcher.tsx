import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";

interface RoleOption {
  role: UserRole;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  home: string;
}

const ROLES: RoleOption[] = [
  { role: "admin",   label: "מנהל",   emoji: "🏛",  color: "text-blue-700",   bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",   home: "/" },
  { role: "teacher", label: "מורה",   emoji: "📚",  color: "text-green-700",  bg: "bg-green-50 hover:bg-green-100 border-green-200", home: "/" },
  { role: "coach",   label: "מאמן",   emoji: "🏅",  color: "text-orange-700", bg: "bg-orange-50 hover:bg-orange-100 border-orange-200", home: "/" },
  { role: "parent",  label: "הורה",   emoji: "👨‍👩‍👧",  color: "text-purple-700", bg: "bg-purple-50 hover:bg-purple-100 border-purple-200", home: "/" },
  { role: "student", label: "ספורטאי", emoji: "🏃",  color: "text-teal-700",   bg: "bg-teal-50 hover:bg-teal-100 border-teal-200",   home: "/student-home" },
];

const DevRoleSwitcher = () => {
  const { realUser, previewRole, setPreviewRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Only render for developers and admins
  if (realUser?.role !== "developer" && realUser?.role !== "admin") return null;

  const activeOption = ROLES.find(r => r.role === previewRole);

  const handleSelect = (opt: RoleOption) => {
    setPreviewRole(opt.role);
    navigate(opt.home, { replace: true });
    setOpen(false);
  };

  const handleReset = () => {
    setPreviewRole(null);
    navigate("/", { replace: true });
    setOpen(false);
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-2" dir="rtl">
      {/* Expanded panel */}
      {open && (
        <div className="bg-white border border-border rounded-2xl shadow-xl p-4 w-[220px] animate-fade-in-up">
          <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-3 px-1">
            תצוגה מקדימה לפי תפקיד
          </p>
          <div className="flex flex-col gap-1.5">
            {ROLES.map((opt) => (
              <button
                key={opt.role}
                onClick={() => handleSelect(opt)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[13px] font-medium transition-all text-right ${opt.bg} ${opt.color} ${previewRole === opt.role ? "ring-2 ring-current ring-offset-1" : ""}`}
              >
                <span className="text-base leading-none">{opt.emoji}</span>
                <span>{opt.label}</span>
                {previewRole === opt.role && (
                  <span className="ms-auto text-[10px] font-bold opacity-70">פעיל</span>
                )}
              </button>
            ))}
          </div>

          {previewRole && (
            <button
              onClick={handleReset}
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[12px] font-medium text-gray-600 transition-colors"
            >
              <span>↩</span>
              <span>חזור לתצוגת מפתח</span>
            </button>
          )}
        </div>
      )}

      {/* Trigger pill */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border shadow-lg text-[12px] font-semibold transition-all ${
          previewRole
            ? `${activeOption?.bg ?? ""} ${activeOption?.color ?? ""} border-current/20`
            : "bg-gray-900 text-white border-gray-700 hover:bg-gray-800"
        }`}
      >
        <span className="text-sm leading-none">{activeOption?.emoji ?? "🔧"}</span>
        <span>{previewRole ? `תצוגת ${activeOption?.label}` : "החלף תפקיד"}</span>
        <span className="text-[10px] opacity-60">{open ? "▲" : "▼"}</span>
      </button>
    </div>
  );
};

export default DevRoleSwitcher;
