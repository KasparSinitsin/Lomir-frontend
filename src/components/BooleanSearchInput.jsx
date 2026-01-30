import React, { useState, useCallback, useRef } from "react";
import SearchHelp from "./SearchHelp";

/**
 * Enhanced Search Input with Boolean Search Support
 *
 * Features:
 * - Detects boolean operators and shows indicator
 * - Includes search help tooltip
 * - Validates query before submission
 */
const BooleanSearchInput = ({
  onSearch,
  initialQuery = "",
  placeholder = "Search teams and users...",
  className = "",
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [hasBooleanOperators, setHasBooleanOperators] = useState(false);
  const inputRef = useRef(null);


  // Check if query contains boolean operators
  const checkBooleanOperators = useCallback((value) => {
    if (!value) return false;

    const upperValue = value.toUpperCase();
    const hasOperators =
      upperValue.includes(" AND ") ||
      upperValue.includes(" OR ") ||
      upperValue.includes(" NOT ") ||
      value.includes('"') ||
      value.includes("'") ||
      value.includes(" -") ||
      value.startsWith("-");

    return hasOperators;
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setHasBooleanOperators(checkBooleanOperators(value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
            ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`input input-bordered w-full pr-24 ${
                hasBooleanOperators ? "border-primary" : ""
              }`}
              minLength={2}
            />

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {hasBooleanOperators && (
                <span className="badge badge-primary badge-sm">Advanced</span>
              )}
              <SearchHelp anchorRef={inputRef} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={query.trim().length < 2}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search
          </button>
        </div>

        <div className="flex justify-end items-center mt-2">
          {query.trim().length > 0 && query.trim().length < 2 && (
            <span className="text-xs text-warning">
              Enter at least 2 characters
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default BooleanSearchInput;
