import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useCombobox } from "downshift";
import { X, Tag as TagIcon, TrendingUp, Sparkles, Layers, Check } from "lucide-react";
import { tagService } from "../../services/tagService";
import { SUPERCATEGORY_ICONS } from "../../utils/badgeIconUtils";
import {
  flattenStructuredTags,
  usePopularTags,
  useStructuredTags,
} from "../../hooks/useTagQueries";
import { UI_TEXT } from "../../constants/uiText";
import { debounce } from "lodash";

const MIN_QUERY_LEN = 2;

const EDGE_MARGIN = 8; // keep within viewport edges
const GAP = 16;
const MIN_MENU_HEIGHT = 140;
const MAX_MENU_HEIGHT = 360;
const EMPTY_QUERY_ARRAY = [];

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
  const {
    data: structuredTags = EMPTY_QUERY_ARRAY,
    error: structuredTagsError,
  } = useStructuredTags();
  const {
    data: fetchedPopularTags = EMPTY_QUERY_ARRAY,
    error: popularTagsError,
  } = usePopularTags(5, null, {
    enabled: showPopularTags,
  });

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
    if (!tags?.length) return;

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
    const flat = flattenStructuredTags(structuredTags);
    updateTagMap(flat);
  }, [structuredTags, updateTagMap]);

  useEffect(() => {
    const tags = showPopularTags ? fetchedPopularTags || [] : [];
    setPopularTags(tags);
    updateTagMap(tags);
  }, [fetchedPopularTags, showPopularTags, updateTagMap]);

  useEffect(() => {
    if (structuredTagsError) {
      console.error("Error fetching tags:", structuredTagsError);
    }
  }, [structuredTagsError]);

  useEffect(() => {
    if (popularTagsError) {
      console.error("Error fetching popular tags:", popularTagsError);
    }
  }, [popularTagsError]);

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
    const maxHeight = Math.max(80, available);

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
    itemToString: () => "",
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
                  className="badge badge-primary badge-lg gap-2 leading-none items-start h-auto py-1.5"
                >
                  <TagIcon size={14} className="shrink-0 mt-px" />
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
        createPortal(
          <ul
            {...getMenuProps({
              ref: dropdownRef,
            })}
            style={shouldShowDropdown ? menuStyle : { display: "none" }}
            className={
              shouldShowDropdown
                ? "menu flex-nowrap bg-base-100 border border-base-300 rounded-box p-2 shadow-xl overflow-y-auto"
                : ""
            }
          >
            {shouldShowDropdown && (
              <>
                <li className="menu-title flex items-center gap-0.5 px-3 pt-1 pb-3">
                  {React.createElement(currentSuggestions.icon, {
                    size: 16,
                    strokeWidth: 2.5,
                    className:
                      currentSuggestions.type === "popular"
                        ? "text-warning"
                        : currentSuggestions.type === "related"
                          ? "text-secondary"
                          : "text-primary",
                  })}
                  <span className="font-semibold text-primary-focus">{getSuggestionTitle()}</span>

                  {loading && (
                    <span className="ml-auto text-xs opacity-70 flex items-center gap-2">
                      <span className="loading loading-spinner loading-xs"></span>
                      Loading…
                    </span>
                  )}
                </li>

                {(() => {
                  const superGroups = new Map();
                  currentSuggestions.tags.forEach((tag) => {
                    const superKey = tag.supercategory || "Other";
                    const catKey = tag.category || "Other";
                    if (!superGroups.has(superKey)) superGroups.set(superKey, new Map());
                    const catMap = superGroups.get(superKey);
                    if (!catMap.has(catKey)) catMap.set(catKey, []);
                    catMap.get(catKey).push(tag);
                  });

                  let globalIndex = 0;
                  return Array.from(superGroups.entries()).flatMap(([supercategory, catMap], superIdx) => {
                    const CategoryIcon = SUPERCATEGORY_ICONS[supercategory] || Layers;
                    return Array.from(catMap.entries()).flatMap(([category, tags], catIdx) =>
                      tags.map((tag, tagIdx) => {
                        const index = globalIndex++;
                        const alreadyAdded = selectedTagIdSet.has(getTagId(tag));
                        const isFirstInCategory = tagIdx === 0;
                        const isLastInCategory = tagIdx === tags.length - 1;
                        const isNewSupercategory = superIdx > 0 && catIdx === 0 && tagIdx === 0;
                        const paddingClass = isNewSupercategory ? "pt-2 pb-1.5" : "py-1.5";
                        const groupClass = [
                          "bg-[rgba(0,146,19,0.05)]",
                          isFirstInCategory && isLastInCategory ? "rounded-lg" :
                            isFirstInCategory ? "rounded-t-lg" :
                            isLastInCategory ? "rounded-b-lg" : "",
                          isLastInCategory ? "mb-1.5" : "",
                        ].join(" ");
                        return (
                          <li key={tag.id} {...getItemProps({ item: tag, index })} className={groupClass}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              disabled={alreadyAdded}
                              title={alreadyAdded ? UI_TEXT.focusAreas.alreadyAdded : undefined}
                              className={`flex flex-row-reverse flex-wrap items-start w-full leading-none gap-x-2 gap-y-2 ${paddingClass} ${
                                alreadyAdded
                                  ? "opacity-40 cursor-not-allowed"
                                  : highlightedIndex === index
                                    ? "active"
                                    : ""
                              }`}
                            >
                              <div className="flex-none flex items-center gap-0.5">
                                {!alreadyAdded && tag.usage_count !== undefined && tag.usage_count > 0 && (
                                  <span className="badge badge-sm badge-primary shrink-0">
                                    {tag.usage_count}
                                  </span>
                                )}
                                {isFirstInCategory && (
                                  <span className="flex items-center gap-1 text-xs leading-none text-primary-focus whitespace-nowrap">
                                    <CategoryIcon size={10} className="shrink-0" />
                                    <span>{category}</span>
                                  </span>
                                )}
                              </div>
                              <div className="[flex:1_0_auto] max-w-full flex items-start gap-2 min-w-0">
                                <span className="font-medium">{tag.name}</span>
                                {alreadyAdded && <Check size={12} className="opacity-60 shrink-0 mt-px" />}
                              </div>
                            </button>
                          </li>
                        );
                      })
                    );
                  });
                })()}
              </>
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
};

export default TagInput;
