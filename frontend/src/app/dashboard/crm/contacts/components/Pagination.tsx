"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageLoading: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageLoading,
}: PaginationProps) {
  const getVisiblePages = (totalPages: number, page: number) => {
    const maxVisible = 5;
    const pages: number[] = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (page <= 3) {
      start = 1;
      end = Math.min(totalPages, maxVisible);
    } else if (page >= totalPages - 2) {
      end = totalPages;
      start = Math.max(1, totalPages - (maxVisible - 1));
    }
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getVisiblePages(totalPages, currentPage);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || pageLoading}
        className="w-auto"
      >
        Previous
      </Button>
      {pageNumbers.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
          disabled={pageLoading}
          className="w-auto"
        >
          {page}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || pageLoading}
        className="w-auto"
      >
        Next
      </Button>
    </div>
  );
}
