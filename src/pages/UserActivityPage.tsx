import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { roleLabels } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, AlertTriangle, Clock, Search } from "lucide-react";

const hebrewRoles: Record<string, string> = {
  admin: "מנהל",
  teacher: "מורה",
  parent: "הורה",
  coach: "מאמן",
  student: "תלמיד",
};

interface ActivityRow {
  id: string;
  user_name: string;
  user_role: string;
  user_email: string;
  event_type: string;
  page_path: string | null;
  created_at: string;
}

const daysDiff = (date: string) => {
  const now = new Date();
  const d = new Date(date);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
};

const isToday = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

const isThisWeek = (date: string) => daysDiff(date) < 7;

const getInactivityLabel = (days: number) => {
  if (days >= 14) return "לא נכנס/ה 14+ ימים";
  if (days >= 7) return "לא נכנס/ה 7 ימים";
  if (days >= 3) return "לא נכנס/ה 3 ימים";
  return null;
};

const getStatusBadge = (lastDate: string) => {
  if (isToday(lastDate)) return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[11px]">פעיל/ה היום</Badge>;
  if (isThisWeek(lastDate)) return <Badge className="bg-blue-100 text-blue-700 border-0 text-[11px]">פעיל/ה השבוע</Badge>;
  const days = daysDiff(lastDate);
  const label = getInactivityLabel(days);
  if (days >= 7) return <Badge className="bg-red-100 text-red-700 border-0 text-[11px]">{label}</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-0 text-[11px]">{label}</Badge>;
};

type StatusFilter = "all" | "active_today" | "active_week" | "inactive_3" | "inactive_7";

const UserActivityPage = () => {
  const { labels } = useUiLabels();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity_logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as ActivityRow[];
    },
    refetchInterval: 30000,
  });

  // Build per-user summary
  const userSummaries = useMemo(() => {
    const map = new Map<string, { name: string; role: string; email: string; lastLogin: string; lastActivity: string; loginCount: number; lastPage: string }>();
    for (const log of logs) {
      const key = log.user_email;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          name: log.user_name,
          role: log.user_role,
          email: log.user_email,
          lastLogin: log.event_type === "login" ? log.created_at : "",
          lastActivity: log.created_at,
          loginCount: log.event_type === "login" ? 1 : 0,
          lastPage: log.page_path || "/",
        });
      } else {
        if (log.event_type === "login" && (!existing.lastLogin || log.created_at > existing.lastLogin)) {
          existing.lastLogin = log.created_at;
        }
        if (log.created_at > existing.lastActivity) {
          existing.lastActivity = log.created_at;
        }
        if (log.event_type === "login") existing.loginCount++;
        if (!existing.lastPage && log.page_path) existing.lastPage = log.page_path;
      }
    }
    return Array.from(map.values());
  }, [logs]);

  // Filtered
  const filtered = useMemo(() => {
    return userSummaries.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (searchQuery && !u.name.includes(searchQuery) && !u.email.includes(searchQuery)) return false;
      const days = daysDiff(u.lastActivity);
      if (statusFilter === "active_today" && !isToday(u.lastActivity)) return false;
      if (statusFilter === "active_week" && !isThisWeek(u.lastActivity)) return false;
      if (statusFilter === "inactive_3" && days < 3) return false;
      if (statusFilter === "inactive_7" && days < 7) return false;
      return true;
    });
  }, [userSummaries, roleFilter, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const todayLogins = userSummaries.filter((u) => u.lastLogin && isToday(u.lastLogin)).length;
    const activeToday = userSummaries.filter((u) => isToday(u.lastActivity)).length;
    const teachersToday = userSummaries.filter((u) => u.role === "teacher" && isToday(u.lastActivity)).length;
    const studentsToday = userSummaries.filter((u) => u.role === "student" && isToday(u.lastActivity)).length;
    const inactive3 = userSummaries.filter((u) => daysDiff(u.lastActivity) >= 3).length;
    const inactive7 = userSummaries.filter((u) => daysDiff(u.lastActivity) >= 7).length;
    return { todayLogins, activeToday, teachersToday, studentsToday, inactive3, inactive7 };
  }, [userSummaries]);

  const needsAttention = useMemo(() => {
    return userSummaries
      .filter((u) => (u.role === "student" || u.role === "teacher") && daysDiff(u.lastActivity) >= 3)
      .sort((a, b) => daysDiff(b.lastActivity) - daysDiff(a.lastActivity));
  }, [userSummaries]);

  const formatDate = (d: string) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " + date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  };

  const statCards = [
    { label: "כניסות היום", value: stats.todayLogins, icon: Clock, color: "text-primary" },
    { label: "משתמשים פעילים היום", value: stats.activeToday, icon: UserCheck, color: "text-emerald-600" },
    { label: "מורים פעילים היום", value: stats.teachersToday, icon: Users, color: "text-blue-600" },
    { label: "תלמידים פעילים היום", value: stats.studentsToday, icon: Users, color: "text-violet-600" },
    { label: "לא פעילים 3+ ימים", value: stats.inactive3, icon: AlertTriangle, color: "text-amber-600" },
    { label: "לא פעילים 7+ ימים", value: stats.inactive7, icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-foreground">{labels.pages.userActivity.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{labels.pages.userActivity.subtitle}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <s.icon className={`h-5 w-5 ${s.color}`} strokeWidth={1.5} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              דורשים תשומת לב ({needsAttention.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {needsAttention.slice(0, 10).map((u) => (
                <span key={u.email} className="text-[11px] bg-white border border-amber-200 rounded-full px-3 py-1 text-amber-800">
                  {u.name} ({hebrewRoles[u.role]}) — {getInactivityLabel(daysDiff(u.lastActivity))}
                </span>
              ))}
              {needsAttention.length > 10 && (
                <span className="text-[11px] text-amber-600">+{needsAttention.length - 10} נוספים</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או אימייל..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 text-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px] text-sm">
            <SelectValue placeholder="כל התפקידים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל התפקידים</SelectItem>
            <SelectItem value="admin">מנהל</SelectItem>
            <SelectItem value="teacher">מורה</SelectItem>
            <SelectItem value="student">תלמיד</SelectItem>
            <SelectItem value="parent">הורה</SelectItem>
            <SelectItem value="coach">מאמן</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[160px] text-sm">
            <SelectValue placeholder="כל הסטטוסים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="active_today">פעילים היום</SelectItem>
            <SelectItem value="active_week">פעילים השבוע</SelectItem>
            <SelectItem value="inactive_3">לא פעילים 3+ ימים</SelectItem>
            <SelectItem value="inactive_7">לא פעילים 7+ ימים</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">טוען נתונים...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">אין נתוני פעילות להצגה</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">תפקיד</TableHead>
                  <TableHead className="text-right">כניסה אחרונה</TableHead>
                  <TableHead className="text-right">פעילות אחרונה</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell className="text-right font-medium text-sm">{u.name}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-[11px] bg-muted rounded-full px-2 py-0.5">{hebrewRoles[u.role] || u.role}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatDate(u.lastLogin)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatDate(u.lastActivity)}</TableCell>
                    <TableCell className="text-right">{getStatusBadge(u.lastActivity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityPage;
