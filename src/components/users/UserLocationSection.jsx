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
    <div className={`flex items-start space-x-2 ${className}`}>
      <MapPin size={18} className="mt-1 text-primary flex-shrink-0" />
      <div>
        <h3 className="font-medium">Location</h3>
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
    </div>
  );
};

export default UserLocationSection;