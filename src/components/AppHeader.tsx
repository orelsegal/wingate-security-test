import { Bell, Search } from "lucide-react";

const AppHeader = () => {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-foreground font-semibold">לוח ראשי</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">סקירה כללית</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
          <Search className="h-4 w-4" />
        </button>
        <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
