import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination Component
 * 
 * A reusable pagination component with page navigation and results-per-page selector.
 * Uses Lomir design patterns with DaisyUI styling.
 * 
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items across all pages
 * @param {Function} props.onPageChange - Callback when page changes: (newPage) => void
 * @param {number} props.resultsPerPage - Current results per page setting
 * @param {Function} props.onResultsPerPageChange - Callback when results per page changes: (newLimit) => void
 * @param {boolean} props.showResultsPerPage - Whether to show the results per page selector (default: true)
 * @param {Array<number>} props.resultsPerPageOptions - Options for results per page (default: [10, 20, 30, 40])
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  resultsPerPage = 10,
  onResultsPerPageChange,
  showResultsPerPage = true,
  resultsPerPageOptions = [10, 20, 30, 40],
  hideOnSinglePage = false,
}) => {
  if (hideOnSinglePage ? totalPages <= 1 : totalPages <= 1 && totalItems === 0) {
    return null;
  }

  /**
   * Generate array of page numbers to display
   * Shows: first page, last page, current page, and neighbors
   * Uses ellipsis (...) for gaps
   */
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        endPage = 4;
      }

      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }

      if (startPage > 2) {
        pages.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (typeof page === "number" && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handleResultsPerPageChange = (e) => {
    const newLimit = parseInt(e.target.value);
    onResultsPerPageChange(newLimit);
  };

  // Calculate which items are being shown
  const startItem = (currentPage - 1) * resultsPerPage + 1;
  const endItem = Math.min(currentPage * resultsPerPage, totalItems);

  return (
    <div className="flex flex-wrap items-center gap-4 mt-8 pb-4">
      {/* Results info */}
      <div className="text-sm text-base-content/70">
        {totalItems > 0 ? (
          <span>
            Showing <span className="font-medium text-base-content">{startItem}</span> to{" "}
            <span className="font-medium text-base-content">{endItem}</span> of{" "}
            <span className="font-medium text-base-content">{totalItems}</span> results
          </span>
        ) : (
          <span>No results</span>
        )}
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            className={`btn btn-sm btn-outline border-base-300 hover:bg-base-200 hover:border-base-300 ${
              currentPage === 1 ? "btn-disabled opacity-50" : ""
            }`}
            onClick={handlePrevious}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {getPageNumbers().map((page, index) => (
            <button
              key={`page-${index}`}
              className={`btn btn-sm min-w-[2.5rem] ${
                page === currentPage
                  ? "btn-outline btn-primary"
                  : page === "..."
                  ? "btn-ghost btn-disabled cursor-default"
                  : "btn-outline border-base-300 hover:bg-base-200 hover:border-base-300"
              }`}
              onClick={() => handlePageClick(page)}
              disabled={page === "..."}
              aria-label={typeof page === "number" ? `Page ${page}` : "More pages"}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ))}

          <button
            className={`btn btn-sm btn-outline border-base-300 hover:bg-base-200 hover:border-base-300 ${
              currentPage === totalPages ? "btn-disabled opacity-50" : ""
            }`}
            onClick={handleNext}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Pipe separator when no page navigation is shown */}
      {totalPages <= 1 && showResultsPerPage && onResultsPerPageChange && (
        <span className="text-base-content/30">|</span>
      )}

      {/* Results per page selector */}
      {showResultsPerPage && onResultsPerPageChange && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <label htmlFor="resultsPerPage" className="text-sm text-base-content/70 whitespace-nowrap">
            Per page:
          </label>
          <select
            id="resultsPerPage"
            value={resultsPerPage}
            onChange={handleResultsPerPageChange}
            className="select select-bordered select-sm w-20 focus:outline-primary"
          >
            {resultsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default Pagination;