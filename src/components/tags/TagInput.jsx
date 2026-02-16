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

const TagInput = ({
  selectedTags = [],
  onTagsChange,
  onChange,
  placeholder = UI_TEXT.focusAreas.searchPlaceholder,
  showPopularTags = true,
  maxSuggestions = 8,
  className = "",
}) => {
  const handleChange = onTagsChange ?? onChange;
  if (!handleChange) {
    console.warn("TagInput requires onTagsChange (or legacy onChange).");
  }

  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [relatedTags, setRelatedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tagMap, setTagMap] = useState(new Map());

  const updateTagMap = useCallback((tags) => {
    setTagMap((prev) => {
      const newMap = new Map(prev);
      tags.forEach((tag) => {
        newMap.set(tag.id, tag);
      });
      return newMap;
    });
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (showPopularTags) {
        const tags = await tagService.getPopularTags(5);
        setPopularTags(tags);
        updateTagMap(tags);
      }

      try {
        const allTags = await tagService.getStructuredTags();
        const flatTags = allTags.flatMap((category) => [
          category,
          ...(category.children || []),
        ]);
        updateTagMap(flatTags);
      } catch (error) {
        console.error("Error fetching structured tags:", error);
      }
    };

    fetchInitialData();
  }, [showPopularTags, updateTagMap]);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await tagService.searchTags(query);
        const filteredResults = results.filter(
          (tag) => !selectedTags.includes(tag.id),
        );
        setSuggestions(filteredResults.slice(0, maxSuggestions));
        updateTagMap(filteredResults);
      } catch (error) {
        console.error("Error searching tags:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [selectedTags, maxSuggestions, updateTagMap],
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel?.();
    };
  }, [debouncedSearch]);

  const fetchRelatedTags = useCallback(
    async (tagId) => {
      try {
        const { tags } = await tagService.getRelatedTags(
          tagId,
          5,
          selectedTags,
        );
        setRelatedTags(tags);
        updateTagMap(tags);
      } catch (error) {
        console.error("Error fetching related tags:", error);
      }
    },
    [selectedTags, updateTagMap],
  );

  const handleInputChange = (value) => {
    const next = value ?? "";
    setInputValue(next);

    if (next.length >= 2) {
      setShowSuggestions(true);
      debouncedSearch(next);
    } else {
      setSuggestions([]);
      if (next.length === 0) {
        setShowSuggestions(true);
      }
    }
  };

  const handleSelectTag = (tag) => {
    if (tag && !selectedTags.includes(tag.id)) {
      const newTags = [...selectedTags, tag.id];
      handleChange?.(newTags);
      updateTagMap([tag]);
      fetchRelatedTags(tag.id);
    }

    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagId) => {
    const newTags = selectedTags.filter((id) => id !== tagId);
    handleChange?.(newTags);

    if (newTags.length === 0) {
      setRelatedTags([]);
    }
  };

  // Determine which tags to show - MUST be before useCombobox
  const getCurrentSuggestions = () => {
    if (inputValue.length >= 2 && suggestions.length > 0) {
      return { type: "search", tags: suggestions, icon: TagIcon };
    }
    if (inputValue.length === 0 && relatedTags.length > 0) {
      return { type: "related", tags: relatedTags, icon: Sparkles };
    }
    if (inputValue.length === 0 && popularTags.length > 0) {
      return { type: "popular", tags: popularTags, icon: TrendingUp };
    }
    return { type: "none", tags: [], icon: TagIcon };
  };

  const currentSuggestionsForCombobox = getCurrentSuggestions();

  const {
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    closeMenu,
  } = useCombobox({
    items: currentSuggestionsForCombobox.tags,
    inputValue,
    onInputValueChange: ({ inputValue }) => {
      handleInputChange(inputValue ?? "");
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) handleSelectTag(selectedItem);
    },
    itemToString: (item) => (item ? item.name : ""),
    onIsOpenChange: ({ isOpen }) => {
      if (!isOpen) setShowSuggestions(false);
    },
  });

  const currentSuggestions = getCurrentSuggestions();
  const shouldShowDropdown =
    showSuggestions && currentSuggestions.tags.length > 0;

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

  // --- Portal positioning (Option B) ---
  const inputRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  const updateMenuPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: r.bottom + 8,
      left: r.left,
      width: r.width,
      zIndex: 3000,
    });
  }, []);

  useLayoutEffect(() => {
    if (!shouldShowDropdown) return;
    updateMenuPosition();
  }, [shouldShowDropdown, updateMenuPosition]);

  useEffect(() => {
    if (!shouldShowDropdown) {
      setMenuStyle(null);
      return;
    }

    const handle = () => updateMenuPosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [shouldShowDropdown, updateMenuPosition]);

  const inputProps = getInputProps({
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
      if (
        inputValue.length >= 2 ||
        popularTags.length > 0 ||
        relatedTags.length > 0
      ) {
        setShowSuggestions(true);
      }
    },
    onBlur: () => {
      setTimeout(() => setShowSuggestions(false), 200);
    },
  });

  return (
    <div className={`relative ${className}`}>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-base-100 rounded-lg">
          {selectedTags.map((tagId) => {
            const tag = tagMap.get(tagId);
            return (
              <span key={tagId} className="badge badge-primary badge-lg gap-2">
                <TagIcon size={14} />
                {tag ? tag.name : `Focus Area ${tagId}`}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tagId)}
                  className="hover:text-error transition-colors"
                  aria-label={`Remove ${tag ? tag.name : "focus area"}`}
                >
                  <X size={14} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <input
          {...inputProps}
          ref={(node) => {
            inputRef.current = node;

            // keep Downshift’s internal ref working
            const dsRef = inputProps.ref;
            if (typeof dsRef === "function") dsRef(node);
            else if (dsRef && typeof dsRef === "object") dsRef.current = node;
          }}
          type="text"
          placeholder={placeholder}
          className="input input-bordered w-full pr-10 focus:input-primary"
        />
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <ul
            {...getMenuProps()}
            style={
              menuStyle ?? {
                position: "fixed",
                top: 0,
                left: 0,
                width: 0,
                zIndex: 3000,
              }
            }
            className={`menu bg-base-100 border border-base-300 rounded-box p-2 shadow-xl max-h-64 overflow-y-auto ${
              shouldShowDropdown ? "" : "hidden"
            }`}
          >
            {shouldShowDropdown && (
              <>
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
                </li>

                {currentSuggestions.tags.map((tag, index) => (
                  <li key={tag.id} {...getItemProps({ item: tag, index })}>
                    <button
                      type="button"
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
                        {tag.usage_count !== undefined &&
                          tag.usage_count > 0 && (
                            <span className="badge badge-sm badge-primary">
                              {tag.usage_count}
                            </span>
                          )}
                      </div>
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
};

export default TagInput;
