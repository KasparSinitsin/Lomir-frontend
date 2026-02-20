import React, { useState, useEffect } from "react";
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
  Search,
  Shuffle,
  Share2,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import { badgeService } from "../../services/badgeService";
import { getUserInitials } from "../../utils/userHelpers";

/**
 * BadgeAwardModal Component
 *
 * Modal for awarding a badge to a user. Allows selecting a category,
 * then a badge within that category, choosing credit points (1-3),
 * and adding an optional comment.
 *
 * Visually consistent with TeamInviteModal and BadgeCategoryModal.
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
  const [credits, setCredits] = useState(2); // Default to 2
  const [reason, setReason] = useState("");

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
      // Collaboration Skills
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
      // Technical Expertise
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
      // Creative Thinking
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
      // Leadership Qualities
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
      // Personal Attributes
      case "Quick Learner":
        return <Zap {...iconProps} />;
      case "Empathetic":
        return <Heart {...iconProps} />;
      case "Persistent":
        return <Mountain {...iconProps} />;
      case "Detail-Oriented":
        return <Search {...iconProps} />;
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

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setExpandedCategory(null);
      setSelectedBadge(null);
      setCredits(2);
      setReason("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

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
      setSelectedBadge(null); // Deselect
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

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedBadge) {
      setError("Please select a badge");
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
        contextType: "profile",
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
      title={customHeader}
      footer={footer}
      position="center"
      size="default"
      maxHeight="max-h-[90vh]"
      closeOnBackdrop={!sending}
      closeOnEscape={!sending}
    >
      <div className="space-y-4">
        {/* Alerts */}
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}
        {success && <Alert type="success" message={success} />}

        {/* Awardee info */}
        <div className="flex items-center gap-3 mb-1">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="w-full h-full rounded-full bg-primary/10 items-center justify-center"
              style={{
                backgroundImage: awardeeAvatar
                  ? `url(${awardeeAvatar})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: awardeeAvatar ? "block" : "flex",
              }}
            >
              {!awardeeAvatar && (
                <span className="text-sm font-medium flex items-center justify-center w-full h-full">
                  {getUserInitials({
                    first_name: awardeeFirstName,
                    last_name: awardeeLastName,
                    username: awardeeUsername,
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-base-content leading-[120%] mb-[0.2em]">
              {getDisplayName()}
            </h4>
            {awardeeUsername && (
              <p className="text-sm text-base-content/70">@{awardeeUsername}</p>
            )}
          </div>
        </div>

        {/* Badge selection */}
        <div>
          <p className="text-xs text-base-content/60 mb-2 flex items-center">
            <Award size={12} className="text-primary mr-1" />
            Select a badge to award:
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
                    {/* Category header - clickable to expand */}
                    <button
                      onClick={() => handleCategoryToggle(category)}
                      className="w-full flex items-center justify-between p-3 hover:bg-base-200/30 transition-colors"
                      style={isExpanded ? { backgroundColor: pastel } : {}}
                    >
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <span className="font-medium text-sm" style={{ color }}>
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
                        <ChevronUp size={16} className="text-base-content/50" />
                      ) : (
                        <ChevronDown
                          size={16}
                          className="text-base-content/50"
                        />
                      )}
                    </button>

                    {/* Badge list within category */}
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

        {/* Credit points selection */}
        {selectedBadge && (
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
                      {value === 1
                        ? "credit"
                        : value === 2
                          ? "credits"
                          : "credits"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Reason / comment */}
        {selectedBadge && (
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
