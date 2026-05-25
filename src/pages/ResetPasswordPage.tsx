import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import WingateBadge from "@/components/WingateBadge";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase sends the token in the URL hash — wait for the session to resolve.
  // With lazy-loaded routes the PASSWORD_RECOVERY event can fire before the
  // listener is registered, so we also check getSession() immediately.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("הסיסמאות אינן תואמות"); return; }
    if (password.length < 6) { setError("הסיסמה חייבת להיות לפחות 6 תווים"); return; }
    setError(null);
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError("לא הצלחנו לעדכן את הסיסמה. נסה/י שוב."); return; }
    setDone(true);
    setTimeout(() => navigate("/login"), 2500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-[400px] px-6">
        <div className="flex justify-center mb-7">
          <WingateBadge size="lg" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-[20px] font-bold text-foreground">איפוס סיסמה</h1>
          <p className="text-[12px] text-muted-foreground mt-1">הגדר/י סיסמה חדשה לחשבונך</p>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-[var(--shadow-card)] p-6">
          {done ? (
            <div className="text-center space-y-2 py-4">
              <p className="text-[28px]">✅</p>
              <p className="text-[14px] font-medium text-foreground">הסיסמה עודכנה בהצלחה</p>
              <p className="text-[12px] text-muted-foreground">מעביר/ה אותך לדף ההתחברות...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-[13px] text-muted-foreground">מאמת את הקישור...</p>
              <p className="text-[11px] text-muted-foreground/60">אם זה לוקח הרבה זמן, ייתכן שהקישור פג תוקף</p>
              <button onClick={() => navigate("/login")} className="text-[12px] text-primary hover:underline">חזרה להתחברות</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px]">סיסמה חדשה</Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    dir="ltr"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="text-left pr-10"
                    placeholder="לפחות 6 תווים"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px]">אימות סיסמה</Label>
                <Input
                  type="password"
                  dir="ltr"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="text-left"
                  placeholder="הקלד/י שוב"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-[12px]">{error}</AlertDescription>
                </Alert>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-[14px] font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />שומר...</> : "עדכן סיסמה"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
