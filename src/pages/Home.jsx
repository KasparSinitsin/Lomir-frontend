import React, { useState } from "react";
import {
  ArrowRight,
  Award,
  MapPin,
  MessageCircle,
  Percent,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import Section from "../components/layout/Section";
import InfoCard from "../components/common/InfoCard";
import CreateTeamModal from "../components/teams/CreateTeamModal";
import { useAuth } from "../contexts/AuthContext";
import lomirWordmark from "../assets/images/Lomir-logowordmark-color.svg";

/**
 * Screenshots live in `public/screenshots/` so they can be added or replaced
 * without touching the bundle. Until a file exists the frame falls back to a
 * labelled placeholder instead of a broken image.
 */
/**
 * Opens the search page on its Open Roles view.
 *
 * Demo data is deliberately left in: there are only a handful of real open
 * roles right now, and filtering the fixtures out leaves the page looking
 * emptier than the app is. SearchPage also accepts `includeDemoData=false`
 * here once there are enough real roles to stand on their own.
 */
const OPEN_ROLES_SEARCH_PATH = "/search?type=roles";

const SCREENSHOTS = {
  search: "/screenshots/search-map.png",
  roles: "/screenshots/team-roles.png",
  chat: "/screenshots/team-chat.png",
};

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
          className="w-full aspect-[16/10] object-cover object-top"
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

  const handleTeamCreated = () => undefined;

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="background-opacity rounded-xl shadow-soft overflow-hidden">
        <div className="text-center py-16 px-6">
          <img
            src={lomirWordmark}
            alt="Lomir"
            className="h-10 sm:h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-primary mb-4 max-w-2xl mx-auto text-balance">
            Find the people your project is missing.
          </h1>
          <p className="text-lg font-light text-base-content/80 mb-8 max-w-xl mx-auto">
            Lomir matches you with collaborators nearby or worldwide — by shared
            focus areas, skills other people vouched for, and how far you are
            willing to go.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="btn btn-primary">
                  Create your free profile
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/search?type=teams"
                  className="btn btn-outline btn-primary"
                >
                  <Search className="w-4 h-4" />
                  Explore teams
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
              No account needed to browse public teams and profiles.
            </p>
          )}
        </div>

        <div className="px-4 sm:px-8 pb-8 -mt-2">
          <ScreenshotFrame
            src={SCREENSHOTS.search}
            alt="Team search with map view and match scores"
            caption="Search — teams near you"
            icon={<MapPin className="w-8 h-8" />}
            className="max-w-3xl mx-auto"
          />
        </div>
      </div>

      {/* How it works */}
      <Section spacing="">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-primary">How Lomir works</h2>
          <p className="text-base-content/70 text-sm mt-1">
            Three steps from an empty profile to a working team.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-8 sm:gap-4">
          <Step
            number="1"
            icon={<Sparkles className="w-5 h-5" />}
            title="Describe what you are into"
          >
            Pick focus areas and skills, set your location and how far you want
            to collaborate. Your profile stays private until you publish it.
          </Step>
          <Step
            number="2"
            icon={<Percent className="w-5 h-5" />}
            title="See who actually fits"
          >
            Every result carries a match score you can open up — shared focus
            areas, confirmed skills, and distance, each weighted and shown
            separately.
          </Step>
          <Step
            number="3"
            icon={<Users className="w-5 h-5" />}
            title="Team up and get going"
          >
            Join a team through an open role, or start your own and invite the
            people you found. Chat comes built in.
          </Step>
        </div>
      </Section>

      {/* Open roles */}
      <Section spacing="">
        <div className="flex flex-col-reverse md:flex-row items-center gap-8">
          <div className="md:w-1/2">
            <h2 className="text-xl font-medium text-primary mb-2">
              Open roles, not vague calls for help
            </h2>
            <p className="text-base-content/80 mb-4">
              Teams publish the roles they still need to fill, with the skills
              attached. You can see at a glance where you would fit, apply
              directly, and follow what happens to your application — instead of
              writing into the void.
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
            alt="A team with its open roles and members"
            caption="Team — open roles"
            icon={<UserPlus className="w-8 h-8" />}
            className="md:w-1/2"
          />
        </div>
      </Section>

      {/* Chat */}
      <Section spacing="">
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
              Team and direct chat with mentions, replies, reactions, files, and
              read receipts. Invitations, applications, and role changes appear
              in the same thread, so a new member can read back and understand
              how the team got here.
            </p>
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
        <div className="rounded-xl border border-base-200 bg-base-100 shadow-soft px-6 py-10 text-center">
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
                  Create your free profile
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/privacy" className="btn btn-outline btn-primary">
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
                <Link
                  to="/teams/my-teams"
                  className="btn btn-outline btn-primary"
                >
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
    </div>
  );
};

export default Home;
