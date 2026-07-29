import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Award,
  MapPin,
  MessageCircle,
  Percent,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import Section from "../components/layout/Section";
import InfoCard from "../components/common/InfoCard";
import CreateTeamModal from "../components/teams/CreateTeamModal";
import { useAuth } from "../contexts/AuthContext";
import lomirWordmark from "../assets/images/Lomir-logowordmark-color.svg";

/**
 * Opens the search page on its Open Roles view.
 *
 * Demo data is deliberately left in: there are only a handful of real open
 * roles right now, and filtering the fixtures out leaves the page looking
 * emptier than the app is. SearchPage also accepts `includeDemoData=false`
 * here once there are enough real roles to stand on their own.
 */
const OPEN_ROLES_SEARCH_PATH = "/search?type=roles";

/**
 * Screenshots live in `public/screenshots/` so they can be added or replaced
 * without touching the bundle. Until a file exists the frame falls back to a
 * labelled placeholder instead of a broken image.
 */
const SCREENSHOTS = {
  // JPEG for the map: it is a photographic tile image where PNG cost 1 MB and
  // JPEG costs 288 KB for no visible difference. The other two are flat UI,
  // which PNG stores efficiently.
  search: "/screenshots/search-map.jpg",
  roles: "/screenshots/team-roles.png",
  chat: "/screenshots/team-chat.png",
};

/**
 * The three detail modals layered over the hero map.
 *
 * The role modal sits directly below the map popup and slightly to its left, so
 * the link between the selected pin and the detail view is visible. The other
 * two cascade off to the right, the team one breaking out of the panel on the
 * right as the role one does on the left.
 *
 * Role and user share the same `top` rather than a `bottom` offset, and that is
 * what keeps their upper edges flush: the images have different heights, so
 * equal bottom offsets would stagger the tops. The team modal is deliberately
 * set much higher, since a near-match at the lower edge read as a mistake.
 */
const HERO_MODAL_SHOTS = [
  {
    src: "/screenshots/modal-role.png",
    alt: "Details of the open role selected on the map",
    position: "hidden lg:block left-[calc(-7%_-_15px)] top-[60%] w-[30%] z-[3]",
    captionTitle: "Open roles",
    caption:
      "An open role spells out what a team is still missing: the focus areas and badges they are hoping for, and how far away you may be based. Applying puts you forward for that one role rather than for the team in general, and you can follow what happens to your application.",
  },
  {
    src: "/screenshots/modal-user.png",
    alt: "Profile details for a person found through search",
    position: "hidden lg:block left-[52%] top-[60%] w-[30%] z-[2]",
    captionTitle: "People",
    caption:
      "A profile gathers what someone is into: their focus areas and the badges other members awarded them for work they actually did together. From here you can start a chat, invite them into one of your teams, award them a badge yourself, or block them if you would rather not be contacted.",
  },
  {
    src: "/screenshots/modal-team.png",
    alt: "Team details with focus areas, badges and members",
    position:
      "hidden lg:block right-[calc(-7%_-_15px)] top-[33%] w-[30%] z-[1]",
    captionTitle: "Teams",
    caption:
      "A team page shows what the group is about, where it meets and who belongs to it, together with the focus areas and badges its members bring. If the team still has space, you can apply to join straight from here.",
  },
];

/**
 * Full-size view of one screenshot.
 *
 * Kept separate from the shared `Modal` on purpose. That component always draws
 * a header, and its box clips overflow, so a close control sitting outside the
 * frame is not expressible through it — and widening the shared component for
 * one decorative case would touch every real modal in the app. Backdrop,
 * centering, ESC and portal behaviour mirror it exactly.
 *
 * The close control sits beside the frame. The wrapper carries a wider margin
 * from sm up so there is room for it, and the triggers only exist from lg up,
 * where the viewport is far wider than the frame.
 *
 * These captures are portrait and differ a lot in height — the team one is 534
 * by 783, which at full width would stand taller than most windows. The image
 * is therefore capped at 68vh and scaled down to fit, leaving room for the
 * caption below it, so image, text and close control are visible together. The
 * overlay scrolls as well, which only comes into play on very short windows.
 */
