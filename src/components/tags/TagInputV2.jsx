import React, { useState, useEffect, useCallback } from "react";
import { useCombobox } from "downshift";
import { X, Tag as TagIcon, TrendingUp, Sparkles } from "lucide-react";
import { tagService } from "../../services/tagService";
import { debounce } from "lodash";

const TagInputV2 = ({
  selectedTags = [],
  onTagsChange,
  placeholder = "Type to search tags...",
  showPopularTags = true,
  maxSuggestions = 8,
  className = "",
}) => {
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
      // Fetch popular tags
      if (showPopularTags) {
        const tags = await tagService.getPopularTags(5);
        setPopularTags(tags);
        updateTagMap(tags);
      }

      // Fetch all structured tags to populate tagMap
      try {
        const allTags = await tagService.getStructuredTags();
        // Flatten the structure to get all tags
        const flatTags = allTags
          .flatMap((supercat) => supercat.categories)
          .flatMap((cat) => cat.tags);
        updateTagMap(flatTags);
      } catch (error) {
        console.error("Error fetching structured tags:", error);
      }
    };

    fetchInitialData();
  }, [showPopularTags, updateTagMap]);

  const fetchRelatedTags = useCallback(
    async (tagId) => {
      const excludeIds = selectedTags;
      const { tags } = await tagService.getRelatedTags(tagId, 5, excludeIds);
      setRelatedTags(tags);
      updateTagMap(tags);
    },
    [selectedTags, updateTagMap]
  );

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      const results = await tagService.getSuggestions(
        query,
        maxSuggestions,
        selectedTags
      );
      setSuggestions(results);
      updateTagMap(results);
      setLoading(false);
    }, 300),
    [selectedTags, maxSuggestions, updateTagMap]
  );

  const handleInputChange = (value) => {
    setInputValue(value);
    if (value.length >= 2) {
      setShowSuggestions(true);
      debouncedSearch(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectTag = (tag) => {
    if (!tag) return;

    const isAlreadySelected = selectedTags.includes(tag.id);

    if (!isAlreadySelected) {
      const newTags = [...selectedTags, tag.id];
      onTagsChange(newTags);
      updateTagMap([tag]);
      fetchRelatedTags(tag.id);
    }

    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagId) => {
    const newTags = selectedTags.filter((id) => id !== tagId);
    onTagsChange(newTags);

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

  // Get current suggestions to pass to Downshift
  const currentSuggestionsForCombobox = getCurrentSuggestions();

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    closeMenu,
  } = useCombobox({
    items: currentSuggestionsForCombobox.tags,  
    inputValue,
    onInputValueChange: ({ inputValue }) => {
      handleInputChange(inputValue);
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        handleSelectTag(selectedItem);
      }
    },
    itemToString: (item) => (item ? item.name : ""),
    onIsOpenChange: ({ isOpen }) => {
      // Sync Downshift's isOpen with showSuggestions state
      if (!isOpen) {
        setShowSuggestions(false);
      }
    },
  });

  const currentSuggestions = getCurrentSuggestions();
  const shouldShowDropdown =
    showSuggestions && currentSuggestions.tags.length > 0;

  const getSuggestionTitle = () => {
    switch (currentSuggestions.type) {
      case "popular":
        return "Popular Tags";
      case "related":
        return "Related Tags";
      case "search":
        return "Search Results";
      default:
        return "";
    }
  };

  return (
    <div className={`relative ${className}`}>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-base-200 rounded-lg">
          {selectedTags.map((tagId) => {
            const tag = tagMap.get(tagId);
            return (
              <span key={tagId} className="badge badge-primary badge-lg gap-2">
                <TagIcon size={14} />
                {tag ? tag.name : `Tag ${tagId}`}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tagId)}
                  className="hover:text-error transition-colors"
                  aria-label={`Remove ${tag ? tag.name : "tag"}`}
                >
                  <X size={14} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <div className="relative">
          <input
            {...getInputProps({
              onKeyDown: (event) => {
                // Close dropdown on Enter when nothing is highlighted
                if (event.key === "Enter" && highlightedIndex === -1) {
                  event.preventDefault();
                  setShowSuggestions(false);
                  closeMenu();
                }
                // Close dropdown on Escape
                if (event.key === "Escape") {
                  setShowSuggestions(false);
                  closeMenu();
                }
              },
              onFocus: () => {
                // Only show suggestions if there's something to show
                if (
                  inputValue.length >= 2 ||
                  popularTags.length > 0 ||
                  relatedTags.length > 0
                ) {
                  setShowSuggestions(true);
                }
              },
              onBlur: () => {
                // Close dropdown when clicking outside
                setTimeout(() => {
                  setShowSuggestions(false);
                }, 200); // Small delay to allow click events to register
              },
            })}
            type="text"
            placeholder={placeholder}
            className="input input-bordered w-full pr-10 focus:input-primary"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="loading loading-spinner loading-sm text-primary"></span>
            </div>
          )}
        </div>
      </div>

      {shouldShowDropdown && (
        <ul
          {...getMenuProps()}
          className="menu bg-base-100 border border-base-300 rounded-box mt-2 p-2 shadow-xl max-h-64 overflow-y-auto absolute z-50 w-full"
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
                  {tag.usage_count !== undefined && tag.usage_count > 0 && (
                    <span className="badge badge-sm badge-primary">
                      {tag.usage_count}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="label">
        <span className="label-text-alt text-base-content/60">
          {inputValue.length < 2 && currentSuggestions.type === "none"
            ? "Type at least 2 characters to search"
            : inputValue.length >= 2 && suggestions.length === 0 && !loading
            ? "No tags found"
            : currentSuggestions.type === "popular"
            ? "Click a popular tag or start typing to search"
            : currentSuggestions.type === "related"
            ? "Suggested tags based on your selection"
            : "Press Enter or click to select"}
        </span>
      </div>
    </div>
  );
};

export default TagInputV2;
