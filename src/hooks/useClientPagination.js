import { useCallback, useMemo, useState } from "react";
import { DEFAULT_RESULTS_PER_PAGE } from "../constants/pagination";

const useClientPagination = ({
  items = [],
  defaultPerPage = DEFAULT_RESULTS_PER_PAGE,
} = {}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / perPage)),
    [items.length, perPage],
  );
  const clampedPage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(
    () =>
      items.slice((clampedPage - 1) * perPage, clampedPage * perPage),
    [clampedPage, items, perPage],
  );
  const shouldShowPagination = items.length > DEFAULT_RESULTS_PER_PAGE;

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const handlePerPageChange = useCallback((newLimit) => {
    setPerPage(newLimit);
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    setCurrentPage,
    perPage,
    totalPages,
    clampedPage,
    paginatedItems,
    shouldShowPagination,
    handlePageChange,
    handlePerPageChange,
  };
};

export default useClientPagination;
