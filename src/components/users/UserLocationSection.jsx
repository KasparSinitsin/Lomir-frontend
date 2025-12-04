import React from "react";
import { MapPin } from "lucide-react";
import LocationDisplay from "../common/LocationDisplay";

/**
 * UserLocationSection Component
 * Displays user's location based on postal code
 * 
 * Extracted from UserDetailsModal to improve code organization
 */
const UserLocationSection = ({ 
  user,
  className = "" 
}) => {
  if (!user) {
    return null;
  }

  const postalCode = user?.postal_code || user?.postalCode;

return (
    <div className={className}>
      {/* Title row - icon and title together */}
      <div className="flex items-center mb-2">
        <MapPin size={18} className="mr-2 text-primary flex-shrink-0" />
        <h3 className="font-medium">Location</h3>
      </div>
      
      {/* Content below - aligns with icon */}
      <div>
        {postalCode ? (
          <LocationDisplay
            postalCode={postalCode}
            className="bg-base-200/50 py-1"
            showIcon={false}
            showPostalCode={true}
            displayType="detailed"
          />
        ) : (
          <p>Not specified</p>
        )}
      </div>
    </div>
  );
};

export default UserLocationSection;