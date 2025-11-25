import React, { useState } from 'react';
import Section from '../layout/Section';
import Button from '../common/Button';
import TagInputV2 from './TagInputV2';

/**
 * Reusable Focus Areas Section
 * Can be used for user profiles, team profiles, etc.
 * 
 * @param {string} title - Section title (e.g., "Focus Areas", "Team Focus Areas")
 * @param {Array} selectedTags - Array of selected tag IDs
 * @param {Array} allTags - All available tags (structured format)
 * @param {Function} onSave - Callback when tags are saved: (tagIds) => Promise
 * @param {boolean} canEdit - Whether the current user can edit
 * @param {string} emptyMessage - Message to show when no tags are selected
 * @param {string} placeholder - Placeholder for the input field
 * @param {string} className - Additional CSS classes
 */
const FocusAreasSection = ({
  title = "Focus Areas",
  selectedTags = [],
  allTags = [],
  onSave,
  canEdit = true,
  emptyMessage = "No focus areas added yet.",
  placeholder = "Add focus areas...",
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localSelectedTags, setLocalSelectedTags] = useState(selectedTags);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Update local tags when prop changes
  React.useEffect(() => {
    setLocalSelectedTags(selectedTags);
  }, [selectedTags]);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await onSave(localSelectedTags);

      setSuccess('Focus areas updated successfully!');
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving focus areas:', err);
      setError(err.message || 'Failed to update focus areas');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setLocalSelectedTags(selectedTags); // Reset to original
    setIsEditing(false);
    setError(null);
  };

  return (
    <Section
      title={title}
      className={className}
      action={
        canEdit && !isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-violet-200 hover:text-violet-700"
            onClick={() => setIsEditing(true)}
          >
            Edit {title}
          </Button>
        ) : null
      }
    >
      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Display or Edit Mode */}
      {!isEditing ? (
        // DISPLAY MODE
        <div className="flex flex-wrap gap-2">
          {localSelectedTags.length > 0 ? (
            localSelectedTags.map((tagId) => {
              const tag = allTags
                .flatMap((supercat) => supercat.categories)
                .flatMap((cat) => cat.tags)
                .find((t) => t.id === tagId);
              return tag ? (
                <span
                  key={tagId}
                  className="badge badge-primary badge-outline p-3"
                >
                  {tag.name}
                </span>
              ) : null;
            })
          ) : (
            <p className="text-base-content/70">{emptyMessage}</p>
          )}
        </div>
      ) : (
        // EDIT MODE
        <div className="space-y-4">
          <TagInputV2
            selectedTags={localSelectedTags}
            onTagsChange={(tags) => setLocalSelectedTags(tags)}
            placeholder={placeholder}
            showPopularTags={true}
            maxSuggestions={10}
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="ghost" 
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
};

export default FocusAreasSection;