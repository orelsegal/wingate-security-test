import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { studentsData, statusConfig } from "@/lib/studentData";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import type { StatusType } from "@/lib/studentData";

const branches = ["שחייה", "טניס", "כדורסל", "אתלטיקה", "התעמלות"];
const grades = ["י׳", "י״א", "י״ב"];

const StudentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);

  // Role-based base data
  const baseData = useMemo(() => {
    if (!user) return studentsData;
    if (user.role === "parent") return studentsData.filter(s => user.scopeFilter?.includes(s.id));
    if (user.role === "coach") return studentsData.filter(s => user.scopeFilter?.includes(s.branch));
    return studentsData; // admin, teacher
  }, [user]);

  const filtered = useMemo(() => {
    return baseData.filter((s) => {
      if (search && !s.name.includes(search) && !s.branch.includes(search) && !s.grade.includes(search)) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (branchFilter && s.branch !== branchFilter) return false;
      if (gradeFilter && s.grade !== gradeFilter) return false;
      return true;
    });
  }, [baseData, search, statusFilter, branchFilter, gradeFilter]);

  const hasFilters = search || statusFilter || branchFilter || gradeFilter;

  const clearAll = () => {
    setSearch("");
    setStatusFilter(null);
    setBranchFilter(null);
    setGradeFilter(null);
  };

  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-6 md:space-y-8 max-w-[1400px]">
      <div className="space-y-1.5">
        <h2 className="text-xl md:text-[1.65rem] font-semibold text-foreground tracking-tight">ספורטאים</h2>
        <p className="text-muted-foreground text-[13px] md:text-sm">
          {baseData.length} ספורטאים {user?.role === "coach" ? `בענף ${user.scopeFilter?.[0]}` : "רשומים"} &middot; {filtered.length} מוצגים
        </p>
      </div>

      {/* Filters */}
      <div className="card-premium p-4 md:p-5 space-y-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, ענף או כיתה..."
            className="w-full h-10 ps-10 pe-4 bg-accent/50 border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-150"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-muted-foreground ms-1 me-1">סטטוס:</span>
            {(["green", "yellow", "red"] as StatusType[]).map((type) => {
              const config = statusConfig[type];
              const active = statusFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setStatusFilter(active ? null : type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                    active
                      ? config.activeBg + " " + config.textClass
                      : "bg-accent/60 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`w-[6px] h-[6px] rounded-full ${active ? config.dotClass : "bg-muted-foreground/40"}`} />
                  {config.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-7 bg-border self-center" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] text-muted-foreground ms-1 me-1">ענף:</span>
            {branches.map((b) => {
              const active = branchFilter === b;
              return (
                <button
                  key={b}
                  onClick={() => setBranchFilter(active ? null : b)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "bg-accent/60 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-7 bg-border self-center" />

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-muted-foreground ms-1 me-1">כיתה:</span>
            {grades.map((g) => {
              const active = gradeFilter === g;
              return (
                <button
                  key={g}
                  onClick={() => setGradeFilter(active ? null : g)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "bg-accent/60 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium text-destructive hover:bg-destructive/10 transition-all duration-150"
            >
              נקה הכל
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="card-premium overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_100px_80px_80px_100px] gap-4 px-6 py-3.5 border-b border-border bg-accent/30">
          <span className="text-[12px] font-medium text-muted-foreground">שם</span>
          <span className="text-[12px] font-medium text-muted-foreground">ענף</span>
          <span className="text-[12px] font-medium text-muted-foreground">כיתה</span>
          <span className="text-[12px] font-medium text-muted-foreground">ממוצע</span>
          <span className="text-[12px] font-medium text-muted-foreground">סטטוס</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-muted-foreground">
            לא נמצאו ספורטאים התואמים את הסינון
          </div>
        ) : (
          filtered.map((student, i) => (
            <div
              key={student.id}
              onClick={() => navigate(`/students/${student.id}`)}
              className={`grid grid-cols-1 md:grid-cols-[1fr_100px_80px_80px_100px] gap-1 md:gap-4 px-5 md:px-6 py-4 md:py-3.5 cursor-pointer ${
                i < filtered.length - 1 ? "border-b border-border" : ""
              } hover:bg-accent/20 transition-colors duration-100`}
            >
              <div className="flex items-center justify-between md:contents">
                <span className="text-[13px] font-medium text-foreground">{student.name}</span>
                <div className="md:hidden">
                  <StatusBadge type={student.status} />
                </div>
              </div>
              <div className="flex items-center gap-3 md:contents text-[12px] text-muted-foreground">
                <span>{student.branch}</span>
                <span className="text-border md:hidden">·</span>
                <span>{student.grade}</span>
                <span className="text-border md:hidden">·</span>
                <span>{student.avg}</span>
              </div>
              <div className="hidden md:flex items-center">
                <StatusBadge type={student.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentsPage;
