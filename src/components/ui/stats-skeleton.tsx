import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Skeleton for stat cards (used in dashboard header stats)
export function StatCardSkeleton() {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// Skeleton for chart areas
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div 
      className="flex flex-col items-center justify-center bg-muted/20 rounded-lg animate-pulse"
      style={{ height }}
    >
      <div className="flex items-end gap-2 mb-4">
        <Skeleton className="w-4 h-16" />
        <Skeleton className="w-4 h-24" />
        <Skeleton className="w-4 h-20" />
        <Skeleton className="w-4 h-28" />
        <Skeleton className="w-4 h-18" />
        <Skeleton className="w-4 h-22" />
        <Skeleton className="w-4 h-14" />
        <Skeleton className="w-4 h-26" />
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

// Skeleton for mini summary cards (4-column grid)
export function SummaryCardSkeleton() {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

// Skeleton for tabs header
export function TabsHeaderSkeleton() {
  return (
    <div className="flex gap-2">
      <Skeleton className="h-9 w-20 rounded-md" />
      <Skeleton className="h-9 w-24 rounded-md" />
      <Skeleton className="h-9 w-20 rounded-md" />
      <Skeleton className="h-9 w-20 rounded-md" />
      <Skeleton className="h-9 w-22 rounded-md" />
    </div>
  );
}

// Full stats history section skeleton
export function StatsHistorySkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </div>

      {/* Tabs skeleton */}
      <TabsHeaderSkeleton />

      {/* Chart skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={300} />
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard stat card with chart skeleton
export function StatCardWithChartSkeleton() {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-24 mb-2" />
        <Skeleton className="h-3 w-40 mb-4" />
        {/* Mini chart skeleton */}
        <div className="flex items-end gap-1 h-12">
          <Skeleton className="w-3 h-6" />
          <Skeleton className="w-3 h-8" />
          <Skeleton className="w-3 h-5" />
          <Skeleton className="w-3 h-10" />
          <Skeleton className="w-3 h-7" />
          <Skeleton className="w-3 h-9" />
          <Skeleton className="w-3 h-4" />
          <Skeleton className="w-3 h-11" />
        </div>
      </CardContent>
    </Card>
  );
}

// Power chart section skeleton
export function PowerChartSkeleton() {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <ChartSkeleton height={250} />
      </CardContent>
    </Card>
  );
}

// Sensor section skeleton (temperature, humidity, etc.)
export function SensorSectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <Card>
        <CardContent className="pt-6">
          <ChartSkeleton height={200} />
        </CardContent>
      </Card>
    </div>
  );
}

// Table skeleton for data grids
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b border-border/50">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
