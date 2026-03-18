import { Bell, Search, Menu } from "lucide-react";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

const AppHeader = ({ onMenuToggle }: AppHeaderProps) => {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      {/* Right side: menu + breadcrumb */}
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-foreground font-semibold">לוח ראשי</span>
        <span className="text-muted-foreground hidden sm:inline">/</span>
        <span className="text-muted-foreground hidden sm:inline">סקירה כללית</span>
      </div>

      {/* Left side: actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
          <Search className="h-4 w-4" />
        </button>
        <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 start-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
