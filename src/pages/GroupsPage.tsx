import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, ChevronLeft, Loader2, Search, Filter, BookOpen } from "lucide-react";
import { useStudents, statusConfig, type StatusType } from "@/hooks/useStudents";
import { useAuth } from "@/context/AuthContext";
import InitialsAvatar from "@/components/InitialsAvatar";
import DataExportTools from "@/components/DataExportTools";
import { classToGrade, GRADE_ORDER } from "@/lib/schoolUtils";
import { GroupsSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";

const classOrder = GRADE_ORDER;

const subjectOptions = ["היסטוריה", "אזרחות", "אנגלית", "לשון", "מתמטיקה"];
const statusOptions = [
  { value: "", label: "הכל" },
  { value: "green", label: "טוב" },
  { value: "yellow", label: "בינוני" },
  { value: "red", label: "צריך חיזוק" },
];

const GroupsPage = () => {
  const navigate = useNavigate();
  const { data: students = [], isLoading } = useStudents();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "teacher" || user?.role === "coach";
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const sports = useMemo(() => [...new Set(students.map(s => s.sport))].sort(), [students]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof students>();
    students.filter(s => !(s as any).archived).forEach(s => {
      const grade = classToGrade(s.class_name);
      if (!map.has(grade)) map.set(grade, []);
      map.get(grade)!.push(s);
    });
    return classOrder
      .filter(g => map.has(g))
      .map(g => ({ name: g, students: map.get(g)! }));
  }, [students]);

  const selectedStudents = useMemo(() => {
    if (!selectedGroup) return [];
    const group = groups.find(g => g.name === selectedGroup);
    if (!group) return [];
    let list = group.students;
    if (search) list = list.filter(s => s.full_name.includes(search));
    if (statusFilter) list = list.filter(s => s.overall_status === statusFilter);
    if (sportFilter) list = list.filter(s => s.sport === sportFilter);
    return list;
  }, [selectedGroup, groups, search, statusFilter, sportFilter]);

  if (isLoading) {
    return <GroupsSkeleton />;
  }

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => selectedGroup ? (setSelectedGroup(null), setSearch(""), setStatusFilter(""), setSportFilter("")) : navigate(-1)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <EditableElement id="groups-page-title" type="page-title" defaultLabel="קבוצות" pageKey="groups">
          {({ inlineStyle }) => (
            <div className="flex-1" style={inlineStyle}>
              <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">
                {selectedGroup ? `כיתה ${selectedGroup}` : "קבוצות"}
              </h1>
              <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">
                {selectedGroup ? `${selectedStudents.length} תלמידים` : "תצוגה לפי כיתות ושכבות"}
              </p>
            </div>
          )}
        </EditableElement>
        {selectedGroup && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <DataExportTools
                students={selectedStudents}
                label={`כיתה ${selectedGroup}`}
              />
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors duration-150 ${showFilters ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
            >
              <Filter className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {!selectedGroup ? (
        /* ── Group Cards ── */
        <div className="flex flex-col gap-3">
          {groups.map((group, i) => {
            const green = group.students.filter(s => s.overall_status === "green").length;
            const yellow = group.students.filter(s => s.overall_status === "yellow").length;
            const red = group.students.filter(s => s.overall_status === "red").length;

            return (
              <EditableElement key={group.name} id={`group-card-${group.name}`} type="card" defaultLabel={`כרטיס כיתה ${group.name}`} pageKey="groups">
                {({ inlineStyle: cardStyle, visible }) => !visible ? null : (
              <button
                onClick={() => setSelectedGroup(group.name)}
                className="group bg-card rounded-2xl border border-border p-5 text-start transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer animate-fade-in-up w-full"
                style={{ ...cardStyle, animationDelay: `${60 + i * 40}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                    <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-semibold text-foreground leading-tight mb-1.5">כיתה {group.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10.5px] text-muted-foreground">{group.students.length} תלמידים</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
                          <span className="text-[10px] text-muted-foreground tabular-nums">{green}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[hsl(var(--warning))]" />
                          <span className="text-[10px] text-muted-foreground tabular-nums">{yellow}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-destructive" />
                          <span className="text-[10px] text-muted-foreground tabular-nums">{red}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-border shrink-0 group-hover:text-primary/50 transition-colors duration-200" strokeWidth={1.5} />
                </div>
              </button>
                )}
              </EditableElement>
            );
          })}
        </div>
      ) : (
        /* ── Student List with Filters ── */
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש תלמיד..."
              className="w-full h-9 ps-10 pe-4 bg-background border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/25 transition-all"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 mb-4 animate-fade-in-up">
              {/* Status filter */}
              <div className="flex gap-1.5">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(statusFilter === opt.value ? "" : opt.value)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                      statusFilter === opt.value
                        ? "bg-primary/10 border-primary/20 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Sport filter */}
              {sports.length > 0 && (
                <select
                  value={sportFilter}
                  onChange={e => setSportFilter(e.target.value)}
                  className="text-[10px] h-7 px-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                >
                  <option value="">כל הענפים</option>
                  {sports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {selectedStudents.map((student, i) => {
              const config = statusConfig[student.overall_status as StatusType];
              return (
                <button
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="group bg-card rounded-xl border border-border p-3.5 text-start transition-all duration-200 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <InitialsAvatar name={student.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[12.5px] font-semibold text-foreground leading-tight">{student.full_name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{student.sport} · {student.class_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full ${config?.bgClass || "bg-muted"} ${config?.textClass || "text-muted-foreground"}`}>
                        {config?.label || student.overall_status}
                      </span>
                      <ChevronLeft className="h-3.5 w-3.5 text-border group-hover:text-primary/50 transition-colors" strokeWidth={1.5} />
                    </div>
                  </div>
                </button>
              );
            })}
            {selectedStudents.length === 0 && (
              <EmptyState
                icon={Search}
                title="לא נמצאו תלמידים"
                description="נסי לשנות את הסינון"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GroupsPage;
