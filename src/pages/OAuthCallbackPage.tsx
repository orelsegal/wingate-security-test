import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable";
import { Loader2 } from "lucide-react";
import WingateBadge from "@/components/WingateBadge";

const OAuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // The lovable auth library handles the OAuth flow automatically
    // by detecting URL params and setting the session
    const handleOAuth = async () => {
      try {
        const result = await lovable.auth.signInWithOAuth("google");
        if (result?.error) {
          navigate("/login");
        } else if (!result?.redirected) {
          navigate("/");
        }
      } catch {
        navigate("/login");
      }
    };

    // Only run if we're on the callback path with a code/token
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.get("code") || hash.includes("access_token")) {
      handleOAuth();
    } else {
      // This is the initiate path — let lovable handle it
      handleOAuth();
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-4">
        <WingateBadge size="lg" />
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-[14px] text-muted-foreground">מתחבר עם Google...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
