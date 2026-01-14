import { Skeleton } from "@/components/ui/skeleton";

export function StatsLoadingSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      
      {/* Client info card skeleton */}
      <Skeleton className="h-24 w-full" />
      
      {/* Sensor tabs skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-10 w-28" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
      
      {/* Map skeleton */}
      <Skeleton className="h-[350px] w-full" />
    </div>
  );
}