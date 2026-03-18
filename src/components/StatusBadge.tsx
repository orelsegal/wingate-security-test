import { statusConfig } from "@/lib/studentData";
import type { StatusType } from "@/lib/studentData";

export const StatusBadge = ({ type, size = "sm" }: { type: StatusType; size?: "sm" | "md" }) => {
  const config = statusConfig[type];
  const sizeClasses = size === "md"
    ? "px-3 py-1.5 text-[12px] gap-2"
    : "px-2.5 py-1 text-[11px] gap-1.5";
  return (
    <span className={`inline-flex items-center rounded-full ${config.bgClass} ${sizeClasses}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${config.dotClass}`} />
      <span className={`font-medium ${config.textClass}`}>{config.label}</span>
    </span>
  );
};
