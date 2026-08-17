import { listActivity } from "@/lib/db/queries";
import { ScrollArea } from "@/components/ui/scroll-area";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatTime(ms: Date): string {
  const d = new Date(ms);
  const h = d.getHours();
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${h12}:${min} ${ampm}`;
}

export async function ActivityFeed() {
  const items = await listActivity(50);

  return (
    <aside className="hidden w-72 shrink-0 border-l border-border lg:flex lg:flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold">Activity</h2>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            No activity yet — your actions will show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5 p-2">
            {items.map((a) => (
              <li key={a.id} className="rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60">
                <p className="text-xs leading-snug text-foreground">{a.summary}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatTime(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </aside>
  );
}
