import React, { useState, useEffect } from "react";
import {
  MapPin,
  Globe,
  UserSearch,
  Tag,
  Award,
  Calendar,
  Users,
  Sparkles,
  CircleDot,
  Check,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import Modal from "../common/Modal";
import {
  getCategoryIcon,
  getSupercategoryIcon,
} from "../../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  CATEGORY_CARD_PASTELS,
  DEFAULT_COLOR,
  PILL_ROW_HEIGHT,
  FOCUS_GREEN,
  FOCUS_GREEN_DARK,
  SUPERCATEGORY_ORDER,
  TAG_SECTION_BG,
} from "../../constants/badgeConstants";
import Tooltip from "../common/Tooltip";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";
import { vacantRoleService } from "../../services/vacantRoleService";

/**
 * VacantRoleDetailsModal Component
 *
 * Read-only modal showing full details of a vacant team role.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Object} role - Full or partial role data object
 */
const VacantRoleDetailsModal = ({
  isOpen,
  onClose,
  role,
  matchScore = null,
  matchDetails = null,
  canManage = false,
}) => {
  const { user: currentUser, isAuthenticated } = useAuth();

  // Current user's tags and badges for matching highlights
  const [userTagMap, setUserTagMap] = useState(new Map()); // tagId → { badgeCredits }
  const [userBadgeMap, setUserBadgeMap] = useState(new Map()); // lowercase name → { totalCredits }

  const [hydratedRole, setHydratedRole] = useState(null);
  const [loadingRoleDetails, setLoadingRoleDetails] = useState(false);

  const roleId = role?.id;
  const teamId = role?.teamId ?? role?.team_id;

useEffect(() => {
  const fetchFullRole = async () => {
    if (!isOpen || !roleId || !teamId) return;

    try {
      setLoadingRoleDetails(true);

      console.log("Fetching full vacant role details for:", { teamId, roleId });

      const response = await vacantRoleService.getVacantRoleById(teamId, roleId);

      console.log("getVacantRoleById raw response:", response);
      console.log("getVacantRoleById response.data:", response?.data);
      console.log("getVacantRoleById response.data?.tags:", response?.data?.tags);
      console.log("getVacantRoleById response.data?.badges:", response?.data?.badges);
      console.log(
        "getVacantRoleById response.data?.desiredTags:",
        response?.data?.desiredTags,
      );
      console.log(
        "getVacantRoleById response.data?.desiredBadges:",
        response?.data?.desiredBadges,
      );

      if (response?.success && response?.data) {
        setHydratedRole(response.data);
      } else if (response?.data) {
        setHydratedRole(response.data);
      } else {
        setHydratedRole(null);
      }
    } catch (error) {
      console.error("Error fetching full vacant role details:", error);
      setHydratedRole(null);
    } finally {
      setLoadingRoleDetails(false);
    }
  };

  fetchFullRole();
}, [isOpen, roleId, teamId]);

  useEffect(() => {
    if (!isOpen) {
      setHydratedRole(null);
      setLoadingRoleDetails(false);
    }
  }, [isOpen]);

  const displayRole = hydratedRole || role;

  console.log("VacantRoleDetailsModal incoming role:", role);
  console.log("VacantRoleDetailsModal hydratedRole:", hydratedRole);
  console.log("VacantRoleDetailsModal displayRole:", displayRole);
  console.log("displayRole.tags:", displayRole?.tags);
  console.log("displayRole.badges:", displayRole?.badges);
  console.log("displayRole.desiredTags:", displayRole?.desiredTags);
  console.log("displayRole.desiredBadges:", displayRole?.desiredBadges);
  console.log("displayRole.matchScore:", displayRole?.matchScore);
  console.log("displayRole.scoreBreakdown:", displayRole?.scoreBreakdown);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !currentUser?.id) {
      setUserTagMap(new Map());
      setUserBadgeMap(new Map());
      return;
    }

    const fetchUserData = async () => {
      try {
        const tagsRes = await userService.getUserTags(currentUser.id);
        const tagData = tagsRes?.data || [];
        const tMap = new Map();
        for (const t of tagData) {
          tMap.set(Number(t.id), {
            badgeCredits: Number(t.badge_credits ?? t.badgeCredits ?? 0),
          });
        }
        setUserTagMap(tMap);

        const badgesRes = await userService.getUserBadges(currentUser.id);
        const badgeData = Array.isArray(badgesRes?.data)
          ? badgesRes.data
          : badgesRes?.data?.data || [];
        const bMap = new Map();
        for (const b of badgeData) {
          const name = (b.badgeName ?? b.badge_name ?? b.name ?? "")
            .trim()
            .toLowerCase();
          const credits = Number(
            b.totalCredits ?? b.total_credits ?? b.credits ?? 0,
          );
          const existing = bMap.get(name);
          bMap.set(name, {
            totalCredits: (existing?.totalCredits || 0) + credits,
          });
        }
        setUserBadgeMap(bMap);
      } catch (err) {
        console.warn("Could not fetch user data for matching highlights:", err);
      }
    };

    fetchUserData();
  }, [isOpen, isAuthenticated, currentUser?.id]);

  if (!displayRole) return null;

  // Normalize camelCase/snake_case
  const roleName =
    displayRole.roleName ?? displayRole.role_name ?? "Vacant Role";
  const bio = displayRole.bio ?? "";
  const city = displayRole.city;
  const country = displayRole.country;
  const state = displayRole.state;
  const postalCode = displayRole.postalCode ?? displayRole.postal_code;
  const maxDistanceKm =
    displayRole.maxDistanceKm ?? displayRole.max_distance_km;
  const isRemote = displayRole.isRemote ?? displayRole.is_remote;
  const status = displayRole.status;
  const createdAt = displayRole.createdAt ?? displayRole.created_at;
  const tags =
    displayRole.tags?.length > 0
      ? displayRole.tags
      : displayRole.desiredTags || [];
  const badges =
    displayRole.badges?.length > 0
      ? displayRole.badges
      : displayRole.desiredBadges || [];

  const pct =
    matchScore !== null && matchScore !== undefined
      ? Math.round(matchScore * 100)
      : null;

  const teamName = displayRole.teamName ?? displayRole.team_name;
  const teamMemberCount =
    displayRole.teamMemberCount ?? displayRole.team_member_count;
  const teamMaxMembers =
    displayRole.teamMaxMembers ?? displayRole.team_max_members;

  const creatorFirstName =
    displayRole.creatorFirstName ?? displayRole.creator_first_name;
  const creatorLastName =
    displayRole.creatorLastName ?? displayRole.creator_last_name;
  const creatorUsername =
    displayRole.creatorUsername ?? displayRole.creator_username;
  const creatorName =
    creatorFirstName && creatorLastName
      ? `${creatorFirstName} ${creatorLastName}`
      : creatorUsername || null;

  const getRoleInitials = () => {
    const name = roleName || "Vacant Role";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getLocationText = () => {
    if (isRemote) return "Remote — no geographic preference";
    const parts = [city, state, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const locationText = getLocationText();

  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    params.set("type", "users");
    params.set("sort", "match");

    const tagIds = tags
      .map((t) => Number(t.tagId ?? t.tag_id ?? t.id))
      .filter(Boolean);
    if (tagIds.length > 0) params.set("tags", tagIds.join(","));

    const badgeIds = badges
      .map((b) => Number(b.badgeId ?? b.badge_id ?? b.id))
      .filter(Boolean);
    if (badgeIds.length > 0) params.set("badges", badgeIds.join(","));

    if (isRemote) params.set("proximity", "remote");

    if (roleId) params.set("roleId", roleId);
    const searchRoleName = displayRole.roleName ?? displayRole.role_name ?? "Vacant Role";
    if (searchRoleName) params.set("roleName", searchRoleName);

    return `/search?${params.toString()}`;
  };

  const badgesByCategory = badges.reduce((acc, badge) => {
    const cat = badge.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  const modalTitle = (
    <div className="flex items-center gap-2">
      <UserSearch className="text-amber-500" size={20} />
      <h2 className="text-lg font-medium">Vacant Role</h2>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      position="center"
      size="default"
      maxHeight="max-h-[90vh]"
      closeOnBackdrop={true}
      closeOnEscape={true}
      showCloseButton={true}
    >
      <div className="space-y-6">
        {loadingRoleDetails && !hydratedRole && (
          <div className="text-sm text-base-content/50">
            Loading full role details...
          </div>
        )}

        {/* Header — avatar + role name + status */}
        <div className="flex items-start space-x-4">
          <div className="avatar placeholder">
            {pct !== null ? (
              <div
                className={`${
                  pct >= 80 ? "bg-amber-500" : "bg-slate-400"
                } text-white rounded-full w-20 h-20 relative flex items-center justify-center overflow-hidden`}
              >
                {pct >= 80 ? (
                  <Sparkles
                    size={56}
                    className="absolute text-amber-300/40"
                    strokeWidth={1.5}
                  />
                ) : (
                  <TrendingUp
                    size={56}
                    className="absolute text-slate-300/40"
                    strokeWidth={1.5}
                  />
                )}
                <span className="relative text-2xl font-bold">{pct}%</span>
              </div>
            ) : (
              <div className="bg-amber-500 text-white rounded-full w-20 h-20 flex items-center justify-center">
                <span className="text-2xl">{getRoleInitials()}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{roleName}</h1>

            {teamName && (
              <div className="flex items-center gap-1 mt-1 text-sm text-base-content/70">
                <Users size={14} className="text-primary flex-shrink-0" />
                <span>{teamName}</span>
                {teamMemberCount != null && (
                  <span className="text-base-content/50">
                    · {teamMemberCount}/{teamMaxMembers ?? "∞"} members
                  </span>
                )}
              </div>
            )}

            {createdAt && (
              <div className="flex items-center gap-1 mt-1 text-xs text-base-content/50">
                <Calendar size={12} />
                <span>Posted {formatDate(createdAt)}</span>
                {creatorName && <span> by {creatorName}</span>}
              </div>
            )}
          </div>
        </div>

        {isAuthenticated && (tags.length > 0 || badges.length > 0) && (
          <div>
            <a
              href={buildSearchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline btn-primary w-full sm:w-auto inline-flex items-center gap-2"
            >
              Search for matching people
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {bio && (
          <div>
            <p className="text-base-content/90 leading-relaxed">{bio}</p>
          </div>
        )}

        {matchScore !== null &&
          matchScore !== undefined &&
          (() => {
            const pct = Math.round(matchScore * 100);
            const tagPct = Math.round(
              (matchDetails?.tagScore ?? matchDetails?.tag_score ?? 0) * 100,
            );
            const badgePct = Math.round(
              (matchDetails?.badgeScore ?? matchDetails?.badge_score ?? 0) *
                100,
            );
            const distPct = Math.round(
              (matchDetails?.distanceScore ??
                matchDetails?.distance_score ??
                0) * 100,
            );

            const tierColor = {
              bg: "bg-base-200/50",
              border: "border-base-300",
              text: pct >= 80 ? "text-amber-700" : "text-base-content/70",
            };

            return (
              <div
                className={`rounded-xl p-4 ${tierColor.bg} border ${tierColor.border}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {pct >= 80 ? (
                    <Sparkles size={16} className={tierColor.text} />
                  ) : (
                    <TrendingUp size={16} className={tierColor.text} />
                  )}
                  <span className={`text-sm font-semibold ${tierColor.text}`}>
                    {pct}% Match
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      label: "Location",
                      value: distPct,
                      icon: MapPin,
                      tooltip: (
                        <>
                          Location factors into the score with 30%.
                          <br />
                          Within the role's radius = 100%. Up to 20 km beyond =
                          25%. Farther = 0%.
                        </>
                      ),
                    },
                    {
                      label: "Focus Areas",
                      value: tagPct,
                      icon: Tag,
                      tooltip: (
                        <>
                          Focus Areas factor into the score with 40%.
                          <br />
                          {matchDetails?.matchingTags ??
                            matchDetails?.matching_tags ??
                            0}{" "}
                          out of{" "}
                          {matchDetails?.totalRequiredTags ??
                            matchDetails?.total_required_tags ??
                            0}{" "}
                          required focus areas met.
                        </>
                      ),
                    },
                    {
                      label: "Badges",
                      value: badgePct,
                      icon: Award,
                      tooltip: (
                        <>
                          Badges factor into the score with 30%.
                          <br />
                          {matchDetails?.matchingBadges ??
                            matchDetails?.matching_badges ??
                            0}{" "}
                          out of{" "}
                          {matchDetails?.totalRequiredBadges ??
                            matchDetails?.total_required_badges ??
                            0}{" "}
                          required badges met.
                        </>
                      ),
                    },
                  ].map(({ label, value, icon: Icon, tooltip }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Tooltip content={tooltip}>
                        <span className="text-xs text-base-content/60 w-24 flex-shrink-0 flex items-center gap-1 cursor-help">
                          <Icon size={12} className="flex-shrink-0" />
                          {label}
                        </span>
                      </Tooltip>
                      <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 80 ? "bg-amber-500" : "bg-slate-400"
                          }`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-base-content/60 w-8 text-right">
                        {value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {locationText && (
          <div>
            <div className="flex items-center mb-2">
              {isRemote ? (
                <Globe size={18} className="mr-2 text-primary flex-shrink-0" />
              ) : (
                <MapPin size={18} className="mr-2 text-primary flex-shrink-0" />
              )}
              <h3 className="font-medium">Location Preference</h3>
            </div>

            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <span>{locationText}</span>
              {!isRemote && maxDistanceKm && (
                <span className="flex items-center gap-1 text-base-content/50">
                  <CircleDot size={14} />
                  within {maxDistanceKm} km from Role Location
                </span>
              )}
            </div>
          </div>
        )}

        {/* Desired Focus Areas */}
        <div>
          <div className="flex items-center mb-2">
            <Tag size={18} className="mr-2 text-primary flex-shrink-0" />
            <h3 className="font-medium">Desired Focus Areas</h3>
          </div>

          {tags.length > 0 ? (
            (() => {
              const groups = {};
              for (const tag of tags) {
                const supercat = tag.supercategory || "Other";
                if (!groups[supercat]) groups[supercat] = [];
                groups[supercat].push(tag);
              }

              const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
                const idxA = SUPERCATEGORY_ORDER.indexOf(a);
                const idxB = SUPERCATEGORY_ORDER.indexOf(b);
                const posA = idxA === -1 ? 999 : idxA;
                const posB = idxB === -1 ? 999 : idxB;
                return posA - posB;
              });

              for (const [, groupTags] of sortedGroups) {
                groupTags.sort((a, b) => a.name.localeCompare(b.name));
              }

              return (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {sortedGroups.map(([supercategory, groupTags]) => (
                    <div
                      key={supercategory}
                      className="flex items-start gap-0"
                      title={supercategory}
                    >
                      <Tooltip content={supercategory}>
                        <span
                          className="inline-flex items-center justify-center pr-[6px] flex-shrink-0"
                          style={{
                            height: PILL_ROW_HEIGHT,
                            color: FOCUS_GREEN_DARK,
                          }}
                        >
                          {getSupercategoryIcon(
                            supercategory,
                            14,
                            FOCUS_GREEN_DARK,
                          )}
                        </span>
                      </Tooltip>

                      <div className="flex flex-wrap gap-1.5">
                        {groupTags.map((tag) => {
                          const tagId = Number(
                            tag.tagId ?? tag.tag_id ?? tag.id,
                          );
                          const userTag = userTagMap.get(tagId);
                          const isMatch = !!userTag;
                          const credits = userTag?.badgeCredits || 0;

                          return (
                            <Tooltip
                              key={tagId}
                              content={`${tag.name} — ${tag.supercategory || "Other"}`}
                            >
                              <span
                                className="badge badge-outline p-3 inline-flex items-center gap-1"
                                style={{
                                  borderColor: FOCUS_GREEN_DARK,
                                  color: FOCUS_GREEN_DARK,
                                  ...(isMatch
                                    ? { backgroundColor: TAG_SECTION_BG }
                                    : {}),
                                }}
                              >
                                {isMatch && (
                                  <Check
                                    size={12}
                                    className="flex-shrink-0"
                                    style={{ color: FOCUS_GREEN }}
                                  />
                                )}
                                {tag.name}
                                {isMatch && credits > 0 && (
                                  <span className="opacity-70">
                                    | {credits}ct.
                                  </span>
                                )}
                              </span>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-base-content/50">
              No specific focus areas required
            </p>
          )}
        </div>

        {/* Desired Badges */}
        <div>
          <div className="flex items-center mb-2">
            <Award size={18} className="mr-2 text-primary flex-shrink-0" />
            <h3 className="font-medium">Desired Badges</h3>
          </div>

          {badges.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {Object.entries(badgesByCategory).map(([category, catBadges]) => {
                const categoryColor =
                  CATEGORY_COLORS[category] || DEFAULT_COLOR;

                return (
                  <div key={category} className="flex items-start">
                    <Tooltip content={category}>
                      <span
                        className="inline-flex items-center justify-center pr-[6px]"
                        style={{
                          height: PILL_ROW_HEIGHT,
                          color: categoryColor,
                        }}
                      >
                        {getCategoryIcon(category, categoryColor, 14)}
                      </span>
                    </Tooltip>

                    <div className="flex flex-wrap gap-1.5">
                      {catBadges.map((badge) => {
                        const badgeColor = badge.color || categoryColor;
                        const badgeKey = (badge.name ?? "")
                          .trim()
                          .toLowerCase();
                        const userBadge = userBadgeMap.get(badgeKey);
                        const isMatch = !!userBadge;
                        const credits = userBadge?.totalCredits || 0;
                        const pastel =
                          CATEGORY_CARD_PASTELS[category] || `${badgeColor}15`;

                        return (
                          <Tooltip
                            key={badge.badgeId ?? badge.badge_id ?? badge.id}
                            content={
                              badge.description || `${badge.name} — ${category}`
                            }
                          >
                            <span
                              className="badge badge-outline p-3 inline-flex items-center gap-1"
                              style={{
                                borderColor: badgeColor,
                                color: badgeColor,
                                ...(isMatch ? { backgroundColor: pastel } : {}),
                              }}
                            >
                              {isMatch && (
                                <Check size={12} className="flex-shrink-0" />
                              )}
                              {badge.name}
                              {isMatch && credits > 0 && (
                                <span className="opacity-70">
                                  | {credits}ct.
                                </span>
                              )}
                            </span>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-base-content/50">
              No specific badges required
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VacantRoleDetailsModal;