const ScreenshotLightbox = ({ shot, onClose }) => {
  useEffect(() => {
    if (!shot) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shot, onClose]);

  if (!shot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[50] overflow-y-auto bg-black/50"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center py-8">
        {/* w-fit so the wrapper hugs the image once it is scaled down to fit
            the viewport, which keeps the close control beside its actual edge
            rather than beside an empty column. */}
        <div
          className="relative mx-4 sm:mx-16 w-fit max-w-full"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close enlarged screenshot"
            className="absolute -right-11 top-0 text-white/90 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={shot.src}
            alt={shot.alt}
            className="block max-h-[68vh] w-auto max-w-full rounded-xl shadow-2xl"
          />
          {/* w-0 with min-w-full: the caption then stretches to the image width
              without its own text length widening the fit-content wrapper. */}
          <div className="w-0 min-w-full mt-3 rounded-xl bg-base-100 p-4 shadow-2xl">
            <h3 className="text-sm font-medium text-primary mb-1">
              {shot.captionTitle}
            </h3>
            <p className="text-sm text-base-content/80">{shot.caption}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/**
 * A detail modal floating over the hero map, clickable to open it full size.
 *
 * Deliberately a heavier shadow than the map frame behind it: the layering only
 * reads as depth if the front elements lift further off the page. Positioning
 * is passed in per instance, since each one sits in a different spot.
 *
 * A button rather than an image with a click handler, so it is reachable by
 * keyboard and announces itself. Below lg the whole element is display:none,
 * which also takes it out of the tab order.
 */
const FloatingShot = ({ src, alt, onOpen, className = "" }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label={`Enlarge screenshot: ${alt}`}
    className={`absolute overflow-hidden rounded-xl border border-base-200 shadow-2xl ring-1 ring-black/5 transition duration-200 hover:scale-[1.03] hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
  >
    <img src={src} alt={alt} loading="lazy" className="block w-full h-auto" />
  </button>
);

/**
 * Framed screenshot with a labelled placeholder while the file is missing.
 *
 * The image keeps its natural aspect ratio on purpose. Several of these show
 * modals, which are portrait by nature, and cropping them to a fixed landscape
 * ratio cuts away the part that carries the message. Only the placeholder uses
 * a fixed ratio, since it has no content to lose.
 *
 * Frames that sit side by side therefore only line up in height if their
 * captures share a similar aspect ratio. That is handled when taking the
 * screenshot, not here — fitting a mismatched image into a fixed box would
 * leave visible empty margins beside it.
 */
const ScreenshotFrame = ({ src, alt, caption, icon, className = "" }) => {
  const [hasFailed, setHasFailed] = useState(false);

  return (
    <figure
      className={`rounded-xl border border-base-200 bg-base-100 shadow-card overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-base-200 bg-base-200/60">
        <span className="h-2.5 w-2.5 rounded-full bg-base-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-base-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-base-300" />
        <span className="ml-2 text-xs text-base-content/50 truncate">
          {caption}
        </span>
      </div>
      {hasFailed ? (
        <div className="aspect-[16/10] flex flex-col items-center justify-center gap-2 bg-base-200/40 px-4 text-center text-base-content/40">
          {icon}
          <figcaption className="text-xs">{alt}</figcaption>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setHasFailed(true)}
          className="w-full h-auto"
        />
      )}
    </figure>
  );
};

const Step = ({ number, icon, title, children }) => (
  <div className="flex-1 text-center">
    <div className="flex justify-center mb-3">
      <span className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary text-secondary-content">
        {icon}
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-medium">
          {number}
        </span>
      </span>
    </div>
    <h3 className="text-base font-medium text-primary mb-1">{title}</h3>
    <p className="text-sm text-base-content/70">{children}</p>
  </div>
);

const Feature = ({ icon, title, children }) => (
  <InfoCard className="w-full" title={title} icon={icon}>
    <p className="text-sm text-base-content/80 text-center">{children}</p>
  </InfoCard>
);

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  // The screenshot currently shown full size, or null. Reuses the app's own
  // Modal, so the enlarged view behaves exactly like a real detail modal.
  const [enlargedShot, setEnlargedShot] = useState(null);

  const handleTeamCreated = () => undefined;

  return (
    <div className="space-y-16">
      {/* Hero */}
      {/* No overflow-hidden: the role modal deliberately breaks out of the
          panel on the left and bottom. The padding below keeps that overhang
          clear of the next section. */}
      <div className="background-opacity rounded-xl shadow-soft">
        <div className="text-center py-16 px-6">
          <img
            src={lomirWordmark}
            alt="Lomir"
            className="h-10 sm:h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-primary-focus mb-4 max-w-2xl mx-auto text-balance">
            Find the people your project is missing.
          </h1>
          <p className="text-lg font-light text-base-content/80 mb-8 max-w-xl mx-auto">
            Lomir matches you with collaborators nearby or worldwide — <br />
            by shared focus areas, skills other people vouched for, and how far
            you are willing to go.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="btn btn-primary">
                  <User className="w-4 h-4" />
                  Create your free profile
                </Link>
                {/* No type parameter: the search page defaults to All, so the
                    first view mixes people, teams and open roles. */}
                <Link to="/search" className="btn btn-primary">
                  <Search className="w-4 h-4" />
                  Explore public teams &amp; more
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/search?type=teams"
                  className="btn btn-outline btn-primary"
                >
                  <Search className="w-4 h-4" />
                  Browse teams
                </Link>
                <button
                  type="button"
                  onClick={() => setIsCreateTeamModalOpen(true)}
                  className="btn btn-outline btn-primary"
                >
                  <Users className="w-4 h-4" />
                  Create team
                </button>
              </>
            )}
          </div>

          {!isAuthenticated && (
            <p className="text-sm text-base-content/60 mt-4">
              Get a first flavor of Lomir without registering: No account needed
              to browse public teams and profiles.
            </p>
          )}
        </div>

        {/* Map with the detail modals layered over its lower right. The role
            modal is the largest and sits in front, because it shows the very
            role the map popup has selected; the user and team modals are
            scaled down as supporting examples. Below lg the overlay is dropped
            and the map goes full width, since three stacked modals are
            unreadable at phone size. */}
        {/* Horizontal padding matches the p-6 sm:p-8 of the panel further down,
            so both boxes hold their content at the same inset. */}
        <div className="px-6 sm:px-8 pb-8 -mt-2">
          <div className="relative w-full lg:pb-[8%]">
            <ScreenshotFrame
              src={SCREENSHOTS.search}
              alt="Map search showing teams, people and open roles as pins"
              caption="Search — teams, people and open roles"
              icon={<MapPin className="w-8 h-8" />}
              className="w-full"
            />

            {/* Positions and the reasoning behind them: HERO_MODAL_SHOTS. */}
            {HERO_MODAL_SHOTS.map((shot) => (
              <FloatingShot
                key={shot.src}
                src={shot.src}
                alt={shot.alt}
                className={shot.position}
                onOpen={() => setEnlargedShot(shot)}
              />
            ))}
          </div>

          {/* Only from lg, where the modals it refers to actually exist. The
              top margin clears the user modal, the one that now reaches
              furthest down, about 45px below the composition. */}
          <p className="hidden lg:block mt-16 text-center text-sm text-base-content/60">
            These are real screens from the app. Click any of them to see it
            full size, with a note on what the view is for.
          </p>
        </div>
      </div>

      {/* How it works */}
      <Section spacing="">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-primary">
            Find, connect &amp; create
          </h2>
          <p className="text-base-content/70 text-sm mt-1">
            What a free profile adds to looking around.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-8 sm:gap-4">
          <Step
            number="1"
            icon={<Search className="w-5 h-5" />}
            title="Find and be found"
          >
            Search people, teams and open roles nearby or worldwide — and once
            your profile is public, teams looking for your skills find you.
            Every result carries a match score you can open up and check.
          </Step>
          <Step
            number="2"
            icon={<MessageCircle className="w-5 h-5" />}
            title="Connect"
          >
            Message anyone directly, apply for an open role, or accept an
            invitation into a team. Every application and invitation stays
            trackable, so you always know where you stand.
          </Step>
          <Step
            number="3"
            icon={<Sparkles className="w-5 h-5" />}
            title="Create"
          >
            Start your own team, publish the roles you still need to fill, and
            invite the people you found. Afterwards, award badges to those who
            actually showed up for the work.
          </Step>
        </div>
      </Section>

      {/* Open roles + chat, sharing one panel */}
      <Section spacing="">
        <div className="background-opacity rounded-xl shadow-soft p-6 sm:p-8 space-y-12">
          <div className="flex flex-col-reverse md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <h2 className="text-xl font-medium text-primary mb-2">
                Open roles, not vague calls for help
              </h2>
              <p className="text-base-content/80 mb-4">
                Teams publish the roles they still need to fill, with the skills
                attached. You can see at a glance where you would fit, apply
                directly, and follow what happens to your application — instead
                of writing into the void.
              </p>
              <Link
                to={OPEN_ROLES_SEARCH_PATH}
                className="btn btn-outline btn-primary btn-sm"
              >
                Browse open roles
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <ScreenshotFrame
              src={SCREENSHOTS.roles}
              alt="An open role with the skills it asks for and how far it matches your profile"
              caption="Open role — matched to your profile"
              icon={<UserPlus className="w-8 h-8" />}
              className="md:w-1/2"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScreenshotFrame
              src={SCREENSHOTS.chat}
              alt="Team chat with mentions, replies and reactions"
              caption="Chat — team conversation"
              icon={<MessageCircle className="w-8 h-8" />}
              className="md:w-1/2"
            />
            <div className="md:w-1/2">
              <h2 className="text-xl font-medium text-primary mb-2">
                Everything the team says stays in one place
              </h2>
              <p className="text-base-content/80">
                Team and direct chat with mentions, replies, reactions, files,
                and read receipts. Invitations, applications, and role changes
                appear in the same thread, so a new member can read back and
                understand how the team got here.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section spacing="">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-primary">
            What you get on Lomir
          </h2>
          <p className="text-base-content/70 text-sm mt-1">
            Built around finding the right people, not collecting followers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature
            icon={<Percent className="w-8 h-8 text-primary" />}
            title="A match score you can check"
          >
            Shared focus areas count 40 percent, confirmed skills 30, and
            distance 30. Open any match to see the breakdown.
          </Feature>
          <Feature
            icon={<MapPin className="w-8 h-8 text-primary" />}
            title="Search on a map"
          >
            Browse teams and people as pins around you, or search worldwide when
            location does not matter.
          </Feature>
          <Feature
            icon={<Award className="w-8 h-8 text-primary" />}
            title="Badges from real collaborators"
          >
            Skills are confirmed by the people you actually worked with, across
            categories like technical, creative, and collaboration.
          </Feature>
          <Feature
            icon={<UserPlus className="w-8 h-8 text-primary" />}
            title="Roles that say what is needed"
          >
            Teams name their open roles and required skills, so applying is a
            concrete step rather than a guess.
          </Feature>
          <Feature
            icon={<MessageCircle className="w-8 h-8 text-primary" />}
            title="Chat built for teams"
          >
            Mentions, replies, reactions, file sharing, and notifications for
            what actually concerns you.
          </Feature>
          <Feature
            icon={<ShieldCheck className="w-8 h-8 text-primary" />}
            title="Private by default"
          >
            New profiles are invisible in public search until you decide
            otherwise. You choose what each field reveals.
          </Feature>
        </div>
      </Section>

      {/* Trust + closing CTA */}
      <Section spacing="">
        <div className="px-6 py-10 text-center">
          <h2 className="text-xl font-medium text-primary mb-2">
            {isAuthenticated
              ? "Find your next team"
              : "Free, and private by default"}
          </h2>
          <p className="text-base-content/80 max-w-xl mx-auto mb-6">
            {isAuthenticated
              ? "Browse the teams looking for people right now, or start your own and invite the people you find."
              : "Lomir is a free, non-commercial project operated from Germany under the GDPR. No ads, no tracking, no selling your data — and the source code is public."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="btn btn-primary">
                  <User className="w-4 h-4" />
                  Create your free profile
                </Link>
                <Link to="/privacy" className="btn btn-primary">
                  <ShieldCheck className="w-4 h-4" />
                  Read the privacy policy
                </Link>
              </>
            ) : (
              <>
                <Link to="/search?type=teams" className="btn btn-primary">
                  <Search className="w-4 h-4" />
                  Browse teams
                </Link>
                <Link to="/teams/my-teams" className="btn btn-primary">
                  <Users className="w-4 h-4" />
                  My teams
                </Link>
              </>
            )}
          </div>
        </div>
      </Section>

      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onTeamCreated={handleTeamCreated}
      />

      {/* max-w-2xl matches the native width of these captures, so the enlarged
          view stays sharp rather than being upscaled. */}
      <ScreenshotLightbox
        shot={enlargedShot}
        onClose={() => setEnlargedShot(null)}
      />
    </div>
  );
};

export default Home;
