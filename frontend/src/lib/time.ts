// frontend/src/lib/time.ts
//
// Small dependency-free relative-time formatter for feed/audit entries
// like "2 mins ago". Falls back to a plain date once something is old
// enough that "ago" phrasing stops being useful.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString).getTime();
  const diffMs = Date.now() - then;

  if (diffMs < MINUTE) return "just now";

  if (diffMs < HOUR) {
    const mins = Math.floor(diffMs / MINUTE);
    return `${mins} min${mins === 1 ? "" : "s"} ago`;
  }

  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffMs < 7 * DAY) {
    const days = Math.floor(diffMs / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ACTION_VERBS: Record<string, string> = {
  STATUS_CHANGE: "moved",
  TASK_CREATED: "created",
  TASK_ASSIGNED: "assigned",
  TASK_DELETED: "deleted",
};

/**
 * Renders an activity event in the format specified by the project brief:
 * "Ravi moved Task #12 from In Progress → In Review · 2 mins ago"
 */
export function formatActivityLine(params: {
  userName?: string | null;
  action: string;
  taskLabel: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
}): string {
  const { userName, action, taskLabel, fromValue, toValue, createdAt } = params;
  const displayName = userName ?? "System";
  const verb = ACTION_VERBS[action] ?? action.toLowerCase().replace(/_/g, " ");
  const transition = fromValue && toValue ? ` from ${fromValue} \u2192 ${toValue}` : "";
  return `${displayName} ${verb} ${taskLabel}${transition} \u00b7 ${formatRelativeTime(createdAt)}`;
}