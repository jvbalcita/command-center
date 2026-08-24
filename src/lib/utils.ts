import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Slugify a string for fuzzy matching: lowercase, strip whitespace/hyphens.
 */
export function slug(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, "");
}
