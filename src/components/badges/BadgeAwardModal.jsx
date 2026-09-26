import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Award,
  Send,
  Star,
  Users,
  ChevronDown,
  ChevronUp,
  Briefcase,
  FolderOpen,
  User,
  Tag,
  Search as SearchIcon,
  X,
  Heart,
  Layers,
  FlaskConical,
  // Badge icons
  MessageCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import {
  CATEGORY_COLORS,
  CATEGORY_SECTION_PASTELS,
  DEFAULT_COLOR,
} from "../../constants/badgeConstants";
import {
  getCategoryIcon,
  getBadgeIcon,
  SUPERCATEGORY_ICONS,
} from "../../utils/badgeIconUtils";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import Tooltip from "../common/Tooltip";
import UserAvatar from "../users/UserAvatar";
import { badgeService } from "../../services/badgeService";
import { tagService } from "../../services/tagService";
import { useBadges, useSharedTeamsForAward } from "../../hooks/useBadgeQueries";
import { useUserTags } from "../../hooks/useUserQueries";
import { formatDateMedium } from "../../utils/dateHelpers";
import {
  getBadgeDescription,
  getBadgeName,
  getCategoryLabel,
} from "../../utils/badgeLabels";

/**
 * BadgeAwardModal Component
 *
 * Modal for awarding a badge to a user. Allows selecting a category,
 * then a badge within that category, choosing credit points (1-3),
 * selecting the award context (personal/team/project), optionally
 * linking to a focus area/tag, and adding an optional comment.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {string|number} awardeeId - ID of the user being awarded
 * @param {string} awardeeFirstName - First name of the awardee
 * @param {string} awardeeLastName - Last name of the awardee
 * @param {string} awardeeUsername - Username of the awardee
 * @param {string} awardeeAvatar - Avatar URL of the awardee
 * @param {string} awardeeBio - Bio of the awardee
 * @param {boolean} awardeeIsDemo - Whether the awardee is a demo/synthetic profile
 * @param {Function} onUserClick - Optional callback to navigate to the awardee's profile
 * @param {Function} onAwardComplete - Callback after successful award (to refresh badges)
 */

/**
 * Context type options - value and icon only.
 *
 * ⚠️ The words used to live here as `label` and `description`, which is the
 * object-literal trap (plan finding F8): a label built where the array is
 * defined is built once, at module load, and keeps the language it was born
 * with. They are resolved at render instead, by `contextLabel` below.
 *
 * The descriptions reuse `badges.award.personal|team|project`, the same keys
 * `AwardCard` and `Profile` use to describe an award that already exists - so
 * the wording a person reads while giving a badge matches what the recipient
 * reads afterwards.
 */
const CONTEXT_OPTIONS = [
  { value: "personal", icon: User },
  { value: "team", icon: Users },
  { value: "project", icon: FolderOpen },
];

const EMPTY_QUERY_ARRAY = [];

// The comment limit, so the counter cannot drift from what the field enforces.
const REASON_MAX_LENGTH = 300;

