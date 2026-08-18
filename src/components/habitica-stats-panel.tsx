"use client";
import type { CachedHabiticaStats } from "@/lib/habitica/types";
import { useTransition, useState } from "react";
import {
  Refresh01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function HabiticaStatsPanel({
  initial,
}: {
  initial: CachedHabiticaStats | null;
}) {
  const [stats, setStats] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try {
        const { refreshHabiticaStatsAction } = await import(
          "@/lib/actions"
        );
        const res = await refreshHabiticaStatsAction();
        if (res.ok && res.stats) setStats(res.stats);
        else setError(res.error ?? "Failed");
      } catch {
        setError("Could not refresh");
      }
    });
  }

  function doImport() {
    startTransition(async () => {
      try {
        const { importFromHabiticaAction } = await import(
          "@/lib/actions"
        );
        const res = await importFromHabiticaAction();
        if (res.ok) window.location.reload();
        else setError(res.message);
      } catch {
        setError("Import failed");
      }
    });
  }

  // XP progress
  const xpPct = stats
    ? Math.min(100, Math.round((stats.exp / stats.toNextLevel) * 100))
    : 0;
  const hpPct = stats
    ? Math.min(100, Math.round((stats.hp / stats.maxHealth) * 100))
    : 0;
  const mpPct = stats
    ? Math.min(100, Math.round((stats.mp / stats.maxMP) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Habitica
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={doImport}
            disabled={pending}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Import tasks from Habitica"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Refresh stats"
          >
            <HugeiconsIcon icon={Refresh01Icon} size={14} />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {!stats ? (
        <p className="text-sm text-muted-foreground">
          No stats yet. Click refresh to load from Habitica.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Level + Class */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">
              Lvl {stats.lvl}
            </span>
            {stats.class && (
              <span className="text-xs capitalize text-muted-foreground">
                {stats.class}
              </span>
            )}
          </div>

          {/* XP bar */}
          <StatBar
            label="XP"
            value={stats.exp}
            max={stats.toNextLevel}
            pct={xpPct}
            color="bg-amber-500"
          />

          {/* Gold */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-amber-500 font-bold tabular-nums">
              {stats.gp.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">Gold</span>
          </div>

          {/* HP bar */}
          <StatBar
            label="HP"
            value={stats.hp}
            max={stats.maxHealth}
            pct={hpPct}
            color="bg-red-500"
          />

          {/* MP bar */}
          <StatBar
            label="MP"
            value={stats.mp}
            max={stats.maxMP}
            pct={mpPct}
            color="bg-blue-500"
          />
        </div>
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  pct,
  color,
}: {
  label: string;
  value: number;
  max: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={"h-full rounded-full transition-all duration-300 " + color}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
