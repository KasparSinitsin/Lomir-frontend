import React from "react";

/**
 * UserBioSection Component
 * Displays user biography/bio text
 * 
 * Extracted from UserDetailsModal to improve code organization
 */
const UserBioSection = ({ 
  bio,
  className = "" 
}) => {
  // Only render if bio exists
  if (!bio || !bio.trim()) {
    return null;
  }

  return (
    <div className={className}>
      <p className="text-base-content/90">{bio}</p>
    </div>
  );
};

export default UserBioSection;