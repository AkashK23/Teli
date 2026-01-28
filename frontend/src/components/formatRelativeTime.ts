export function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  const sameMonth =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth();

  const sameYear = now.getFullYear() === date.getFullYear();

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  if (sameDay) {
    return `${diffHours} hours ago`;
  }

  if (sameMonth) {
    return `${diffDays} days ago`;
  }

  if (sameYear) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
