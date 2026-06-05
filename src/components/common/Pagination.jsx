import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Tooltip from "./Tooltip";

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

  const isMinOption = resultsPerPage === resultsPerPageOptions[0];
  const isMaxOption = resultsPerPage === resultsPerPageOptions[resultsPerPageOptions.length - 1];
  const arrowSvg = isMinOption
    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7' fill='none' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 6L5 1L9 6'/%3E%3C/svg%3E")`
    : isMaxOption
    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7' fill='none' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1L5 6L9 1'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='14' viewBox='0 0 10 14' fill='none' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 5L5 1L9 5'/%3E%3Cpath d='M1 9L5 13L9 9'/%3E%3C/svg%3E")`;
  const arrowSize = isMinOption || isMaxOption ? "7px 5px" : "7px 10px";

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-[30px] pb-2 w-full">
      {/* Results info */}
      <div className="text-xs text-base-content/70">
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
        <div className="flex items-center gap-1 min-w-0">
          <Tooltip content={currentPage === 1 ? null : "Go to previous page"} position="top" wrapperClassName="inline-flex">
            <button
              className={`inline-flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors ${
                currentPage === 1 ? "opacity-30" : ""
              }`}
              onClick={handlePrevious}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} />
            </button>
          </Tooltip>

          {getPageNumbers().map((page, index) => (
            <button
              key={`page-${index}`}
              className={`btn btn-xs btn-square btn-ghost ${
                page === currentPage
                  ? "bg-white text-base-content hover:bg-white shadow-sm"
                  : page === "..."
                  ? "btn-disabled cursor-default"
                  : "hover:bg-base-200"
              }`}
              onClick={() => handlePageClick(page)}
              disabled={page === "..."}
              aria-label={typeof page === "number" ? `Page ${page}` : "More pages"}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ))}

          <Tooltip content={currentPage === totalPages ? null : "Go to next page"} position="top" wrapperClassName="inline-flex">
            <button
              className={`inline-flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors ${
                currentPage === totalPages ? "opacity-30" : ""
              }`}
              onClick={handleNext}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={13} />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Pipe separator when no page navigation is shown */}
      {totalPages <= 1 && showResultsPerPage && onResultsPerPageChange && (
        <span className="text-base-content/30">|</span>
      )}

      {/* Results per page selector */}
      {showResultsPerPage && onResultsPerPageChange && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <label htmlFor="resultsPerPage" className="text-xs text-base-content/70 whitespace-nowrap">
            Per page:
          </label>
          <select
            id="resultsPerPage"
            value={resultsPerPage}
            onChange={handleResultsPerPageChange}
            className="text-xs font-semibold text-base-content/70 bg-white rounded shadow-sm cursor-pointer h-6 appearance-none pl-[5px] pr-[16px]"
            style={{
              border: "none",
              outline: "none",
              width: `${resultsPerPage.toString().length * 8 + 22}px`,
              backgroundImage: arrowSvg,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 4px center",
              backgroundSize: arrowSize,
            }}
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