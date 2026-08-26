import { NextResponse } from "next/server";
import { getDb, db } from "@/lib/db";
import { tasks, dailies, habits } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function GET() {
  await getDb();
  try {
    const [openTasks, completedToday, totalDailies, dailiesCompletedToday, totalHabits, habitStreaks] =
      await Promise.all([
        // Open tasks (not done)
        db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(eq(tasks.isArchived, false)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(and(eq(tasks.status, "done"), eq(tasks.isArchived, false))),
        // Total dailies
        db.select({ count: sql<number>`count(*)` }).from(dailies),
        // Dailies completed today
        db
          .select({ count: sql<number>`count(*)` })
          .from(dailies)
          .where(eq(dailies.completedToday, true)),
        // Total habits
        db.select({ count: sql<number>`count(*)` }).from(habits),
        // Habit streaks (sum of all counterUp)
        db
          .select({ total: sql<number>`coalesce(sum(${habits.counterUp}), 0)` })
          .from(habits),
      ]);

    const totalOpen = openTasks[0]?.count ?? 0;
    const totalCompleted = completedToday[0]?.count ?? 0;

    return NextResponse.json({
      ok: true,
      data: {
        openTasks: totalOpen,
        completedTasks: totalCompleted,
        totalTasks: totalOpen + totalCompleted,
        totalDailies: totalDailies[0]?.count ?? 0,
        dailiesCompletedToday: dailiesCompletedToday[0]?.count ?? 0,
        totalHabits: totalHabits[0]?.count ?? 0,
        habitScoreTotal: habitStreaks[0]?.total ?? 0,
      },
    });
  } catch (error) {
    console.error("Failed to compute stats:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to compute stats" },
      { status: 500 },
    );
  }
}
