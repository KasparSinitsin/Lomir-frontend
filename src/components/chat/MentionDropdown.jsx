import React from "react";
import { getUserInitials } from "../../utils/userHelpers";
import { joinNameParts } from "../../utils/nameFormatters";
import { normalizeNameForMatch } from "../../utils/describeEvent";

const MentionDropdown = ({ participants, query, onSelect }) => {
  const filtered = participants.filter((p) => {
    if (p.id === "all") return "all".includes(query.toLowerCase().trim());
    // Both sides go through the project's canonical matcher. A stored name can
    // carry a stray space of its own, and comparing a correctly typed query
    // against the raw spelling stops matching the moment the surname begins:
    // "@Anna" hit, "@Anna " hit, "@Anna K" missed, so the person could not be
    // mentioned at all.
    const fullName = normalizeNameForMatch(joinNameParts(p.firstName, p.lastName));
    return fullName.includes(normalizeNameForMatch(query || ""));
  });

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-2 left-0 z-50 bg-base-100 border border-base-300 rounded-xl shadow-lg max-h-48 overflow-y-auto w-64">
      {filtered.map((p) => {
        if (p.id === "all") {
          return (
            <button
              key="all"
              type="button"
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-base-200 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(p);
              }}
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                @
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium">All members</span>
                <span className="text-xs text-base-content/50">Notify everyone</span>
              </div>
            </button>
          );
        }

        const fullName = joinNameParts(p.firstName, p.lastName);
        const initials = getUserInitials(p);
        return (
          <button
            key={p.id}
            type="button"
            className="flex items-center gap-3 w-full px-3 py-2 hover:bg-base-200 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(p);
            }}
          >
            {p.avatarUrl ? (
              <img
                src={p.avatarUrl}
                alt={fullName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                {initials}
              </div>
            )}
            <span className="text-sm font-medium truncate">{fullName}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MentionDropdown;
