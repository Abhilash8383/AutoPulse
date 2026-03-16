export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const a = (firstName ?? "").trim().charAt(0);
  const b = (lastName ?? "").trim().charAt(0);
  if (!a && !b) return "?";
  return `${a}${b}`.toUpperCase();
}

export function getVisiblePages(
  totalPages: number,
  currentPage: number,
  maxVisible: number = 5,
): number[] {
  const pages: number[] = [];

  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    start = 1;
    end = Math.min(totalPages, maxVisible);
  } else if (currentPage >= totalPages - 2) {
    end = totalPages;
    start = Math.max(1, totalPages - (maxVisible - 1));
  }

  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return pages;
}
