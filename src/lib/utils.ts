/** Class-name joiner (shadcn-style `cn`, dependency-free). */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
