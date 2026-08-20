/** Tiny className combiner (avoids pulling in clsx to keep deps light). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
