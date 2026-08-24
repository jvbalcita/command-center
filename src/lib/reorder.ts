export function moveItem<T extends { id: number }>(
  items: T[],
  activeId: number,
  overId: number,
): T[] {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function parseRoutineDragId(
  value: string | number,
): { kind: "habit" | "daily"; id: number } | null {
  const raw = String(value);
  const match = /^(habit|daily)-(\d+)$/.exec(raw);
  if (!match) return null;
  return { kind: match[1] as "habit" | "daily", id: Number(match[2]) };
}

export function routineDragId(kind: "habit" | "daily", id: number): string {
  return `${kind}-${id}`;
}
