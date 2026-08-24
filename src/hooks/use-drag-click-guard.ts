import { useEffect, useRef } from "react";

/**
 * Hook that prevents click handlers from firing after a drag operation.
 * Set `isDragging` from useDraggable/useSortable and check `draggingRef.current`
 * before handling clicks.
 *
 * Usage:
 * ```tsx
 * const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
 * const { draggingRef } = useDragClickGuard(isDragging);
 *
 * const handleClick = () => {
 *   if (draggingRef.current) return;
 *   // ... actual click logic
 * };
 * ```
 */
export function useDragClickGuard(isDragging: boolean) {
  const draggingRef = useRef(false);

  useEffect(() => {
    if (isDragging) {
      draggingRef.current = true;
      return;
    }
    const id = setTimeout(() => {
      draggingRef.current = false;
    }, 120);
    return () => clearTimeout(id);
  }, [isDragging]);

  return { draggingRef };
}
