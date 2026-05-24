/**
 * EmptyState — polished empty/zero-data placeholder.
 * Drop-in replacement for bare "לא נמצאו..." text.
 */
import { type LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  /** "page" = full vertical centring; "inline" = smaller, for inside lists/tables */
  variant?: "page" | "inline";
}

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  variant = "inline",
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center animate-fade-in",
      variant === "page" ? "min-h-[40vh] px-8 py-16" : "py-12 px-6",
      className
    )}
    dir="rtl"
  >
    <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 animate-float">
      <Icon className="h-6 w-6 text-muted-foreground/40" strokeWidth={1.5} />
    </div>
    <p className="text-[13px] font-semibold text-foreground/70 leading-snug mb-1">{title}</p>
    {description && (
      <p className="text-[11.5px] text-muted-foreground/60 max-w-[240px] leading-relaxed">{description}</p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 text-[11px] font-semibold text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
