import React, { useState, useEffect, useRef } from "react";
import {
  Award,
  Send,
  Star,
  Users,
  Settings,
  Lightbulb,
  Compass,
  Heart,
  ChevronDown,
  ChevronUp,
  Briefcase,
  FolderOpen,
  User,
  Tag,
  Search as SearchIcon,
  X,
  // Badge icons
  Scale,
  MessageCircle,
  Flame,
  ClipboardList,
  Anchor,
  Code,
  Palette,
  BarChart2,
  Wrench,
  Network,
  FileText,
  Key,
  Telescope,
  BookOpen,
  Paintbrush,
  PackageOpen,
  GraduationCap,
  Flag,
  UserPlus,
  Map,
  MessageSquare,
  Zap,
  Mountain,
  Shuffle,
  Share2,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import { badgeService } from "../../services/badgeService";
import { userService } from "../../services/userService";
import { tagService } from "../../services/tagService";
import { getUserInitials } from "../../utils/userHelpers";

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
 * @param {Function} onAwardComplete - Callback after successful award (to refresh badges)
 */

// Category colors (matching BadgeCategoryCard/BadgeCategoryModal)
const CATEGORY_COLORS = {
  "Collaboration Skills": "#3B82F6",
  "Technical Expertise": "#10B981",
  "Creative Thinking": "#8B5CF6",
  "Leadership Qualities": "#EF4444",
  "Personal Attributes": "#F59E0B",
};

// Pastel background colors for each category
const CATEGORY_PASTELS = {
  "Collaboration Skills": "#DBEAFE",
  "Technical Expertise": "#D1FAE5",
  "Creative Thinking": "#EDE9FE",
  "Leadership Qualities": "#FEE2E2",
  "Personal Attributes": "#FEF3C7",
};

const DEFAULT_COLOR = "#6B7280";

// Context type options
const CONTEXT_OPTIONS = [
  {
    value: "personal",
    label: "Personal",
    icon: User,
    description: "Personal contribution",
  },
  {
    value: "team",
    label: "Teamwork",
    icon: Users,
    description: "Team contribution",
  },
  {
    value: "project",
    label: "Project",
    icon: FolderOpen,
    description: "Project contribution",
  },
];

const BadgeAwardModal = ({
  isOpen,
  onClose,
  awardeeId,
  awardeeFirstName,
  awardeeLastName,
  awardeeUsername,
  awardeeAvatar,
  onAwardComplete,
}) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [credits, setCredits] = useState(2);
  const [contextType, setContextType] = useState("personal");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [reason, setReason] = useState("");

  // Shared teams state
  const [sharedTeams, setSharedTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Tag picker state
  const [awardeeTags, setAwardeeTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagSearchResults, setTagSearchResults] = useState([]);
  const [tagSearching, setTagSearching] = useState(false);
  const [showTagSearch, setShowTagSearch] = useState(false);
  const tagSearchRef = useRef(null);
  const tagSearchTimerRef = useRef(null);

  // Get display name
  const getDisplayName = () => {
    const first = awardeeFirstName || "";
    const last = awardeeLastName || "";
    const full = `${first} ${last}`.trim();
    return full || awardeeUsername || "User";
  };

  // Get first name for placeholders
  const getFirstName = () => {
    return awardeeFirstName || awardeeUsername || "this user";
  };

  // Get category icon
  const getCategoryIcon = (category, size = 18) => {
    const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
    const iconProps = { size, style: { color } };

    const categoryLower = category?.toLowerCase() || "";
    if (categoryLower.includes("collaboration"))
      return <Users {...iconProps} />;
    if (categoryLower.includes("technical")) return <Settings {...iconProps} />;
    if (categoryLower.includes("creative")) return <Lightbulb {...iconProps} />;
    if (categoryLower.includes("leadership")) return <Compass {...iconProps} />;
    if (categoryLower.includes("personal")) return <Heart {...iconProps} />;
    return <Award {...iconProps} />;
  };

  // Get badge icon based on name
  const getBadgeIcon = (badgeName, size = 16) => {
    const iconProps = { size, className: "flex-shrink-0" };

    switch (badgeName) {
      case "Team Player":
        return <Users {...iconProps} />;
      case "Mediator":
        return <Scale {...iconProps} />;
      case "Communicator":
        return <MessageCircle {...iconProps} />;
      case "Motivator":
        return <Flame {...iconProps} />;
      case "Organizer":
        return <ClipboardList {...iconProps} />;
      case "Reliable":
        return <Anchor {...iconProps} />;
      case "Coder":
        return <Code {...iconProps} />;
      case "Designer":
        return <Palette {...iconProps} />;
      case "Data Whiz":
        return <BarChart2 {...iconProps} />;
      case "Tech Support":
        return <Wrench {...iconProps} />;
      case "Systems Thinker":
        return <Network {...iconProps} />;
      case "Documentation Master":
        return <FileText {...iconProps} />;
      case "Innovator":
        return <Lightbulb {...iconProps} />;
      case "Problem Solver":
        return <Key {...iconProps} />;
      case "Visionary":
        return <Telescope {...iconProps} />;
      case "Storyteller":
        return <BookOpen {...iconProps} />;
      case "Artisan":
        return <Paintbrush {...iconProps} />;
      case "Outside-the-Box":
        return <PackageOpen {...iconProps} />;
      case "Decision Maker":
        return <Compass {...iconProps} />;
      case "Mentor":
        return <GraduationCap {...iconProps} />;
      case "Initiative Taker":
        return <Flag {...iconProps} />;
      case "Delegator":
        return <UserPlus {...iconProps} />;
      case "Strategic Planner":
        return <Map {...iconProps} />;
      case "Feedback Provider":
        return <MessageSquare {...iconProps} />;
      case "Quick Learner":
        return <Zap {...iconProps} />;
      case "Empathetic":
        return <Heart {...iconProps} />;
      case "Persistent":
        return <Mountain {...iconProps} />;
      case "Detail-Oriented":
        return <SearchIcon {...iconProps} />;
      case "Adaptable":
        return <Shuffle {...iconProps} />;
      case "Knowledge Sharer":
        return <Share2 {...iconProps} />;
      default:
        return <Award {...iconProps} />;
    }
  };

  // Fetch all badges on open
  useEffect(() => {
    const fetchBadges = async () => {
      if (!isOpen) return;

      try {
        setLoading(true);
        setError(null);

        const response = await badgeService.getAllBadges();
        const badgeData = response?.data || [];
        setBadges(badgeData);
      } catch (err) {
        console.error("Error fetching badges:", err);
        setError("Failed to load badges. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [isOpen]);

  // Fetch shared teams when modal opens
  useEffect(() => {
    const fetchSharedTeams = async () => {
      if (!isOpen || !awardeeId) return;

      try {
        setTeamsLoading(true);
        const response = await badgeService.getSharedTeams(awardeeId);
        setSharedTeams(response?.data || []);
      } catch (err) {
        console.error("Error fetching shared teams:", err);
        setSharedTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchSharedTeams();
  }, [isOpen, awardeeId]);

  // Fetch awardee's tags when modal opens
  useEffect(() => {
    const fetchAwardeeTags = async () => {
      if (!isOpen || !awardeeId) return;

      try {
        setTagsLoading(true);
        const response = await userService.getUserTags(awardeeId);
        const tags = response?.data || [];
        setAwardeeTags(tags);
      } catch (err) {
        console.error("Error fetching awardee tags:", err);
        setAwardeeTags([]);
      } finally {
        setTagsLoading(false);
      }
    };

    fetchAwardeeTags();
  }, [isOpen, awardeeId]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setExpandedCategory(null);
      setSelectedBadge(null);
      setCredits(2);
      setContextType("personal");
      setSelectedTeamId(null);
      setSelectedTag(null);
      setReason("");
      setError(null);
      setSuccess(null);
      setTagSearchQuery("");
      setTagSearchResults([]);
      setShowTagSearch(false);
    }
  }, [isOpen]);

  // Reset team selection when switching away from "team" context
  useEffect(() => {
    if (contextType !== "team") {
      setSelectedTeamId(null);
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

  // Group badges by category
  const badgesByCategory = badges.reduce((acc, badge) => {
    const cat = badge.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {});

  // Category order
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
      setError("Please select a badge");
      return;
    }

    if (contextType === "team" && !selectedTeamId) {
      setError("Please select a team for the teamwork context");
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
      });

      setSuccess(
        `${selectedBadge.name} badge awarded to ${getDisplayName()} (+${credits} ct.)!`,
      );

      // Notify parent to refresh badge data
      if (onAwardComplete) {
        onAwardComplete();
      }

      // Close after a brief delay
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error("Error awarding badge:", err);
      setError(
        err.response?.data?.message ||
          "Failed to award badge. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  // ============ Render ============

  const customHeader = (
    <div className="flex items-center gap-3">
      <Award className="text-primary" size={24} />
      <div>
        <h2 className="text-xl font-medium text-primary">
          Award Badge to {getDisplayName()}
        </h2>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="errorOutline" onClick={onClose} disabled={sending}>
        Cancel
      </Button>
      <Button
        variant="successOutline"
        onClick={handleSubmit}
        disabled={!selectedBadge || sending || !!success}
        icon={<Send size={16} />}
      >
        {sending ? "Awarding..." : "Award Badge"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      customHeader={customHeader}
      footer={!success ? footer : undefined}
      size="md"
    >
      <div className="space-y-4">
        {/* Success message */}
        {success && (
          <Alert type="success" className="text-center">
            {success}
          </Alert>
        )}

        {/* Error message */}
        {error && <Alert type="error">{error}</Alert>}

        {/* Awardee info */}
        {!success && (
          <div className="flex items-center gap-3 px-3 py-2 bg-base-200/50 rounded-lg">
            {awardeeAvatar ? (
              <img
                src={awardeeAvatar}
                alt={getDisplayName()}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                {getUserInitials({
                  first_name: awardeeFirstName,
                  last_name: awardeeLastName,
                  username: awardeeUsername,
                })}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{getDisplayName()}</p>
              {awardeeUsername && (
                <p className="text-xs text-base-content/60">
                  @{awardeeUsername}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Badge selection */}
        {!success && (
          <div>
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <Award size={12} className="text-primary mr-1" />
              Select a badge:
            </p>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="loading loading-spinner loading-md text-primary"></div>
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="text-center py-6 bg-base-200/30 rounded-lg border border-base-300">
                <Award className="mx-auto mb-2 text-warning" size={28} />
                <p className="text-sm text-base-content/70">
                  No badges available.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sortedCategories.map((category) => {
                  const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
                  const pastel = CATEGORY_PASTELS[category] || "#F3F4F6";
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
                        style={isExpanded ? { backgroundColor: pastel } : {}}
                      >
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span
                            className="font-medium text-sm"
                            style={{ color }}
                          >
                            {category}
                          </span>
                          {hasSelectedBadge && !isExpanded && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: color }}
                            >
                              {selectedBadge.name}
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
                                  isSelected ? { ringColor: color } : undefined
                                }
                              >
                                <span style={{ color }}>
                                  {getBadgeIcon(badge.name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="text-sm font-medium truncate"
                                    style={isSelected ? { color } : {}}
                                  >
                                    {badge.name}
                                  </p>
                                  <p className="text-xs text-base-content/60 line-clamp-1">
                                    {badge.description}
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
          <div>
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <Star size={12} className="text-primary mr-1" />
              Credit points for this award:
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
                    className={`flex-1 py-3 rounded-xl text-center font-medium transition-all duration-200 border-2 ${
                      isSelected
                        ? "text-white shadow-md"
                        : "bg-base-100 text-base-content/70 border-base-200 hover:border-base-300"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: badgeColor,
                            borderColor: badgeColor,
                          }
                        : {}
                    }
                  >
                    <span className="text-lg">{value}</span>
                    <span className="text-xs block mt-0.5">
                      {value === 1 ? "credit" : "credits"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Context type selection */}
        {selectedBadge && !success && (
          <div>
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <Briefcase size={12} className="text-primary mr-1" />
              What is this for?
            </p>
            <div className="flex gap-2">
              {CONTEXT_OPTIONS.map((option) => {
                const isSelected = contextType === option.value;
                const IconComponent = option.icon;
                const isDisabled =
                  option.value === "team" && sharedTeams.length === 0;

                return (
                  <button
                    key={option.value}
                    onClick={() => !isDisabled && setContextType(option.value)}
                    disabled={isDisabled}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : isDisabled
                          ? "bg-base-100 text-base-content/30 border-base-200 cursor-not-allowed"
                          : "bg-base-100 text-base-content/70 border-base-200 hover:border-base-300"
                    }`}
                    title={
                      isDisabled
                        ? "No shared teams with this user"
                        : option.description
                    }
                  >
                    <IconComponent size={14} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Team dropdown */}
            {contextType === "team" && (
              <div className="mt-2">
                {teamsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-base-content/50 py-2">
                    <div className="loading loading-spinner loading-xs"></div>
                    Loading teams...
                  </div>
                ) : sharedTeams.length === 0 ? (
                  <p className="text-xs text-base-content/50 py-1">
                    No shared teams found.
                  </p>
                ) : (
                  <select
                    value={selectedTeamId || ""}
                    onChange={(e) =>
                      setSelectedTeamId(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="select select-bordered select-sm w-full text-sm"
                  >
                    <option value="">Select a team...</option>
                    {sharedTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                        {team.city ? ` (${team.city})` : ""}
                        {team.is_remote ? " (Remote)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Focus area / tag selector */}
        {selectedBadge && !success && (
          <div>
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <Tag size={12} className="text-primary mr-1" />
              Focus area (optional):
            </p>

            {/* Selected tag display */}
            {selectedTag && (
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  <Tag size={12} />
                  {selectedTag.name}
                  {selectedTag.category && (
                    <span className="text-xs text-primary/60">
                      · {selectedTag.category}
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="ml-1 hover:text-primary/80 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              </div>
            )}

            {/* Tag pills - awardee's tags */}
            {!selectedTag && (
              <div>
                {tagsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-base-content/50 py-1">
                    <div className="loading loading-spinner loading-xs"></div>
                    Loading tags...
                  </div>
                ) : awardeeTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {awardeeTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagSelect(tag)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-base-200 hover:bg-base-300 text-base-content/70 hover:text-base-content transition-colors"
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-base-content/40 mb-2">
                    {getFirstName()} hasn't added focus areas yet.
                  </p>
                )}

                {/* Search for any tag */}
                <div className="relative" ref={tagSearchRef}>
                  <button
                    onClick={() => setShowTagSearch(!showTagSearch)}
                    className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <SearchIcon size={12} />
                    {awardeeTags.length > 0
                      ? "Search for a different tag..."
                      : "Search for a tag..."}
                  </button>

                  {showTagSearch && (
                    <div className="mt-1.5">
                      <input
                        type="text"
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        placeholder="Type to search tags..."
                        className="input input-bordered input-sm w-full text-sm"
                        autoFocus
                      />

                      {/* Search results dropdown */}
                      {(tagSearchResults.length > 0 || tagSearching) && (
                        <div className="mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                          {tagSearching ? (
                            <div className="flex items-center gap-2 text-sm text-base-content/50 p-3">
                              <div className="loading loading-spinner loading-xs"></div>
                              Searching...
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
                            No tags found for "{tagSearchQuery}"
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
              Add a comment (optional):
            </p>
            <div className="relative">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Why are you awarding ${getFirstName()} the ${selectedBadge.name} badge?`}
                className="textarea textarea-bordered w-full h-20 resize-none text-sm pb-6"
                maxLength={300}
              />
              <span className="absolute bottom-2 left-3 text-xs text-base-content/40 pointer-events-none">
                {reason.length}/300 characters
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BadgeAwardModal;
