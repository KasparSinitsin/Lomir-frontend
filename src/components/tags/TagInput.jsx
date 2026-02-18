import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useCombobox } from "downshift";
import { X, Tag as TagIcon, TrendingUp, Sparkles } from "lucide-react";
import { tagService } from "../../services/tagService";
import { UI_TEXT } from "../../constants/uiText";
import { debounce } from "lodash";

const MIN_QUERY_LEN = 2;

const EDGE_MARGIN = 8; // keep within viewport edges
const GAP = 16;
const MIN_MENU_HEIGHT = 140;
const MAX_MENU_HEIGHT = 360;

const TagInput = ({
  selectedTags = [],
  onTagsChange,
  onChange,
  placeholder = UI_TEXT.focusAreas.searchPlaceholder,
  showPopularTags = true,
  maxSuggestions = 8,
  className = "",
  disabled = false,
}) => {
  const handleTags = onTagsChange ?? onChange;

  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [relatedTags, setRelatedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tagMap, setTagMap] = useState(new Map());

  // refs
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const selectedTagsRef = useRef(null);

  // style + placement info
  const [menuStyle, setMenuStyle] = useState({
    position: "fixed",
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
    zIndex: 10000,
  });
  const [menuPlacement, setMenuPlacement] = useState("bottom"); // "top" | "bottom"

  const getTagId = (t) => {
    if (t == null) return null;
    if (typeof t === "number") return Number.isFinite(t) ? t : null;
    if (typeof t === "string") {
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof t === "object") {
      const n = Number(t.id ?? t.tag_id ?? t.tagId ?? t.value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const selectedTagIds = React.useMemo(() => {
    const ids = (selectedTags ?? [])
      .map(getTagId)
      .filter((x) => Number.isFinite(x));
    return Array.from(new Set(ids));
  }, [selectedTags]);

  const selectedTagIdSet = React.useMemo(
    () => new Set(selectedTagIds),
    [selectedTagIds],
  );

  const updateTagMap = useCallback((tags) => {
    setTagMap((prev) => {
      const next = new Map(prev);
      (tags || []).forEach((t) => {
        const id = getTagId(t);
        if (id != null) {
          // store with normalized id, but keep original object + ensure `name` exists
          next.set(id, {
            ...t,
            id,
            name: t?.name ?? t?.label ?? t?.value ?? `Focus Area ${id}`,
          });
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;

    const fetchInitial = async () => {
      try {
        if (showPopularTags) {
          const tags = await tagService.getPopularTags(5);
          if (!alive) return;
          setPopularTags(tags || []);
          updateTagMap(tags || []);
        }

        const allTags = await tagService.getStructuredTags();
        if (!alive) return;

        const flat = (allTags || [])
          .flatMap((supercat) => supercat.categories || [])
          .flatMap((cat) => cat.tags || []);
        updateTagMap(flat);
      } catch (err) {
        console.error("Error fetching tags:", err);
      }
    };

    fetchInitial();
    return () => {
      alive = false;
    };
  }, [showPopularTags, updateTagMap]);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      const q = (query || "").trim();
      if (q.length < MIN_QUERY_LEN) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await tagService.searchTags(q);
        const filtered = (results || []).filter((t) => {
          const id = getTagId(t);
          return id != null && !selectedTagIdSet.has(id);
        });

        setSuggestions(filtered.slice(0, maxSuggestions));
        updateTagMap(filtered);
      } catch (err) {
        console.error("Error searching tags:", err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250),
    [selectedTagIdSet, maxSuggestions, updateTagMap],
  );

  useEffect(() => () => debouncedSearch.cancel?.(), [debouncedSearch]);

  const fetchRelatedTags = useCallback(
    async (tagId) => {
      try {
        const res = await tagService.getRelatedTags(tagId, 5, selectedTags);
        const tags = res?.tags || [];
        setRelatedTags(tags);
        updateTagMap(tags);
      } catch (err) {
        console.error("Error fetching related tags:", err);
      }
    },
    [selectedTags, updateTagMap],
  );

  const getCurrentSuggestions = useCallback(() => {
    if (inputValue.trim().length >= MIN_QUERY_LEN && suggestions.length > 0) {
      return { type: "search", tags: suggestions, icon: TagIcon };
    }
    if (inputValue.trim().length === 0 && relatedTags.length > 0) {
      return { type: "related", tags: relatedTags, icon: Sparkles };
    }
    if (inputValue.trim().length === 0 && popularTags.length > 0) {
      return { type: "popular", tags: popularTags, icon: TrendingUp };
    }
    return { type: "none", tags: [], icon: TagIcon };
  }, [inputValue, suggestions, relatedTags, popularTags]);

  const currentSuggestions = getCurrentSuggestions();
  const shouldShowDropdown =
    !disabled && showSuggestions && currentSuggestions.tags.length > 0;

  const getSuggestionTitle = () => {
    switch (currentSuggestions.type) {
      case "popular":
        return UI_TEXT.focusAreas.popularTitle;
      case "related":
        return UI_TEXT.focusAreas.relatedTitle;
      case "search":
        return UI_TEXT.focusAreas.searchResultsTitle;
      default:
        return "";
    }
  };

  const handleInputChange = useCallback(
    (value) => {
      const next = value ?? "";
      setInputValue(next);

      if (next.trim().length >= MIN_QUERY_LEN) {
        setShowSuggestions(true);
        debouncedSearch(next);
      } else {
        setSuggestions([]);
        // keep popular/related visible when empty
        setShowSuggestions(next.trim().length === 0);
      }
    },
    [debouncedSearch],
  );

  const handleSelectTag = useCallback(
    (tag) => {
      const id = getTagId(tag);
      if (id != null && !selectedTagIdSet.has(id)) {
        const next = [...selectedTagIds, id];
        handleTags?.(next);
        updateTagMap([tag]);
        fetchRelatedTags(id);
      }
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
    },
    [
      selectedTagIds,
      selectedTagIdSet,
      handleTags,
      updateTagMap,
      fetchRelatedTags,
    ],
  );

  const handleRemoveTag = useCallback(
    (tagId) => {
      const id = getTagId(tagId);
      if (id == null) return;

      const next = selectedTagIds.filter((x) => x !== id);
      handleTags?.(next);
      if (next.length === 0) setRelatedTags([]);
    },
    [selectedTagIds, handleTags],
  );

  // 1) initial positioning decision (top/bottom + maxHeight)
  const computeBasePosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const selectedTagsHeight =
      selectedTagsRef.current?.getBoundingClientRect?.().height ?? 0;

    // If we have selected tags rendered under the input, treat them as “reserved space”
    // so the dropdown doesn’t choose bottom placement and cover them.
    const reservedBelow =
      selectedTags.length > 0 ? selectedTagsHeight + GAP : 0;

    const spaceBelow =
      viewportH - (rect.bottom + GAP) - EDGE_MARGIN - reservedBelow;

    const spaceAbove = rect.top - GAP - EDGE_MARGIN;

    const canFitBelow = spaceBelow >= MIN_MENU_HEIGHT;
    const canFitAbove = spaceAbove >= MIN_MENU_HEIGHT;

    let placement = "bottom";
    if (canFitBelow && !canFitAbove) placement = "bottom";
    else if (!canFitBelow && canFitAbove) placement = "top";
    else placement = spaceBelow >= spaceAbove ? "bottom" : "top";

    const available = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(80, Math.min(available, MAX_MENU_HEIGHT));

    const width = rect.width;
    const left = Math.min(
      Math.max(EDGE_MARGIN, rect.left),
      Math.max(EDGE_MARGIN, viewportW - width - EDGE_MARGIN),
    );

    // For bottom: exact 1rem gap is easy.
    // For top: we will correct using ACTUAL menu height after render.
    const top =
      placement === "bottom" ? rect.bottom + GAP : rect.top - GAP - maxHeight;

    return { rect, placement, top, left, width, maxHeight, viewportH };
  }, []);

  const updateDropdownPosition = useCallback(() => {
    const base = computeBasePosition();
    if (!base) return;

    setMenuPlacement(base.placement);
    setMenuStyle({
      position: "fixed",
      top: base.top,
      left: base.left,
      width: base.width,
      maxHeight: base.maxHeight,
      zIndex: 10000,
    });
  }, [computeBasePosition]);

  // 2) correction step: if placement is "top", use ACTUAL rendered height for exact 1rem gap
  const refineTopWithActualHeight = useCallback(() => {
    if (!shouldShowDropdown) return;
    if (menuPlacement !== "top") return;

    const inputEl = inputRef.current;
    const menuEl = dropdownRef.current;
    if (!inputEl || !menuEl) return;

    const rect = inputEl.getBoundingClientRect();

    // actual height of menu content (clamped by maxHeight)
    const actualHeight = Math.min(menuEl.scrollHeight, menuStyle.maxHeight);

    const desiredTop = rect.top - GAP - actualHeight;

    setMenuStyle((prev) => ({
      ...prev,
      top: Math.max(EDGE_MARGIN, desiredTop),
    }));
  }, [shouldShowDropdown, menuPlacement, menuStyle.maxHeight]);

  // When dropdown opens or suggestions change: position + then refine
  useLayoutEffect(() => {
    if (!shouldShowDropdown) return;
    updateDropdownPosition();

    // refine after portal content has a measurable height
    const id = requestAnimationFrame(() => {
      refineTopWithActualHeight();
    });
    return () => cancelAnimationFrame(id);
  }, [
    shouldShowDropdown,
    updateDropdownPosition,
    refineTopWithActualHeight,
    currentSuggestions.type,
    currentSuggestions.tags.length,
    loading,
  ]);

  // 3) auto-update loop while open (handles modal scrolling/layout shifts reliably)
  useEffect(() => {
    if (!shouldShowDropdown) return;

    let raf = 0;
    const tick = () => {
      updateDropdownPosition();
      // refine on top placement (cheap, just reads scrollHeight)
      refineTopWithActualHeight();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shouldShowDropdown, updateDropdownPosition, refineTopWithActualHeight]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!shouldShowDropdown) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowSuggestions(false);
    };

    const onMouseDown = (e) => {
      const inputEl = inputRef.current;
      const menuEl = dropdownRef.current;
      if (!inputEl || !menuEl) return;

      if (!inputEl.contains(e.target) && !menuEl.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [shouldShowDropdown]);

  const {
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    closeMenu,
  } = useCombobox({
    items: currentSuggestions.tags,
    inputValue,
    onInputValueChange: ({ inputValue }) => handleInputChange(inputValue ?? ""),
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) handleSelectTag(selectedItem);
    },
    itemToString: (item) => (item ? item.name : ""),
    onIsOpenChange: ({ isOpen }) => {
      if (!isOpen) setShowSuggestions(false);
    },
  });

  // compose refs: keep Downshift + our ref stable
  const downshiftInputProps = getInputProps({
    disabled,
    onKeyDown: (event) => {
      if (event.key === "Enter" && highlightedIndex === -1) {
        event.preventDefault();
        setShowSuggestions(false);
        closeMenu();
      }
      if (event.key === "Escape") {
        setShowSuggestions(false);
        closeMenu();
      }
    },
    onFocus: () => {
      if (disabled) return;
      const hasAny =
        inputValue.trim().length >= MIN_QUERY_LEN ||
        (inputValue.trim().length === 0 &&
          (popularTags.length > 0 || relatedTags.length > 0));
      if (hasAny) setShowSuggestions(true);
    },
  });

  return (
    <div className={`relative ${className}`}>
      <input
        {...downshiftInputProps}
        ref={(node) => {
          inputRef.current = node;

          const dsRef = downshiftInputProps.ref;
          if (typeof dsRef === "function") dsRef(node);
          else if (dsRef && typeof dsRef === "object") dsRef.current = node;
        }}
        type="text"
        placeholder={placeholder}
        className="input input-bordered w-full pr-10 focus:input-primary"
      />

      {selectedTags.length > 0 && (
        <div ref={selectedTagsRef} className="mt-2 p-3 bg-base-100 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {selectedTagIds.map((tagId) => {
              const tag = tagMap.get(tagId);
              return (
                <span
                  key={tagId}
                  className="badge badge-primary badge-lg gap-2"
                >
                  <TagIcon size={14} />
                  {tag?.name ?? `Focus Area ${tagId}`}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tagId)}
                    className="hover:text-error transition-colors"
                    aria-label={`Remove ${tag?.name ?? "focus area"}`}
                    disabled={disabled}
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {typeof document !== "undefined" &&
        shouldShowDropdown &&
        createPortal(
          <ul
            {...getMenuProps({
              ref: dropdownRef,
            })}
            style={menuStyle}
            className="menu bg-base-100 border border-base-300 rounded-box p-2 shadow-xl overflow-y-auto"
          >
            <li className="menu-title flex items-center gap-2 px-3 py-2">
              {React.createElement(currentSuggestions.icon, {
                size: 16,
                className:
                  currentSuggestions.type === "popular"
                    ? "text-warning"
                    : currentSuggestions.type === "related"
                      ? "text-secondary"
                      : "text-primary",
              })}
              <span className="font-semibold">{getSuggestionTitle()}</span>

              {loading && (
                <span className="ml-auto text-xs opacity-70 flex items-center gap-2">
                  <span className="loading loading-spinner loading-xs"></span>
                  Loading…
                </span>
              )}
            </li>

            {currentSuggestions.tags.map((tag, index) => (
              <li key={tag.id} {...getItemProps({ item: tag, index })}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur race
                  className={`flex items-center justify-between w-full ${
                    highlightedIndex === index ? "active" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TagIcon size={14} />
                    <span className="font-medium">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="badge badge-sm badge-ghost">
                      {tag.category}
                    </span>
                    {tag.usage_count !== undefined && tag.usage_count > 0 && (
                      <span className="badge badge-sm badge-primary">
                        {tag.usage_count}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
};

export default TagInput;
