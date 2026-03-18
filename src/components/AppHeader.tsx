import { Bell, Search, Menu } from "lucide-react";
import { useAuth, roleLabels } from "@/context/AuthContext";
import wingateLogoSrc from "@/assets/wingate-logo.png";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

const AppHeader = ({ onMenuToggle }: AppHeaderProps) => {
  const { user } = useAuth();

  return (
    <header className="h-[56px] bg-card border-b border-border flex items-center justify-between px-5 md:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={onMenuToggle}
          className="p-2 -me-1 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Small logo in header on mobile */}
        <div className="w-7 h-7 rounded-lg overflow-hidden md:hidden shrink-0">
          <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
        </div>
        <span className="text-foreground font-semibold text-[14px]">האקדמיה למצוינות</span>
        <span className="text-border hidden sm:inline">/</span>
        <span className="text-muted-foreground text-[13px] hidden sm:inline">מעקב אקדמי</span>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-[12px] font-medium text-muted-foreground me-1">
            {roleLabels[user.role]}
          </span>
        )}
        <button className="p-2.5 rounded-xl text-muted-foreground hover:bg-accent transition-colors duration-150">
          <Search className="h-[18px] w-[18px]" />
        </button>
        <button className="p-2.5 rounded-xl text-muted-foreground hover:bg-accent transition-colors duration-150 relative">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-2 start-2 w-[7px] h-[7px] bg-primary rounded-full ring-2 ring-card" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
