/**
 * PageSkeleton — reusable skeleton loading states for common page layouts.
 * Uses the shimmer animation from tailwind.config.ts.
 */
import { cn } from "@/lib/utils";

/** Single shimmer block */
export const SkeletonBlock = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "rounded-xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 bg-[length:200%_100%] animate-shimmer",
      className
    )}
  />
);

/** Full-page skeleton for the Students list */
export const StudentsPageSkeleton = () => (
  <div className="p-5 md:p-10 lg:p-14 max-w-[960px] mx-auto animate-fade-in" dir="rtl">
    {/* Header */}
    <div className="flex items-center justify-between mb-8">
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-3.5 w-24" />
      </div>
      <SkeletonBlock className="h-8 w-24 rounded-lg" />
    </div>
    {/* Search + filter bar */}
    <div className="flex gap-3 mb-6">
      <SkeletonBlock className="h-9 flex-1 rounded-xl" />
      <SkeletonBlock className="h-9 w-20 rounded-xl" />
    </div>
    {/* Table rows */}
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3 border-b border-border/40" style={{ animationDelay: `${i * 40}ms` }}>
        <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-3.5 w-32" />
          <SkeletonBlock className="h-2.5 w-20" />
        </div>
        <SkeletonBlock className="h-5 w-14 rounded-full hidden sm:block" />
        <SkeletonBlock className="h-3.5 w-10 hidden md:block" />
        <SkeletonBlock className="h-3.5 w-8 hidden lg:block" />
      </div>
    ))}
  </div>
);

/** Card-grid skeleton (for dashboard / role home) */
export const CardGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-[var(--shadow-card)]" style={{ animationDelay: `${i * 60}ms` }}>
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-28" />
            <SkeletonBlock className="h-2.5 w-16" />
          </div>
        </div>
        <SkeletonBlock className="h-2 w-full rounded-full" />
        <SkeletonBlock className="h-2 w-3/4 rounded-full" />
      </div>
    ))}
  </div>
);

/** Single student profile skeleton */
export const ProfileSkeleton = () => (
  <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto animate-fade-in space-y-6" dir="rtl">
    {/* Hero card */}
    <div className="bg-card rounded-2xl border border-border p-6 flex items-center gap-5">
      <SkeletonBlock className="w-16 h-16 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-5 w-36" />
        <SkeletonBlock className="h-3.5 w-24" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
    </div>
    {/* Stats row */}
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 text-center space-y-2">
          <SkeletonBlock className="h-6 w-8 mx-auto" />
          <SkeletonBlock className="h-2.5 w-16 mx-auto" />
        </div>
      ))}
    </div>
    {/* Sections */}
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-2.5 w-full" />
        <SkeletonBlock className="h-2.5 w-5/6" />
        <SkeletonBlock className="h-2.5 w-4/6" />
      </div>
    ))}
  </div>
);

/** Groups page skeleton */
export const GroupsSkeleton = () => (
  <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto animate-fade-in space-y-3" dir="rtl">
    <div className="flex items-center gap-3 mb-8">
      <SkeletonBlock className="w-8 h-8 rounded-lg shrink-0" />
      <div className="space-y-1.5">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-3 w-36" />
      </div>
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
        <SkeletonBlock className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-2.5 w-20" />
        </div>
        <SkeletonBlock className="h-4 w-4 rounded" />
      </div>
    ))}
  </div>
);
