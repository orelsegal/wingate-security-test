import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, UserPlus, Send, Copy, Check, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import InitialsAvatar from "@/components/InitialsAvatar";

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

const UserManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("teacher");
  const [inviteSport, setInviteSport] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "developer") navigate("/");
  }, [user, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, linked_sport, created_at")
      .order("created_at", { ascending: false });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role as AppRole]));

    setUsers(
      (profiles ?? []).map(p => ({
        ...p,
        role: roleMap.get(p.id) ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);

    // Store pending invite data in localStorage so onboarding page can read it
    const pendingInvites = JSON.parse(localStorage.getItem("pending_invites") || "{}");
    pendingInvites[inviteEmail.trim().toLowerCase()] = {
      full_name: inviteName.trim(),
      role: inviteRole,
      linked_sport: inviteSport.trim() || null,
    };
    localStorage.setItem("pending_invites", JSON.stringify(pendingInvites));

    // Send magic link / OTP
    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmail.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    setInviteLoading(false);

    if (error) {
      setInviteError("שגיאה בשליחה: " + error.message);
      return;
    }

    setInviteSent(inviteEmail.trim());
    toast({ title: `הזמנה נשלחה ל-${inviteEmail.trim()}`, description: `תפקיד: ${ROLE_LABELS[inviteRole]}` });
    setInviteEmail("");
    setInviteName("");
    setInviteRole("teacher");
    setInviteSport("");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/login`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filtered = users.filter(u =>
    (u.full_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (u.role ?? "").includes(query.toLowerCase())
  );

  if (user?.role !== "admin" && user?.role !== "developer") return null;

  return (
    <div className="p-5 md:p-8 max-w-[1000px]" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">ניהול משתמשים</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{users.length} משתמשים רשומים במערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadUsers} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            הזמן משתמש חדש
          </button>
        </div>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="card-premium p-6 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-foreground">הזמנת משתמש חדש</h2>
            <p className="text-[11px] text-muted-foreground">נשלח קישור כניסה לאימייל</p>
          </div>

          {inviteSent && (
            <Alert className="mb-4 border-success/30 bg-success/5">
              <AlertDescription className="text-[13px] text-success">
                ✅ הזמנה נשלחה בהצלחה ל-{inviteSent}
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
              <Input type="email" dir="ltr" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@wingate.ac.il" required className="text-left" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">תפקיד</Label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as AppRole)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-[13px] outline-none focus:ring-1 focus:ring-ring"
              >
                {(Object.entries(ROLE_LABELS) as [AppRole, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
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

            <div className="sm:col-span-2 flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "הועתק" : "העתק קישור כניסה"}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-xl border border-border text-[13px] text-muted-foreground hover:text-foreground">
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail || !inviteName}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[13px] font-medium disabled:opacity-50"
                >
                  {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  שלח הזמנה
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם, אימייל או תפקיד..."
          className="pr-9"
        />
      </div>

      {/* Users table */}
      <div className="card-premium overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid px-5 py-3 border-b border-border bg-muted/50 text-[11px] font-medium text-muted-foreground gap-4"
          style={{ gridTemplateColumns: "2fr 2fr 100px 120px 100px" }}>
          <span>שם</span>
          <span>אימייל</span>
          <span>תפקיד</span>
          <span>ענף</span>
          <span>הצטרף</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-muted-foreground text-center py-12">אין תוצאות</p>
        ) : (
          filtered.map(u => (
            <div key={u.id} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
              {/* Mobile */}
              <div className="md:hidden px-4 py-3 flex items-center gap-3">
                <InitialsAvatar name={u.full_name ?? u.email ?? "?"} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{u.full_name ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                </div>
                {u.role && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                    {ROLE_LABELS[u.role]}
                  </span>
                )}
              </div>

              {/* Desktop */}
              <div className="hidden md:grid px-5 py-3.5 items-center gap-4"
                style={{ gridTemplateColumns: "2fr 2fr 100px 120px 100px" }}>
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar name={u.full_name ?? u.email ?? "?"} size="sm" />
                  <span className="text-[13px] font-medium text-foreground truncate">{u.full_name ?? "—"}</span>
                </div>
                <span className="text-[12px] text-muted-foreground truncate" dir="ltr">{u.email ?? "—"}</span>
                <span>
                  {u.role ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {ROLE_LABELS[u.role]}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/50">—</span>
                  )}
                </span>
                <span className="text-[12px] text-muted-foreground">{u.linked_sport ?? "—"}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("he-IL")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;
