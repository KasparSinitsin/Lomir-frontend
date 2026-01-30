import React from "react";
import { MapPin, Globe } from "lucide-react";
import LocationDisplay from "../common/LocationDisplay";

/**
 * TeamLocationSection Component
 * Displays team's location or "Remote" status
 *
 * Consistent with UserLocationSection and UserCard styling
 */
const TeamLocationSection = ({ team, className = "", compact = false }) => {
  if (!team) {
    return null;
  }

  const isRemote = team?.is_remote === true || team?.isRemote === true;
  const postalCode = team?.postal_code || team?.postalCode;
  const city = team?.city;
  const country = team?.country;
  const state = team?.state;

  // Show section if we have remote flag OR location data
  const hasLocation = isRemote || city || postalCode || state || country;

  if (!hasLocation) {
    return null;
  }

  // Compact version for cards - consistent with UserCard location display
  if (compact) {
    return (
      <div
        className={`flex items-center text-sm text-base-content/70 ${className}`}
      >
        {isRemote ? (
          <>
            <Globe size={16} className="mr-1 flex-shrink-0" />
            <span>Remote</span>
          </>
        ) : (
          <>
            <MapPin size={16} className="mr-1 flex-shrink-0" />
            <LocationDisplay
              postalCode={postalCode}
              city={city}
              state={state}
              country={country}
              showIcon={false}
              showPostalCode={false}
              displayType="short"
              className="inline"
            />
          </>
        )}
      </div>
    );
  }

  // Full version for modals/details view
  return (
    <div className={className}>
      {/* Title row - icon and title together */}
      <div className="flex items-center mb-2">
        {isRemote ? (
          <Globe size={18} className="mr-2 text-primary flex-shrink-0" />
        ) : (
          <MapPin size={18} className="mr-2 text-primary flex-shrink-0" />
        )}
        <h3 className="font-medium">Location</h3>
      </div>

      {/* Content below */}
      <div>
        {isRemote ? (
          <div className="flex items-center bg-base-200/50 rounded-lg py-2 px-3">
            <span className="text-base-content">Remote Team</span>
            <span className="text-xs text-base-content/50 ml-2">
              (No physical location)
            </span>
          </div>
        ) : (
          <LocationDisplay
            postalCode={postalCode}
            city={city}
            state={state}
            country={country}
            className="bg-base-200/50 py-1"
            showIcon={false}
            showPostalCode={true}
            displayType="full"
          />
        )}
      </div>
    </div>
  );
};

export default TeamLocationSection;
