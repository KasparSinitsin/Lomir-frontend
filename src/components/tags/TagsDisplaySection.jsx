import React, { useState, useEffect } from "react";
import { Tag } from "lucide-react";
import Button from "../common/Button";
import TagInputV2 from "./TagInputV2";

/**
 * Unified TagsDisplaySection Component
 *
 * Used for displaying tags/skills in both User and Team modals
 * Ensures consistent styling across the application
 *
 * @param {string} title - Section title (e.g., "Skills & Interests", "Team Focus Areas")
 * @param {string|Array} tags - Tags data: comma-separated string, array of objects, or array of IDs
 * @param {Array} allTags - Optional: structured tags for ID lookup (required if tags are IDs)
 * @param {boolean} canEdit - Whether to show edit button
 * @param {Function} onSave - Optional: callback when tags are saved (required if canEdit is true)
 * @param {string} emptyMessage - Message to show when no tags
 * @param {string} placeholder - Placeholder for edit input
 * @param {string} className - Additional CSS classes
 */
const TagsDisplaySection = ({
  title = "Tags",
  tags = [],
  allTags = [],
  canEdit = false,
  onSave,
  emptyMessage = "No tags yet",
  placeholder = "Add tags...",
  className = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localSelectedTags, setLocalSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Normalize tags to a consistent format for editing (array of IDs)
  useEffect(() => {
    if (Array.isArray(tags)) {
      // Array of objects with id/tag_id or array of IDs
      const ids = tags
        .map((tag) => {
          if (typeof tag === "object") {
            return Number(tag.id ?? tag.tag_id ?? tag.tagId);
          }
          return Number(tag);
        })
        .filter((id) => !Number.isNaN(id));
      setLocalSelectedTags(ids);
    } else {
      // String format doesn't support editing with IDs
      setLocalSelectedTags([]);
    }
  }, [tags]);

  // Helper to find tag name from allTags structure
  const getTagNameById = (tagId) => {
    const numericId = Number(tagId);
    const tag = (allTags || [])
      .flatMap((supercat) => supercat.categories || [])
      .flatMap((cat) => cat.tags || [])
      .find((t) => {
        const tId = Number(t.id ?? t.tag_id ?? t.tagId);
        return !Number.isNaN(tId) && tId === numericId;
      });
    return tag?.name || null;
  };

  // Parse tags into displayable format
  const getDisplayTags = () => {
    if (!tags) return [];

    // Case 1: Comma-separated string (from UserSkillsSection)
    if (typeof tags === "string") {
      if (!tags.trim()) return [];
      return tags.split(",").map((tag, index) => ({
        key: index,
        name: tag.trim(),
      }));
    }

    // Case 2: Array of objects with name property
    if (Array.isArray(tags) && tags.length > 0) {
      if (typeof tags[0] === "object" && tags[0].name) {
        return tags.map((tag) => ({
          key: tag.id || tag.tag_id || tag.tagId,
          name: tag.name,
        }));
      }

      // Case 3: Array of IDs - need to look up names from allTags
      return tags
        .map((tagId) => {
          const id =
            typeof tagId === "object"
              ? tagId.id ?? tagId.tag_id ?? tagId.tagId
              : tagId;
          const name = getTagNameById(id);
          return name ? { key: id, name } : null;
        })
        .filter(Boolean);
    }

    return [];
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await onSave(localSelectedTags);

      setSuccess("Updated successfully!");
      setIsEditing(false);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving tags:", err);
      setError(err.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original
    if (Array.isArray(tags)) {
      const ids = tags
        .map((tag) => {
          if (typeof tag === "object") {
            return Number(tag.id ?? tag.tag_id ?? tag.tagId);
          }
          return Number(tag);
        })
        .filter((id) => !Number.isNaN(id));
      setLocalSelectedTags(ids);
    }
    setIsEditing(false);
    setError(null);
  };

  const displayTags = getDisplayTags();

  // EDIT MODE
  if (isEditing) {
    return (
      <div className={className}>
        {/* Title row with Cancel/Save buttons */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Tag size={18} className="mr-2 text-primary flex-shrink-0" />
            <h3 className="font-medium">{title}</h3>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-4">
            <span>{success}</span>
          </div>
        )}

        {/* Tag Input */}
        <TagInputV2
          selectedTags={localSelectedTags}
          onTagsChange={(newTags) => setLocalSelectedTags(newTags)}
          placeholder={placeholder}
          showPopularTags={true}
          maxSuggestions={10}
        />
      </div>
    );
  }

  // DISPLAY MODE
  return (
    <div className={className}>
      {/* Title row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Tag size={18} className="mr-2 text-primary flex-shrink-0" />
          <h3 className="font-medium">{title}</h3>
        </div>
        {canEdit && onSave && (
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-violet-200 hover:text-violet-700"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Success Message (after save) */}
      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}

      {/* Tags display */}
      <div className="flex flex-wrap gap-2">
        {displayTags.length > 0 ? (
          displayTags.map((tag) => (
            <span
              key={tag.key}
              className="badge badge-primary badge-outline p-3"
            >
              {tag.name}
            </span>
          ))
        ) : (
          <span className="badge badge-warning">{emptyMessage}</span>
        )}
      </div>
    </div>
  );
};

export default TagsDisplaySection;
