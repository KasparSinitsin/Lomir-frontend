import React from "react";
import { Tag } from "lucide-react";

/**
 * UserSkillsSection Component
 * Displays user's skills and interests as tags/badges
 * Handles both string (comma-separated) and array formats
 * 
 * Extracted from UserDetailsModal to improve code organization
 */
const UserSkillsSection = ({ 
  user,
  className = "" 
}) => {
  if (!user) {
    return null;
  }

  const tags = user?.tags;

  return (
    <div className={className}>
      <div className="flex items-center mb-2">
        <Tag size={18} className="mr-2 text-primary flex-shrink-0" />
        <h3 className="font-medium">Skills & Interests</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags && tags.trim() ? (
          typeof tags === "string" ? (
            // Handle tags as a string (comma-separated list)
            tags.split(",").map((tag, index) => (
              <span
                key={index}
                className="badge badge-primary badge-outline p-3"
              >
                {tag.trim()}
              </span>
            ))
          ) : (
            // Handle tags as an array of objects (fallback)
            tags.map((tag) => (
              <span
                key={typeof tag === "object" ? tag.id : tag}
                className="badge badge-primary badge-outline p-3"
              >
                {typeof tag === "object" ? tag.name : tag}
              </span>
            ))
          )
        ) : (
          <span className="badge badge-warning">No tags yet</span>
        )}
      </div>
    </div>
  );
};

export default UserSkillsSection;