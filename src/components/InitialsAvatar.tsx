import { cn } from "@/lib/utils";

const bgColors = [
  "bg-primary/10 text-primary",
  "bg-success/10 text-success",
  "bg-warning/10 text-warning",
  "bg-[hsl(200_60%_94%)] text-[hsl(200_60%_40%)]",
  "bg-[hsl(280_40%_93%)] text-[hsl(280_40%_45%)]",
  "bg-[hsl(340_40%_93%)] text-[hsl(340_40%_45%)]",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % bgColors.length;
  return h;
}

interface InitialsAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-[12px]",
  md: "w-12 h-12 text-[15px]",
  lg: "w-20 h-20 md:w-24 md:h-24 text-[24px] md:text-[28px]",
};

const InitialsAvatar = ({ name, size = "sm", className }: InitialsAvatarProps) => {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const colorClass = bgColors[hashName(name)];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0 select-none",
        sizeClasses[size],
        colorClass,
        size === "lg" && "rounded-2xl",
        className,
      )}
    >
      {initials}
    </div>
  );
};

export default InitialsAvatar;
