import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const logActivity = async (
  userName: string,
  userRole: string,
  userEmail: string,
  eventType: "login" | "page_view",
  pagePath?: string
) => {
  try {
    await supabase.from("activity_logs" as any).insert({
      user_name: userName,
      user_role: userRole,
      user_email: userEmail,
      event_type: eventType,
      page_path: pagePath || null,
    } as any);
  } catch (e) {
    console.error("Failed to log activity", e);
  }
};

export const useActivityLogger = () => {
  const { user } = useAuth();
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  // Log page views on navigation
  useEffect(() => {
    if (!user) return;
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;

    logActivity(user.name, user.role, user.email, "page_view", location.pathname);
  }, [location.pathname, user]);
};
