import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import PageTransition from "@/components/PageTransition";
import BuilderOverlay from "@/components/builder/BuilderOverlay";
import MobileBottomNav from "@/components/MobileBottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useActivityLogger } from "@/hooks/useActivityLogger";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useActivityLogger();

  return (
    <div className="min-h-screen flex flex-row-reverse" dir="rtl">
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-foreground/30 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 md:hidden">
            <AppSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <AppHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 bg-background overflow-x-hidden pb-16 md:pb-0">
          <ErrorBoundary>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
      <BuilderOverlay />
      <MobileBottomNav />
    </div>
  );
};

export default AppLayout;
