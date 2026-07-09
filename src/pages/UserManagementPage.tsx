import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, UserPlus, Send, Copy, Check, Search, RefreshCw, Upload, Trash2, Mail, Link2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import InitialsAvatar from "@/components/InitialsAvatar";
import { useStudents, useSports } from "@/hooks/useStudents";
import * as XLSX from "xlsx";

type AppRole = "developer" | "admin" | "teacher" | "student" | "parent" | "coach";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole | null;
  linked_sport: string | null;
  linked_student_id: string | null;
  created_at: string;
}

/** Roles that may be provisioned via invite. admin/developer creation stays a
 *  separate manual admin process (also enforced server-side by pending_invites
 *  CHECK + claim_pending_invite guard). */
const INVITABLE_ROLES: AppRole[] = ["teacher", "coach", "parent", "student"];

const ROLE_LABELS: Record<AppRole, string> = {
  developer: "מפתח",
  admin: "מנהל",
  teacher: "מורה",
  student: "ספורטאי",
  parent: "הורה",
  coach: "מאמן",
};

const ROLE_COLORS: Record<AppRole, string> = {
  developer: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  teacher: "bg-green-100 text-green-700",
  student: "bg-yellow-100 text-yellow-700",
  parent: "bg-orange-100 text-orange-700",
  coach: "bg-red-100 text-red-700",
};

/** Role-aware link editor for one user row.
 *  parent/student → athlete-profile dropdown (linked_student_id)
 *  coach          → sport dropdown (linked_sport)
 *  other roles    → no link needed. */
const LinkCell = ({
  u, students, sports, saving, needsLink, onSave,
}: {
  u: UserRow;
  students: { id: string; full_name: string }[];
  sports: { sport_name: string }[];
  saving: boolean;
  needsLink: boolean;
  onSave: (userId: string, patch: { linked_student_id?: string | null; linked_sport?: string | null }) => void;
}) => {
  const selectCls =
    "w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-primary/40";

  if (u.role === "parent" || u.role === "student") {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <select
          className={selectCls}
          value={u.linked_student_id ?? ""}
          disabled={saving}
          onChange={e => onSave(u.id, { linked_student_id: e.target.value || null })}
        >
          <option value="">— ללא ספורטאי —</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
          : needsLink ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          : <Link2 className="h-3.5 w-3.5 text-success shrink-0" />}
      </div>
    );
  }

  if (u.role === "coach") {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <select
          className={selectCls}
          value={u.linked_sport ?? ""}
          disabled={saving}
          onChange={e => onSave(u.id, { linked_sport: e.target.value || null })}
        >
          <option value="">— ללא ענף —</option>
          {sports.map(s => (
            <option key={s.sport_name} value={s.sport_name}>{s.sport_name}</option>
          ))}
        </select>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
          : needsLink ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          : <Link2 className="h-3.5 w-3.5 text-success shrink-0" />}
      </div>
    );
  }

  return <span className="text-[11px] text-muted-foreground/50">לא נדרש</span>;
};

const UserManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "add" | "import">("list");
  const [copied, setCopied] = useState(false);
  const [sendingMagic, setSendingMagic] = useState<string | null>(null);
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [savingLink, setSavingLink] = useState<string | null>(null);

  // Data sources for the link dropdowns (existing hooks, admin-visible)
  const { data: students = [] } = useStudents();
  const { data: sports = [] } = useSports();

  // Add one form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("student");
  const [inviteSport, setInviteSport] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  // Import
  const [importRows, setImportRows] = useState<{ name: string; email: string; role: AppRole; sport?: string }[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importDone, setImportDone] = useState(0);

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "developer") navigate("/");
  }, [user, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, linked_sport, linked_student_id, created_at")
      .order("created_at", { ascending: false });

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role as AppRole]));

    setUsers((profiles ?? []).map(p => ({ ...p, role: roleMap.get(p.id) ?? null })));
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  // שליחת magic link למשתמש קיים
  const sendMagicLink = async (email: string) => {
    setSendingMagic(email);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setSendingMagic(null);
    if (error) {
      toast({ title: "שגיאה בשליחה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `✅ קישור כניסה נשלח ל-${email}` });
    }
  };

  // הוספת משתמש אחד
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);

    // שמור pending invite — server-side (admin-only table). Onboarding claims it
    // securely via claim_pending_invite(); the invited client never picks a role.
    const inviteEmailNorm = inviteEmail.trim().toLowerCase();
    const { error: inviteErr } = await supabase.from("pending_invites").upsert({
      email: inviteEmailNorm,
      full_name: inviteName.trim(),
      role: inviteRole,
      linked_sport: inviteRole === "coach" ? (inviteSport.trim() || null) : null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // refresh on re-invite
    }, { onConflict: "email" });
    if (inviteErr) {
      setInviteError("שגיאה בשמירת ההזמנה: " + inviteErr.message);
      setInviteLoading(false);
      return; // do not send the OTP if the invite row failed
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmailNorm,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/onboarding` },
    });

    setInviteLoading(false);
    if (error) { setInviteError("שגיאה: " + error.message); return; }

    setInviteSent(inviteEmail.trim());
    toast({ title: `✅ קישור כניסה נשלח ל-${inviteEmail.trim()}`, description: `תפקיד: ${ROLE_LABELS[inviteRole]}` });
    setInviteEmail(""); setInviteName(""); setInviteRole("student"); setInviteSport("");
  };

  // ייבוא מאקסל
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);
      const parsed = rows.map(r => ({
        name: r["שם"] || r["name"] || "",
        email: r["אימייל"] || r["email"] || "",
        role: (r["תפקיד"] || r["role"] || "student") as AppRole,
        sport: r["ענף"] || r["sport"] || "",
      })).filter(r => r.email);
      setImportRows(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportAll = async () => {
    setImportLoading(true);
    setImportDone(0);
    let failed = 0;
    for (const row of importRows) {
      // Only invitable roles may be provisioned through invites
      if (!INVITABLE_ROLES.includes(row.role)) { failed++; continue; }
      const emailNorm = row.email.trim().toLowerCase();
      const { error: invErr } = await supabase.from("pending_invites").upsert({
        email: emailNorm,
        full_name: row.name,
        role: row.role,
        linked_sport: row.role === "coach" ? (row.sport || null) : null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "email" });
      if (invErr) { failed++; continue; }

      await supabase.auth.signInWithOtp({
        email: emailNorm,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      setImportDone(d => d + 1);
      await new Promise(r => setTimeout(r, 300)); // throttle
    }
    setImportLoading(false);
    toast(failed > 0
      ? { title: `נשלחו ${importRows.length - failed} הזמנות · ${failed} נכשלו/נדחו`, variant: "destructive" as const }
      : { title: `✅ נשלחו ${importRows.length} הזמנות בהצלחה` });
    setImportRows([]);
    loadUsers();
  };

  // A user "needs a link" when its role requires scoping but the link is missing.
  // parent/student → linked_student_id · coach → linked_sport · others → no link needed.
  const needsLink = (u: UserRow): boolean => {
    if (u.role === "parent" || u.role === "student") return !u.linked_student_id;
    if (u.role === "coach") return !u.linked_sport;
    return false;
  };

  // Save a single link field on a user's profile row (admin-authorized by existing RLS).
  const saveLink = async (userId: string, patch: { linked_student_id?: string | null; linked_sport?: string | null }) => {
    setSavingLink(userId);
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    setSavingLink(null);
    if (error) {
      toast({ title: "שגיאה בשמירת הקישור", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ הקישור נשמר" });
      loadUsers();
    }
  };

  const filtered = users.filter(u =>
    ((u.full_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (u.role ?? "").includes(query.toLowerCase())) &&
    (!onlyUnlinked || needsLink(u))
  );

  const unlinkedCount = users.filter(needsLink).length;

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/login`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (user?.role !== "admin" && user?.role !== "developer") return null;

  return (
    <div className="p-5 md:p-8 max-w-[1000px]" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">ניהול משתמשים</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{users.length} משתמשים רשומים במערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "הועתק" : "קישור כניסה"}
          </button>
          <button onClick={loadUsers} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/40 rounded-xl p-1 w-fit">
        {[
          { key: "list", label: "רשימת משתמשים" },
          { key: "add", label: "➕ הוספה אחד אחד" },
          { key: "import", label: "📊 ייבוא מאקסל" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: רשימה ── */}
      {activeTab === "list" && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש לפי שם, אימייל או תפקיד..." className="pr-9" />
            </div>
            <button
              onClick={() => setOnlyUnlinked(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors shrink-0 ${
                onlyUnlinked
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {onlyUnlinked ? "מציג לא-מקושרים" : `לא מקושרים${unlinkedCount ? ` (${unlinkedCount})` : ""}`}
            </button>
          </div>

          <div className="card-premium overflow-hidden">
            <div className="hidden md:grid px-5 py-3 border-b border-border bg-muted/50 text-[11px] font-medium text-muted-foreground gap-4"
              style={{ gridTemplateColumns: "1.8fr 1.8fr 90px 220px 70px" }}>
              <span>שם</span><span>אימייל</span><span>תפקיד</span><span>קישור</span><span>פעולות</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-12">אין תוצאות</p>
            ) : (
              filtered.map(u => (
                <div key={u.id} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
                  <div className="hidden md:grid px-5 py-3.5 items-center gap-4"
                    style={{ gridTemplateColumns: "1.8fr 1.8fr 90px 220px 70px" }}>
                    <div className="flex items-center gap-2.5">
                      <InitialsAvatar name={u.full_name ?? u.email ?? "?"} size="sm" />
                      <span className="text-[13px] font-medium text-foreground truncate">{u.full_name ?? "—"}</span>
                    </div>
                    <span className="text-[12px] text-muted-foreground truncate" dir="ltr">{u.email ?? "—"}</span>
                    <span>
                      {u.role ? (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      ) : <span className="text-[11px] text-muted-foreground/50">—</span>}
                    </span>
                    <LinkCell
                      u={u}
                      students={students}
                      sports={sports}
                      saving={savingLink === u.id}
                      needsLink={needsLink(u)}
                      onSave={saveLink}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => u.email && sendMagicLink(u.email)}
                        disabled={sendingMagic === u.email}
                        title="שלח קישור כניסה"
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-40"
                      >
                        {sendingMagic === u.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden px-4 py-3">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar name={u.full_name ?? u.email ?? "?"} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{u.full_name ?? "—"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      {u.role && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      )}
                    </div>
                    {(u.role === "parent" || u.role === "student" || u.role === "coach") && (
                      <div className="mt-2.5">
                        <LinkCell
                          u={u}
                          students={students}
                          sports={sports}
                          saving={savingLink === u.id}
                          needsLink={needsLink(u)}
                          onSave={saveLink}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Tab: הוספה אחד אחד ── */}
      {activeTab === "add" && (
        <div className="card-premium p-6 animate-fade-in-up">
          <h2 className="text-[15px] font-semibold text-foreground mb-5">הוספת משתמש חדש</h2>

          {inviteSent && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertDescription className="text-[13px] text-green-700">
                ✅ קישור כניסה נשלח ל-{inviteSent}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">שם מלא</Label>
              <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="ישראל ישראלי" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">אימייל</Label>
              <Input type="email" dir="ltr" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@gmail.com" required className="text-left" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">תפקיד</Label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as AppRole)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-[13px] outline-none focus:ring-1 focus:ring-ring"
              >
                {INVITABLE_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">ענף ספורט <span className="text-muted-foreground">(אופציונלי)</span></Label>
              <Input value={inviteSport} onChange={e => setInviteSport(e.target.value)} placeholder="כדורסל, שחייה..." />
            </div>

            {inviteError && (
              <div className="sm:col-span-2">
                <Alert variant="destructive"><AlertDescription className="text-[12px]">{inviteError}</AlertDescription></Alert>
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail || !inviteName}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium disabled:opacity-50"
              >
                {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                שלח קישור כניסה
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab: ייבוא מאקסל ── */}
      {activeTab === "import" && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="card-premium p-6">
            <h2 className="text-[15px] font-semibold text-foreground mb-2">ייבוא מקובץ אקסל</h2>
            <p className="text-[12px] text-muted-foreground mb-4">
              הקובץ צריך לכלול עמודות: <strong>שם</strong>, <strong>אימייל</strong>, <strong>תפקיד</strong>, <strong>ענף</strong> (אופציונלי)
            </p>

            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-[13px] font-medium text-foreground">לחץ להעלאת קובץ Excel</p>
              <p className="text-[11px] text-muted-foreground mt-1">.xlsx, .xls, .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleExcelUpload}
              />
            </div>
          </div>

          {importRows.length > 0 && (
            <div className="card-premium overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
                <span className="text-[13px] font-medium">{importRows.length} משתמשים מוכנים לייבוא</span>
                <button
                  onClick={handleImportAll}
                  disabled={importLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-medium disabled:opacity-50"
                >
                  {importLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />{importDone}/{importRows.length}</>
                  ) : (
                    <><Send className="h-3.5 w-3.5" />שלח הזמנות לכולם</>
                  )}
                </button>
              </div>

              {importRows.map((row, i) => (
                <div key={i} className="border-b border-border/50 last:border-0 px-5 py-3 flex items-center gap-4">
                  <InitialsAvatar name={row.name || row.email} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{row.name || "—"}</p>
                    <p className="text-[11px] text-muted-foreground" dir="ltr">{row.email}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[row.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {ROLE_LABELS[row.role] ?? row.role}
                  </span>
                  {row.sport && <span className="text-[11px] text-muted-foreground">{row.sport}</span>}
                  <button onClick={() => setImportRows(rows => rows.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
