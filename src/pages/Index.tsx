import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import DashboardContent from "@/components/DashboardContent";

const Index = () => {
  return (
    <div className="min-h-screen flex" dir="rtl">
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 bg-background">
          <DashboardContent />
        </main>
      </div>
      <AppSidebar />
    </div>
  );
};

export default Index;