const BadgeAwardModal = ({
  isOpen,
  onClose,
  awardeeId,
  awardeeFirstName,
  awardeeLastName,
  awardeeUsername,
  awardeeAvatar,
  awardeeBio,
  awardeeIsDemo,
  awardeeCity = null,
  awardeeCountry = null,
  awardeeJoinedAt = null,
  onUserClick,
  onAwardComplete,
}) => {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  /**
   * ⚠️ Both hold a CODE, never a finished sentence.
   *
   * `error` is one of the codes worded by `errorText` below; `success` carries
   * the three values its sentence needs. A sentence built when the action runs
   * keeps the language it was built in - and `LanguageContext` switches once
   * after the user loads, so a sentence built early is wrong from the start,
   * not only after a manual switch (STATUS.md decision 6, FE #625).
   */
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [credits, setCredits] = useState(null);
  const [contextType, setContextType] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [customTeamName, setCustomTeamName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [reason, setReason] = useState("");

  // Tag picker state
  const [awardeeTags, setAwardeeTags] = useState([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagSearchResults, setTagSearchResults] = useState([]);
  const [tagSearching, setTagSearching] = useState(false);
  const [showTagSearch, setShowTagSearch] = useState(false);
  const tagSearchRef = useRef(null);
  const tagSearchTimerRef = useRef(null);
  const nameContainerRef = useRef(null);
  const nameProbeRef = useRef(null);
  const dateRef = useRef(null);
  const [dateIsNarrow, setDateIsNarrow] = useState(false);
  const dateIsNarrowRef = useRef(false);
  dateIsNarrowRef.current = dateIsNarrow;
  const {
    data: badges = EMPTY_QUERY_ARRAY,
    error: badgesError,
    isLoading: loading,
  } = useBadges({
    enabled: Boolean(isOpen),
  });
  const {
    data: sharedTeams = EMPTY_QUERY_ARRAY,
    error: sharedTeamsError,
    isLoading: teamsLoading,
  } = useSharedTeamsForAward(awardeeId, {
    enabled: Boolean(isOpen && awardeeId),
  });
  const {
    data: fetchedAwardeeTags = EMPTY_QUERY_ARRAY,
    error: awardeeTagsError,
    isLoading: tagsLoading,
  } = useUserTags(awardeeId, {
    enabled: Boolean(isOpen && awardeeId),
  });

  /**
   * The words for a context option, resolved at render.
   *
   * Written out as a switch with literal keys rather than
   * `t("badges.award." + value)`: `npm run i18n:check` reads string literals out
   * of `t(...)` and reports a composed key as unused (FE #636).
   */
  const contextLabel = (value) => {
    if (value === "personal") return t("badges.award.modal.contextPersonal");
    if (value === "team") return t("badges.award.modal.contextTeam");
    return t("badges.award.modal.contextProject");
  };

  const contextDescription = (value) => {
    if (value === "personal") return t("badges.award.personal");
    if (value === "team") return t("badges.award.team");
    return t("badges.award.project");
  };

  // Get display name
  const getDisplayName = () => {
    const first = awardeeFirstName || "";
    const last = awardeeLastName || "";
    const full = `${first} ${last}`.trim();
    return full || awardeeUsername || t("badges.award.modal.unknownPerson");
  };

  /**
   * The first given name only: "Alice Stephanie Beurer" → "Alice".
   *
   * Every sentence that addresses the awardee uses this. A second helper
   * returned *all* given names despite being called `getFirstName`, so the
   * title said "Camila" while the sentences below it said
   * "Camila Alejandra Simona". Julia's call, 2026-09-26: the short form
   * everywhere.
   */
  const getAbbreviatedName = () => {
    return (
      (awardeeFirstName || "").split(" ")[0] ||
      awardeeUsername ||
      t("badges.award.modal.unknownPerson")
    );
  };

  const locationText = [awardeeCity, awardeeCountry].filter(Boolean).join(", ");
  const joinedDateText = (() => {
    if (!awardeeJoinedAt) return null;
    try {
      return formatDateMedium(new Date(awardeeJoinedAt));
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    setAwardeeTags(fetchedAwardeeTags);
  }, [fetchedAwardeeTags]);

  useEffect(() => {
    if (!badgesError) return;

    console.error("Error fetching badges:", badgesError);
    setError("loadFailed");
  }, [badgesError]);

  useEffect(() => {
    if (!sharedTeamsError) return;

    console.error("Error fetching shared teams:", sharedTeamsError);
  }, [sharedTeamsError]);

  useEffect(() => {
    if (!awardeeTagsError) return;

    console.error("Error fetching awardee tags:", awardeeTagsError);
    setAwardeeTags([]);
  }, [awardeeTagsError]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setExpandedCategory(null);
      setSelectedBadge(null);
      setCredits(null);
      setContextType(null);
      setSelectedTeamId(null);
      setSelectedTag(null);
      setReason("");
      setError(null);
      setSuccess(null);
      setTagSearchQuery("");
      setTagSearchResults([]);
      setShowTagSearch(false);
      setCustomTeamName("");
      setProjectName("");
    }
  }, [isOpen]);

  // Reset team selection when switching away from "team" context

  useEffect(() => {
    if (contextType !== "team") {
      setSelectedTeamId(null);
      setCustomTeamName("");
    }
    if (contextType !== "project") {
      setProjectName("");
    }
  }, [contextType]);

  // Debounced tag search
  useEffect(() => {
    if (tagSearchTimerRef.current) {
      clearTimeout(tagSearchTimerRef.current);
    }

    if (!tagSearchQuery.trim() || tagSearchQuery.trim().length < 2) {
      setTagSearchResults([]);
      setTagSearching(false);
      return;
    }

    setTagSearching(true);
    tagSearchTimerRef.current = setTimeout(async () => {
      try {
        // Exclude already-selected tag and awardee's existing tag IDs from results
        const excludeIds = awardeeTags.map((t) => t.id);
        if (selectedTag) excludeIds.push(selectedTag.id);

        const results = await tagService.getSuggestions(
          tagSearchQuery.trim(),
          10,
          excludeIds,
        );
        setTagSearchResults(results || []);
      } catch (err) {
        console.error("Tag search error:", err);
        setTagSearchResults([]);
      } finally {
        setTagSearching(false);
      }
    }, 300);

    return () => {
      if (tagSearchTimerRef.current) {
        clearTimeout(tagSearchTimerRef.current);
      }
    };
  }, [tagSearchQuery, awardeeTags, selectedTag]);

  // Close tag search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagSearchRef.current && !tagSearchRef.current.contains(e.target)) {
        setShowTagSearch(false);
        setTagSearchQuery("");
        setTagSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    const container = nameContainerRef.current;
    const probe = nameProbeRef.current;
    if (!container || !probe) return;

    const update = () => {
      const first = awardeeFirstName || "";
      const last = awardeeLastName || "";
      const full = `${first} ${last}`.trim();
      const displayName =
        full || awardeeUsername || t("badges.award.modal.unknownPerson");
      const dateEl = dateRef.current;
      const reservedWidth =
        dateIsNarrowRef.current && dateEl ? dateEl.offsetWidth + 16 : 0;
      probe.textContent = displayName;
      setDateIsNarrow(probe.scrollWidth > container.clientWidth - reservedWidth);
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);
    if (dateRef.current) resizeObserver.observe(dateRef.current);
    update();
    return () => resizeObserver.disconnect();
  }, [awardeeFirstName, awardeeLastName, awardeeUsername, t]);

  // Group badges by category
  const badgesByCategory = badges.reduce((acc, badge) => {
    const cat = badge.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {});

  // Category order. ⚠️ These are the stored `badge.category` values and are
  // grouping keys, never display text - `getCategoryLabel` words them at
  // render. Translating them here would silently empty every section.
  const categoryOrder = [
    "Collaboration Skills",
    "Technical Expertise",
    "Creative Thinking",
    "Leadership Qualities",
    "Personal Attributes",
  ];

  const sortedCategories = categoryOrder.filter((cat) => badgesByCategory[cat]);

  // Handle badge selection
  const handleBadgeSelect = (badge) => {
    if (selectedBadge?.id === badge.id) {
      setSelectedBadge(null);
    } else {
      setSelectedBadge(badge);
    }
  };

  // Handle category toggle
  const handleCategoryToggle = (category) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  // Handle tag selection from awardee's tags or search
  const handleTagSelect = (tag) => {
    if (selectedTag?.id === tag.id) {
      setSelectedTag(null); // Deselect
    } else {
      setSelectedTag(tag);
    }
    setShowTagSearch(false);
    setTagSearchQuery("");
    setTagSearchResults([]);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedBadge) {
      setError("selectBadge");
      return;
    }

    if (!credits) {
      setError("selectCredits");
      return;
    }

    if (!contextType) {
      setError("selectContext");
      return;
    }

    if (contextType === "team" && !selectedTeamId && !customTeamName.trim()) {
      setError("selectTeam");
      return;
    }

    try {
      setSending(true);
      setError(null);

      await badgeService.awardBadge({
        awardedToUserId: awardeeId,
        badgeId: selectedBadge.id,
        credits: credits,
        reason: reason.trim() || null,
        contextType: contextType,
        teamId: contextType === "team" ? selectedTeamId : null,
        tagId: selectedTag?.id || null,
        customTeamName:
          contextType === "team" && !selectedTeamId
            ? customTeamName.trim()
            : null,
        project_name:
          contextType === "project" ? projectName.trim() || null : null,
      });

      setSuccess({
        badge: selectedBadge.name,
        name: getDisplayName(),
        credits,
      });

      // Notify parent to refresh badge data
      if (onAwardComplete) {
        try {
          await onAwardComplete();
        } catch (refreshError) {
          console.warn("Badge awarded, but refreshing badge data failed:", refreshError);
        }
      }

      // Close after a brief delay
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error("Error awarding badge:", err);
      // Deliberately not `err.response?.data?.message`: this endpoint has no
      // failure codes, so its message is untranslated English prose. Same rule
      // as `utils/teamErrorText.js`.
      setError("awardFailed");
    } finally {
      setSending(false);
    }
  };

  /** Words an error code. Literal keys, for the reason given at `contextLabel`. */
  const errorText = (code) => {
    if (code === "selectBadge") return t("badges.award.modal.errorSelectBadge");
    if (code === "selectCredits") return t("badges.award.modal.errorSelectCredits");
    if (code === "selectContext") return t("badges.award.modal.errorSelectContext");
    if (code === "selectTeam") return t("badges.award.modal.errorSelectTeam");
    if (code === "loadFailed") return t("badges.award.modal.errorLoadFailed");
    return t("badges.award.modal.errorAwardFailed");
  };

  // ============ Render ============

  const customHeader = (
    <div className="flex items-start gap-3">
      <Award className="text-primary mt-0.5" size={24} />
      <div>
        <h2 className="text-xl font-medium text-primary leading-[110%]">
          {t("badges.award.modal.title", { name: getAbbreviatedName() })}
        </h2>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="errorOutline" onClick={onClose} disabled={sending}>
        {t("badges.award.modal.cancel")}
      </Button>
      <Button
        variant="successOutline"
        onClick={handleSubmit}
        disabled={
          !selectedBadge ||
          !credits ||
          !contextType ||
          sending ||
          !!success ||
          (contextType === "team" && !selectedTeamId && !customTeamName.trim())
        }
        icon={<Send size={16} />}
      >
        {sending
          ? t("badges.award.modal.submitting")
          : t("badges.award.modal.submit")}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customHeader}
      footer={!success ? footer : undefined}
      size="md"
    >
      <div className="space-y-4">
        {/* Success message */}
        {success && (
          <Alert type="success" className="text-center">
            {t("badges.award.modal.success", {
              badge: getBadgeName(success.badge, t),
              name: success.name,
              credits: success.credits,
            })}
          </Alert>
        )}

        {/* Error message */}
        {error && <Alert type="error">{errorText(error)}</Alert>}

        {/* Awardee info */}
        {!success && (
          <div className="relative flex items-start justify-between gap-4 mb-5">
            <div className="flex min-w-0 flex-1 items-start space-x-4">
              {onUserClick ? (
                <Tooltip content={t("badges.card.viewProfile")} position="bottom" wrapperClassName="block">
                  <UserAvatar
                    user={{
                      avatar_url: awardeeAvatar,
                      avatarUrl: awardeeAvatar,
                      first_name: awardeeFirstName,
                      last_name: awardeeLastName,
                      username: awardeeUsername,
                      is_synthetic: awardeeIsDemo,
                    }}
                    sizeClass="w-12 h-12"
                    initialsClassName="text-xl font-medium"
                    clickable
                    onClick={() => onUserClick(awardeeId)}
                    title={t("badges.card.viewProfile")}
                    showDemoOverlay={awardeeIsDemo}
                    demoOverlayTextClassName="text-[8px]"
                  />
                </Tooltip>
              ) : (
                <UserAvatar
                  user={{
                    avatar_url: awardeeAvatar,
                    avatarUrl: awardeeAvatar,
                    first_name: awardeeFirstName,
                    last_name: awardeeLastName,
                    username: awardeeUsername,
                    is_synthetic: awardeeIsDemo,
                  }}
                  sizeClass="w-12 h-12"
                  initialsClassName="text-xl font-medium"
                  showDemoOverlay={awardeeIsDemo}
                  demoOverlayTextClassName="text-[8px]"
                />
              )}

              <div className="flex-1 min-w-0">
                <h4
                  ref={nameContainerRef}
                  className="font-medium text-base-content leading-[120%] mb-[0.2em] truncate relative"
                >
                  {onUserClick ? (
                    <Tooltip content={t("badges.card.viewProfile")} position="bottom" wrapperClassName="cursor-pointer hover:text-primary transition-colors">
                      <span onClick={() => onUserClick(awardeeId)}>{getDisplayName()}</span>
                    </Tooltip>
                  ) : (
                    <span>{getDisplayName()}</span>
                  )}
                  <span
                    ref={nameProbeRef}
                    className="invisible absolute whitespace-nowrap pointer-events-none left-0 top-0 font-medium"
                    aria-hidden="true"
                  >
                    {getDisplayName()}
                  </span>
                </h4>

                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 overflow-hidden text-xs" style={{ maxHeight: "2.1em" }}>
                  {onUserClick ? (
                    <Tooltip content={t("badges.card.viewProfile")} position="bottom" wrapperClassName="inline-flex">
                      <p
                        className="text-base-content/70 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => onUserClick(awardeeId)}
                      >
                        @{awardeeUsername}
                      </p>
                    </Tooltip>
                  ) : (
                    <p className="text-base-content/70">@{awardeeUsername}</p>
                  )}
                  {dateIsNarrow && joinedDateText && (
                    <div className="flex shrink-0 items-center gap-1 text-base-content/60">
                      <Calendar size={10} className="shrink-0" />
                      <span className="leading-[1.05] whitespace-nowrap">{joinedDateText}</span>
                    </div>
                  )}
                  {locationText && (
                    <Tooltip
                      content={locationText}
                      wrapperClassName="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden"
                    >
                      <MapPin size={10} className="shrink-0 text-base-content/60" />
                      <span className="min-w-0 truncate text-base-content/60 leading-[1.05]">{locationText}</span>
                    </Tooltip>
                  )}
                  {awardeeIsDemo && (
                    <Tooltip
                      content={t("demo.profileTooltip")}
                      wrapperClassName="flex items-center gap-0.5 text-base-content/50 text-xs"
                    >
                      <FlaskConical size={12} className="flex-shrink-0" />
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            {joinedDateText && (
              <div
                ref={dateRef}
                className={`flex items-center text-xs text-base-content/60 whitespace-nowrap flex-shrink-0${dateIsNarrow ? " absolute opacity-0 pointer-events-none" : ""}`}
              >
                <Calendar size={12} className="mr-1" />
                <span>{joinedDateText}</span>
              </div>
            )}
          </div>
        )}

        {awardeeBio && !success && (
          <div className="text-sm text-base-content/80 mb-5">
            <p className="line-clamp-2">{awardeeBio}</p>
          </div>
        )}

        {/* Badge selection */}
        {!success && (
          <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <Award size={12} className="text-primary mr-1" />
              {t("badges.award.modal.selectBadge")}
            </p>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="loading loading-spinner loading-md text-primary"></div>
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="text-center py-6 bg-base-200/30 rounded-lg border border-base-300">
                <Award className="mx-auto mb-2 text-warning" size={28} />
                <p className="text-sm text-base-content/70">
                  {t("badges.award.modal.noBadges")}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sortedCategories.map((category) => {
                  const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
                  const pastel =
                    CATEGORY_SECTION_PASTELS[category] || "#F3F4F6";
                  const isExpanded = expandedCategory === category;
                  const categoryBadges = badgesByCategory[category] || [];
                  const hasSelectedBadge = categoryBadges.some(
                    (b) => b.id === selectedBadge?.id,
                  );

                  return (
                    <div
                      key={category}
                      className="rounded-xl overflow-hidden border border-base-200"
                      style={
                        hasSelectedBadge
                          ? { borderColor: color, borderWidth: 2 }
                          : {}
                      }
                    >
                      {/* Category header */}
                      <button
                        onClick={() => handleCategoryToggle(category)}
                        className="w-full flex items-center justify-between p-3 hover:bg-base-200/30 transition-colors"
                        style={{ backgroundColor: pastel }}
                      >
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category, color)}
                          <span
                            className="font-medium text-sm"
                            style={{ color }}
                          >
                            {getCategoryLabel(category, t)}
                          </span>
                          {hasSelectedBadge && !isExpanded && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: color }}
                            >
                              {getBadgeName(selectedBadge.name, t)}
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp
                            size={16}
                            className="text-base-content/50"
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            className="text-base-content/50"
                          />
                        )}
                      </button>

                      {/* Badge list */}
                      {isExpanded && (
                        <div
                          className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2"
                          style={{ backgroundColor: pastel }}
                        >
                          {categoryBadges.map((badge) => {
                            const isSelected = selectedBadge?.id === badge.id;

                            return (
                              <button
                                key={badge.id}
                                onClick={() => handleBadgeSelect(badge)}
                                className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all duration-200 ${
                                  isSelected
                                    ? "bg-white shadow-md ring-2"
                                    : "bg-white/60 hover:bg-white/80"
                                }`}
                                style={
                                  isSelected
                                    ? { "--tw-ring-color": color }
                                    : undefined
                                }
                              >
                                <span style={{ color }}>
                                  {getBadgeIcon(badge.name, color)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="text-sm font-medium truncate"
                                    style={isSelected ? { color } : {}}
                                  >
                                    {getBadgeName(badge.name, t)}
                                  </p>
                                  <p className="text-xs text-base-content/60 line-clamp-1">
                                    {getBadgeDescription(
                                      badge.name,
                                      badge.description,
                                      t,
                                    )}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 12 12"
                                      fill="none"
                                    >
                                      <path
                                        d="M2 6L5 9L10 3"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Credit points selection */}
        {selectedBadge && !success && (
          <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <Star size={12} className="text-primary mr-1" />
              {t("badges.award.modal.creditsLabel")}
            </p>
            <div className="flex gap-3">
              {[1, 2, 3].map((value) => {
                const isSelected = credits === value;
                const badgeColor =
                  CATEGORY_COLORS[selectedBadge.category] || DEFAULT_COLOR;

                return (
                  <button
                    key={value}
                    onClick={() => setCredits(value)}
                    className={`flex-1 py-2.5 rounded-xl text-center font-medium transition-all duration-200 border-2 ${
                      isSelected
                        ? "shadow-sm"
                        : "bg-base-100 text-base-content/70 border-base-200 hover:border-base-300"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor:
                              CATEGORY_SECTION_PASTELS[
                                selectedBadge.category
                              ] || "#F3F4F6",
                            borderColor: badgeColor,
                            color: badgeColor,
                          }
                        : {}
                    }
                  >
                    <span className="text-sm font-medium">
                      {/* R3: "ct." stays in the compact displays, and three
                          buttons in a row is one. `creditsBare` is the key the
                          rest of the app already uses for it. */}
                      {t("badges.creditsBare", { credits: value })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Context type selection */}
        {selectedBadge && !success && (
          <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <Briefcase size={12} className="text-primary mr-1" />
              {t("badges.award.modal.contextLabel")}
            </p>
            {(() => {
              const badgeColor =
                CATEGORY_COLORS[selectedBadge?.category] || DEFAULT_COLOR;
              const badgePastel =
                CATEGORY_SECTION_PASTELS[selectedBadge?.category] || "#F3F4F6";
              return (
                <div className="flex gap-2">
                  {CONTEXT_OPTIONS.map((option) => {
                    const isSelected = contextType === option.value;
                    const IconComponent = option.icon;
                    const isDisabled = false;

                    return (
                      <button
                        key={option.value}
                        onClick={() =>
                          !isDisabled && setContextType(option.value)
                        }
                        disabled={isDisabled}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                          isSelected
                            ? "shadow-sm"
                            : isDisabled
                              ? "bg-base-100 text-base-content/30 border-base-200 cursor-not-allowed"
                              : "bg-base-100 text-base-content/70 border-base-200 hover:border-base-300"
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: badgePastel,
                                borderColor: badgeColor,
                                color: badgeColor,
                              }
                            : {}
                        }
                        title={
                          isDisabled
                            ? t("badges.award.modal.noSharedTeams")
                            : contextDescription(option.value)
                        }
                      >
                        <IconComponent size={14} />
                        <span>{contextLabel(option.value)}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Team selection */}
            {contextType === "team" && (
              <div className="mt-4">
                {teamsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-base-content/50 py-2">
                    <div className="loading loading-spinner loading-xs"></div>
                    {t("badges.award.modal.loadingTeams")}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    {/* Lomir team dropdown */}
                    {sharedTeams.length > 0 && (
                      <div className="flex-1">
                        <label className="text-xs text-base-content/60 mb-1 block">
                          {t("badges.award.modal.lomirTeam")}
                        </label>
                        <select
                          value={selectedTeamId || ""}
                          onChange={(e) => {
                            const val = e.target.value
                              ? parseInt(e.target.value)
                              : null;
                            setSelectedTeamId(val);
                            if (val) setCustomTeamName("");
                          }}
                          className="select select-bordered select-sm w-full text-sm"
                          disabled={!!customTeamName.trim()}
                        >
                          <option value="">{t("badges.award.modal.selectTeam")}</option>
                          {sharedTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                              {team.city ? ` (${team.city})` : ""}
                              {team.is_remote ? " (Remote)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* "or" divider */}
                    {sharedTeams.length > 0 && (
                      <div className="flex sm:flex-col items-center justify-center px-1 sm:pt-5">
                        <span className="text-xs text-base-content/40">
                          {t("badges.award.modal.orSeparator")}
                        </span>
                      </div>
                    )}

                    {/* Custom team name input */}
                    <div className="flex-1">
                      <label className="text-xs text-base-content/60 mb-1 block">
                        {t("badges.award.modal.otherTeamName")}
                      </label>
                      <input
                        type="text"
                        value={customTeamName}
                        onChange={(e) => {
                          setCustomTeamName(e.target.value);
                          if (e.target.value.trim()) setSelectedTeamId(null);
                        }}
                        placeholder={t("badges.award.modal.otherTeamPlaceholder")}
                        className="input input-bordered input-sm w-full text-sm"
                        disabled={!!selectedTeamId}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Project name input */}
            {contextType === "project" && (
              <div className="mt-4">
                <label className="text-xs text-base-content/60 mb-1 block">
                  {t("badges.award.modal.projectName")}
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={t("badges.award.modal.projectPlaceholder")}
                  className="input input-bordered input-sm w-full text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* Focus area / tag selector */}
        {selectedBadge && !success && (
          <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
            <p className="text-xs text-base-content/60 mb-2 flex items-start">
              <Tag size={12} className="text-primary mr-1 flex-shrink-0 mt-0.5" />
              {t("badges.award.modal.focusAreasLabel", {
                name: getAbbreviatedName(),
              })}
            </p>

            {/* Selected tag display */}
            {selectedTag && (
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const badgeColor =
                    CATEGORY_COLORS[selectedBadge?.category] || DEFAULT_COLOR;
                  const SupercatIcon =
                    SUPERCATEGORY_ICONS[selectedTag.supercategory] || Layers;
                  return (
                    <>
                      <SupercatIcon
                        size={14}
                        style={{ color: badgeColor }}
                        className="flex-shrink-0"
                      />
                      <span
                        className="badge badge-outline py-1 px-3 bg-white/60 inline-flex items-center gap-1.5 text-sm font-medium leading-tight h-auto"
                        style={{ borderColor: badgeColor, color: badgeColor }}
                      >
                        {selectedTag.name}
                        <span className="opacity-70">{t("badges.creditsInlinePlus", { credits })}</span>
                        <button
                          onClick={() => setSelectedTag(null)}
                          className="ml-1 hover:opacity-60 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Tag pills - awardee's tags */}
            {!selectedTag && (
              <div>
                {tagsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-base-content/50 py-1">
                    <div className="loading loading-spinner loading-xs"></div>
                    {t("badges.award.modal.loadingTags")}
                  </div>
                ) : awardeeTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {awardeeTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagSelect(tag)}
                        className="badge badge-success text-white gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-base-content/40 mb-2">
                    {t("badges.award.modal.noFocusAreas", {
                      name: getAbbreviatedName(),
                    })}
                  </p>
                )}

                {/* Search for any tag */}
                <div className="relative mt-3" ref={tagSearchRef}>
                  <button
                    onClick={() => setShowTagSearch(!showTagSearch)}
                    className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <SearchIcon size={12} />
                    {awardeeTags.length > 0
                      ? t("badges.award.modal.searchAnotherFocusArea")
                      : t("badges.award.modal.searchFocusArea")}
                  </button>

                  {showTagSearch && (
                    <div className="mt-1.5">
                      <input
                        type="text"
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        placeholder={t("badges.award.modal.tagSearchPlaceholder")}
                        className="input input-bordered input-sm w-full text-sm"
                        autoFocus
                      />

                      {/* Search results dropdown */}
                      {(tagSearchResults.length > 0 || tagSearching) && (
                        <div className="mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                          {tagSearching ? (
                            <div className="flex items-center gap-2 text-sm text-base-content/50 p-3">
                              <div className="loading loading-spinner loading-xs"></div>
                              {t("badges.award.modal.searching")}
                            </div>
                          ) : (
                            tagSearchResults.map((tag) => (
                              <button
                                key={tag.id}
                                onClick={() => handleTagSelect(tag)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-base-200 transition-colors flex items-center justify-between"
                              >
                                <span className="font-medium">{tag.name}</span>
                                {tag.category && (
                                  <span className="text-xs text-base-content/40">
                                    {tag.category}
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {tagSearchQuery.trim().length >= 2 &&
                        !tagSearching &&
                        tagSearchResults.length === 0 && (
                          <p className="text-xs text-base-content/40 mt-1 px-1">
                            {t("badges.award.modal.noTagsFound", { query: tagSearchQuery })}
                          </p>
                        )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reason / comment */}
        {selectedBadge && !success && (
          <div>
            <p className="text-xs text-base-content/60 mb-1 flex items-center">
              <MessageCircle size={12} className="text-info mr-1" />
              {t("badges.award.modal.commentLabel")}
            </p>
            <div className="relative">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("badges.award.modal.commentPlaceholder", {
                  name: getAbbreviatedName(),
                  badge: getBadgeName(selectedBadge.name, t),
                })}
                className="textarea textarea-bordered w-full h-20 resize-none text-sm pb-6"
                maxLength={REASON_MAX_LENGTH}
              />
              <span className="absolute bottom-2 left-3 text-xs text-base-content/40 pointer-events-none">
                {t("badges.award.modal.charCount", {
                  count: reason.length,
                  max: REASON_MAX_LENGTH,
                })}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BadgeAwardModal;
