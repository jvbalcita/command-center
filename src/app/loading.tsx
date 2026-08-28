import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Dashboard Stats Skeleton */}
        <div className="grid grid-cols-2 gap-3 px-6 pt-6 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card px-4 py-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-7 w-12" />
            </div>
          ))}
        </div>

        {/* Kanban Board Skeleton */}
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-6">
          {["Todo", "In Progress", "Done"].map((col) => (
            <div key={col} className="flex h-full w-[280px] shrink-0 flex-col rounded-xl border border-border bg-muted/40">
              <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto h-5 w-6 rounded-md" />
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded" />
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <div className="mt-2 flex gap-2">
                          <Skeleton className="h-4 w-16 rounded" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed Skeleton */}
      <aside className="hidden h-full min-h-0 w-72 shrink-0 self-stretch border-l border-border lg:flex lg:flex-col">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex-1 p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg px-2.5 py-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
