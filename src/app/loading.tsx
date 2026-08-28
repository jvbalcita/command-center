import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Dashboard Stats Skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Kanban Board Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {["Todo", "In Progress", "Done"].map((col) => (
          <div key={col} className="w-72 shrink-0 space-y-3">
            <Skeleton className="h-6 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
