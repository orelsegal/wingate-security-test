import { Bell, Search, Menu } from "lucide-react";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

const AppHeader = ({ onMenuToggle }: AppHeaderProps) => {
  return (
    <header className="h-[56px] bg-card border-b border-border flex items-center justify-between px-5 md:px-8 sticky top-0 z-10">
      {/* Right side: menu + breadcrumb */}
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={onMenuToggle}
          className="p-2 -me-1 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-foreground font-semibold text-[14px]">לוח ראשי</span>
        <span className="text-border hidden sm:inline">/</span>
        <span className="text-muted-foreground text-[13px] hidden sm:inline">סקירה כללית</span>
      </div>

      {/* Left side: actions */}
      <div className="flex items-center gap-1">
        <button className="p-2.5 rounded-xl text-muted-foreground hover:bg-accent transition-colors duration-150">
          <Search className="h-[18px] w-[18px]" />
        </button>
        <button className="p-2.5 rounded-xl text-muted-foreground hover:bg-accent transition-colors duration-150 relative">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-2 start-2 w-[7px] h-[7px] bg-destructive rounded-full ring-2 ring-card" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
