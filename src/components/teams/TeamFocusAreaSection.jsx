import React from "react";
import { Tag } from "lucide-react";
import TagDisplay from "../common/TagDisplay";

/**
 * TeamFocusAreaSection Component
 * 
 * @param {Object} props
 * @param {Object} props.team - Team object containing tags
 * @param {boolean} props.isEditing - Whether the team is in edit mode
 * @param {boolean} props.isOwner - Whether the current user is the team owner
 * @param {string} props.className - Additional CSS classes
 */
const TeamFocusAreaSection = ({
  team,
  isEditing = false,
  isOwner = false,
  className = "",
}) => {
  // Don't render anything if in editing mode
  if (isEditing) {
    return null;
  }

  return (
    <div className={`mb-6 ${className}`}>
      {/* Section Header */}
      <h3 className="font-semibold text-lg mb-3 flex items-center">
        <Tag size={18} className="mr-2 text-primary" />
        Team Focus Areas
      </h3>

      {/* Tags Display or Empty State */}
      {team?.tags?.length > 0 ? (
        <div className="space-y-3">
          {/* Group tags by category if available */}
          {(() => {
            const tagsByCategory = {};
            team.tags.forEach((tag) => {
              const category = tag.category || "Other";
              if (!tagsByCategory[category]) {
                tagsByCategory[category] = [];
              }
              tagsByCategory[category].push(tag);
            });

            return Object.entries(tagsByCategory).map(
              ([category, categoryTags]) => (
                <div
                  key={category}
                  className="bg-base-200/30 rounded-lg p-3"
                >
                  <h4 className="font-medium text-sm text-base-content/80 mb-2">
                    {category}
                  </h4>
                  <TagDisplay
                    tags={categoryTags}
                    size="md"
                    variant="primary"
                    showCategory={false}
                  />
                </div>
              )
            );
          })()}
        </div>
      ) : (
        <div className="bg-base-200/20 rounded-lg p-4 text-center">
          <Tag
            size={24}
            className="mx-auto mb-2 text-base-content/40"
          />
          <p className="text-sm text-base-content/60">
            No focus areas specified yet
          </p>
          {isOwner && !isEditing && (
            <p className="text-xs text-base-content/50 mt-1">
              Add tags to help others find your team
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamFocusAreaSection;