/**
 * badgeIconUtils.jsx
 *
 * Single source of truth for all badge, category, and supercategory
 * icon rendering functions. Previously duplicated across 7+ components.
 *
 * Returns React elements (JSX), so this must be a .jsx file.
 */
import {
  // Category icons
  Award,
  Users,
  Settings,
  Lightbulb,
  Compass,
  Heart,
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
  // Supercategory icons
  Monitor,
  Briefcase,
  HeartHandshake,
  Dumbbell,
  Leaf,
  Globe,
  Scissors,
  Gamepad2,
  PawPrint,
  Plane,
  Layers,
} from "lucide-react";
import { FOCUS_GREEN } from "../constants/badgeConstants";

// ═══════════════════════════════════════════════════════════
// BADGE CATEGORY ICONS
// ═══════════════════════════════════════════════════════════

/**
 * Returns the icon element for a badge category.
 *
 * @param {string} category - Category name (e.g. "Collaboration Skills")
 * @param {string} color - Hex color for the icon
 * @param {number} [size=16] - Icon size in px
 * @returns {React.ReactElement}
 */
export const getCategoryIcon = (category, color, size = 16) => {
  const iconProps = { size, style: { color } };
  const categoryLower = category?.toLowerCase() || "";

  if (categoryLower.includes("collaboration")) return <Users {...iconProps} />;
  if (categoryLower.includes("technical")) return <Settings {...iconProps} />;
  if (categoryLower.includes("creative")) return <Lightbulb {...iconProps} />;
  if (categoryLower.includes("leadership")) return <Compass {...iconProps} />;
  if (categoryLower.includes("personal")) return <Heart {...iconProps} />;

  return <Award {...iconProps} />;
};

// ═══════════════════════════════════════════════════════════
// INDIVIDUAL BADGE ICONS
// ═══════════════════════════════════════════════════════════

/**
 * Returns the icon element for an individual badge by name.
 *
 * @param {string} badgeName - Badge name (e.g. "Team Player")
 * @param {string} color - Hex color for the icon
 * @param {number} [size=16] - Icon size in px
 * @returns {React.ReactElement}
 */
export const getBadgeIcon = (badgeName, color, size = 16) => {
  const iconProps = { size, style: { color } };

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

// ═══════════════════════════════════════════════════════════
// SUPERCATEGORY ICONS
// ═══════════════════════════════════════════════════════════

/** Map of supercategory names to lucide-react icon components */
export const SUPERCATEGORY_ICONS = {
  "Technology & Development": Monitor,
  "Business & Entrepreneurship": Briefcase,
  "Creative Arts & Design": Palette,
  "Learning, Knowledge & Personal Growth": GraduationCap,
  "Social, Community & Volunteering": HeartHandshake,
  "Sports & Fitness": Dumbbell,
  "Outdoor & Adventure": Mountain,
  "Wellness & Lifestyle": Leaf,
  Languages: Globe,
  "Hobbies & Crafts": Scissors,
  Leisure: Gamepad2,
  Pets: PawPrint,
  Travels: Plane,
};

/**
 * Returns the icon element for a supercategory.
 *
 * @param {string} supercategory - Supercategory name
 * @param {number} [size=20] - Icon size in px
 * @param {string} [color] - Override color (defaults to FOCUS_GREEN)
 * @returns {React.ReactElement}
 */
export const getSupercategoryIcon = (supercategory, size = 20, color) => {
  const IconComponent = SUPERCATEGORY_ICONS[supercategory] || Layers;
  return (
    <IconComponent
      size={size}
      style={{ color: color || FOCUS_GREEN }}
      className="flex-shrink-0"
    />
  );
};