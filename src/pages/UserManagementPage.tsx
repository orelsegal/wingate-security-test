import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, UserPlus, Send, Copy, Check, Search, RefreshCw, Upload, Trash2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import InitialsAvatar from "@/components/InitialsAvatar";
import * as XLSX from "xlsx";

type AppRole = "developer" | "admin" | "teacher" | "student" | "parent" | "coach";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole | null;
  linked_sport: string | null;
  created_at: string;
}

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
      .select("id, email, full_name, linked_sport, created_at")
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

    // שמור pending invite
    const pendingInvites = JSON.parse(localStorage.getItem("pending_invites") || "{}");
    pendingInvites[inviteEmail.trim().toLowerCase()] = {
      full_name: inviteName.trim(),
      role: inviteRole,
      linked_sport: inviteSport.trim() || null,
    };
    localStorage.setItem("pending_invites", JSON.stringify(pendingInvites));

    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmail.trim(),
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
    for (const row of importRows) {
      const pendingInvites = JSON.parse(localStorage.getItem("pending_invites") || "{}");
      pendingInvites[row.email.toLowerCase()] = {
        full_name: row.name,
        role: row.role,
        linked_sport: row.sport || null,
      };
      localStorage.setItem("pending_invites", JSON.stringify(pendingInvites));

      await supabase.auth.signInWithOtp({
        email: row.email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      setImportDone(d => d + 1);
      await new Promise(r => setTimeout(r, 300)); // throttle
    }
    setImportLoading(false);
    toast({ title: `✅ נשלחו ${importRows.length} הזמנות בהצלחה` });
    setImportRows([]);
    loadUsers();
  };

  const filtered = users.filter(u =>
    (u.full_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (u.role ?? "").includes(query.toLowerCase())
  );

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
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש לפי שם, אימייל או תפקיד..." className="pr-9" />
          </div>

          <div className="card-premium overflow-hidden">
            <div className="hidden md:grid px-5 py-3 border-b border-border bg-muted/50 text-[11px] font-medium text-muted-foreground gap-4"
              style={{ gridTemplateColumns: "2fr 2fr 100px 120px 120px" }}>
              <span>שם</span><span>אימייל</span><span>תפקיד</span><span>ענף</span><span>פעולות</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-12">אין תוצאות</p>
            ) : (
              filtered.map(u => (
                <div key={u.id} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
                  <div className="hidden md:grid px-5 py-3.5 items-center gap-4"
                    style={{ gridTemplateColumns: "2fr 2fr 100px 120px 120px" }}>
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
                    <span className="text-[12px] text-muted-foreground">{u.linked_sport ?? "—"}</span>
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
                  <div className="md:hidden px-4 py-3 flex items-center gap-3">
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
                <option value="student">ספורטאי</option>
                <option value="teacher">מורה</option>
                <option value="coach">מאמן</option>
                <option value="parent">הורה</option>
                <option value="admin">מנהל</option>
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
