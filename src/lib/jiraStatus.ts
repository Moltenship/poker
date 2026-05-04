/**
 * Map a Jira `statusCategory.colorName` to a Tailwind class string for use on
 * a `<Badge variant="outline">`. Returns an empty string for unknown or
 * missing color names so the badge falls back to the default outline style.
 */
export function statusColorClass(colorName?: string): string {
  switch (colorName) {
    case "blue-gray":
      return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300";
    case "blue":
      return "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-600 dark:bg-blue-900 dark:text-blue-300";
    case "yellow":
      return "border-yellow-300 bg-yellow-100 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900 dark:text-yellow-300";
    case "green":
      return "border-green-300 bg-green-100 text-green-700 dark:border-green-600 dark:bg-green-900 dark:text-green-300";
    default:
      return "";
  }
}
