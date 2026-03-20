import wingateLogoSrc from "@/assets/wingate-logo.png";
import { cn } from "@/lib/utils";

interface WingateBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-9 h-9 rounded-xl",
  md: "w-[56px] h-[56px] rounded-2xl",
  lg: "w-[90px] h-[90px] rounded-[22px]",
};

const imgSizeMap = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-12 h-12",
};

const WingateBadge = ({ size = "md", className }: WingateBadgeProps) => (
  <div
    className={cn(
      "bg-card border border-border flex items-center justify-center",
      sizeMap[size],
      className,
    )}
  >
    <img src={wingateLogoSrc} alt="מכון וינגייט" className={cn("object-contain", imgSizeMap[size])} />
  </div>
);

export default WingateBadge;
