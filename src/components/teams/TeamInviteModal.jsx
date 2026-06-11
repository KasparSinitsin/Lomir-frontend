import React, { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from "react";
import {
  Users,
  Send,
  UserPlus,
  AlertCircle,
  SendHorizontal,
  Mail,
  Check,
  UserSearch,
  MapPin,
  Globe,
  FlaskConical,
  ChevronRight,
  ChevronUp,
  Calendar,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import ScreenAlert from "../common/ScreenAlert";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import RoleBadgePill from "../common/RoleBadgePill";
import Tooltip from "../common/Tooltip";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import UserAvatar from "../users/UserAvatar";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import TeamInvitesModal from "../teams/TeamInvitesModal";
import TeamApplicationsModal from "../teams/TeamApplicationsModal";
import VacantRoleDetailsModal from "./VacantRoleDetailsModal";
import {
  DEMO_PROFILE_TOOLTIP,
  DEMO_ROLE_TOOLTIP,
  DEMO_TEAM_TOOLTIP,
  isSyntheticUser,
  isSyntheticRole,
  isSyntheticTeam,
} from "../../utils/userHelpers";
import { teamService } from "../../services/teamService";
import { vacantRoleService } from "../../services/vacantRoleService";
import useSocketEvents from "../../hooks/useSocketEvents";
import {
  isExistingMemberStatus,
  isPrivateProfileUser,
  normalizeBoolean,
  normalizeNumericId,
  numericIdsMatch,
} from "../../utils/teamRequestUtils";
import { format } from "date-fns";

const normalizeId = normalizeNumericId;
const idsMatch = numericIdsMatch;

const isInviteeExistingTeamMember = (team, inviteeId) => {
  if (!team || inviteeId === null || inviteeId === undefined) return false;

  const directFlags = [
    team?.isInviteeMember,
    team?.is_invitee_member,
    team?.inviteeIsMember,
    team?.invitee_is_member,
    team?.alreadyMember,
    team?.already_member,
    team?.isExistingMember,
    team?.is_existing_member,
    team?.existingMember,
    team?.existing_member,
  ];

  if (directFlags.some((flag) => normalizeBoolean(flag) === true)) {
    return true;
  }

  const membershipStatuses = [
    team?.inviteeMembershipStatus,
    team?.invitee_membership_status,
    team?.membershipStatus,
    team?.membership_status,
    team?.inviteeStatus,
    team?.invitee_status,
  ];

  if (membershipStatuses.some(isExistingMemberStatus)) {
    return true;
  }

  if (idsMatch(team?.owner_id ?? team?.ownerId, inviteeId)) {
    return true;
  }

  const memberCollections = [
    team?.members,
    team?.teamMembers,
    team?.team_members,
  ].filter(Array.isArray);

  if (
    memberCollections.some((members) =>
      members.some((member) =>
        idsMatch(
          member?.userId ??
            member?.user_id ??
            member?.memberId ??
            member?.member_id ??
            member?.id,
          inviteeId,
        ),
      ),
    )
  ) {
    return true;
  }

  const memberIdLists = [
    team?.memberIds,
    team?.member_ids,
    team?.memberUserIds,
    team?.member_user_ids,
    team?.teamMemberIds,
    team?.team_member_ids,
  ].filter(Array.isArray);

  return memberIdLists.some((memberIds) =>
    memberIds.some((memberId) => idsMatch(memberId, inviteeId)),
  );
};

const getRoleFilledById = (role) =>
  role?.filledByUser?.id ??
  role?.filled_by_user?.id ??
  role?.filledByUserId ??
  role?.filled_by_user_id ??
  role?.filledBy ??
  role?.filled_by ??
  null;

const isRoleFilledByInvitee = (role, inviteeId) => {
  if (!role || inviteeId === null || inviteeId === undefined) return false;

  const filledById = getRoleFilledById(role);
  return filledById !== null && filledById !== undefined && idsMatch(filledById, inviteeId);
};

const hasInviteeFilledRole = (team, inviteeId) => {
  if (!team || inviteeId === null || inviteeId === undefined) return false;

  const directFlags = [
    team?.inviteeHasFilledRole,
    team?.invitee_has_filled_role,
    team?.hasInviteeFilledRole,
    team?.has_invitee_filled_role,
    team?.inviteeHasRole,
    team?.invitee_has_role,
  ];

  if (directFlags.some((flag) => normalizeBoolean(flag) === true)) {
    return true;
  }

  const roleCollections = [
    team?.roles,
    team?.teamRoles,
    team?.team_roles,
    team?.vacantRoles,
    team?.vacant_roles,
  ].filter(Array.isArray);

  return roleCollections.some((roles) =>
    roles.some((role) => isRoleFilledByInvitee(role, inviteeId)),
  );
};

const isInviteModalDemoTeam = (team) => {
  if (!team) return false;

  return (
    isSyntheticTeam(team) ||
    [
      team?.team_is_synthetic,
      team?.teamIsSynthetic,
      team?.is_demo,
      team?.isDemo,
      team?.team_is_demo,
      team?.teamIsDemo,
    ].some((flag) => normalizeBoolean(flag) === true)
  );
};

const unwrapTeamPayload = (payload) => {
  if (!payload || typeof payload !== "object") return null;

  const nestedData = payload.data;
  if (nestedData && typeof nestedData === "object" && !Array.isArray(nestedData)) {
    return nestedData;
  }

  return payload;
};

/**
 * TeamInviteModal Component
 *
 * Modal for inviting a user to join one of the current user's teams.
 * Displays invitee information and allows team selection with optional message.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {string|number} inviteeId - ID of the user being invited
 * @param {string} inviteeName - Display name (deprecated, use firstName/lastName)
 * @param {string} inviteeFirstName - First name of the invitee
 * @param {string} inviteeLastName - Last name of the invitee
 * @param {string} inviteeUsername - Username of the invitee
 * @param {string} inviteeAvatar - Avatar URL of the invitee
 * @param {string} inviteeBio - Bio/description of the invitee
 * @param {boolean|string|number} inviteeIsSynthetic - Whether the invitee is demo data
 * @param {boolean|string|number} inviteeIsPublic - Whether the invitee profile is public
 * @param {boolean|string|number} inviteeIsPrivate - Whether the invitee profile is private
 * @param {string|number|null} prefillTeamId - Team ID to preselect when available
 * @param {string|number|null} prefillRoleId - Vacant role ID to preselect when available
 * @param {string|null} prefillTeamName - Team name for prefill context
 * @param {string|null} prefillRoleName - Role name for prefill context
 */
const TeamInviteModal = ({
  isOpen,
  onClose,
  inviteeId,
  inviteeName,
  inviteeFirstName,
  inviteeLastName,
  inviteeUsername,
  inviteeAvatar,
  inviteeBio,
  inviteeIsSynthetic = false,
  inviteeIsPublic,
  inviteeIsPrivate,
  inviteeCity = null,
  inviteeCountry = null,
  inviteeJoinedAt = null,
  prefillTeamId = null,
  prefillRoleId = null,
  prefillTeamName = null,
  prefillRoleName = null,
}) => {
  const normalizedPrefillTeamId = normalizeId(prefillTeamId);
  const normalizedPrefillRoleId = normalizeId(prefillRoleId);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [isTeamSectionExpanded, setIsTeamSectionExpanded] = useState(true);
  const [vacantRoles, setVacantRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [isRoleSectionExpanded, setIsRoleSectionExpanded] = useState(false);
  const [isMessageSectionExpanded, setIsMessageSectionExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Team details modal state
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);
  const [selectedRoleForDetails, setSelectedRoleForDetails] = useState(null);

  // Store invitation/application/member data per team.
  // { teamId: { hasInviteForUser: bool, hasApplicationFromUser: bool, isExistingMember: bool, allInvitations: [], allApplications: [] } }
  const [teamStatusData, setTeamStatusData] = useState({});

  // Invites and Applications modal state
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false);
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);
  const [selectedTeamForModal, setSelectedTeamForModal] = useState(null);
  const [selectedTeamInvitations, setSelectedTeamInvitations] = useState([]);
  const [selectedTeamApplications, setSelectedTeamApplications] = useState([]);
  const nameContainerRef = useRef(null);
  const nameProbeRef = useRef(null);
  const dateRef = useRef(null);
  const [dateIsNarrow, setDateIsNarrow] = useState(false);
  const dateIsNarrowRef = useRef(false);
  dateIsNarrowRef.current = dateIsNarrow;

  // Fetch teams where user can invite
  useEffect(() => {
    const fetchTeamsAndStatus = async () => {
      if (!isOpen || !inviteeId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch teams where the current user can invite the selected user.
        const teamsResponse = await teamService.getTeamsWhereUserCanInvite(
          inviteeId
        );
        const availableTeams = teamsResponse.data || [];

        const uniqueTeams = availableTeams.filter((team, index, allTeams) => {
          const normalizedTeamId = normalizeId(team?.id);
          if (normalizedTeamId == null) return false;

          return (
            allTeams.findIndex((candidate) =>
              idsMatch(candidate?.id, normalizedTeamId),
            ) === index
          );
        });
        setTeams(uniqueTeams);

        // Fetch pending invitations and applications for each team
        const statusData = {};

        await Promise.all(
          uniqueTeams.map(async (team) => {
            try {
              // Fetch all sent invitations for this team
              const invitationsResponse =
                await teamService.getTeamSentInvitations(team.id);
              const allInvitations = invitationsResponse.data || [];

              // Check if invitee has a pending invitation
              const hasInviteForUser = allInvitations.some(
                (inv) =>
                  (inv.invitee?.id === inviteeId ||
                    inv.invitee_id === inviteeId) &&
                  inv.status === "pending"
              );

              // Fetch all applications for this team
              const applicationsResponse =
                await teamService.getTeamApplications(team.id);
              const allApplications = applicationsResponse.data || [];

              // Check if invitee has a pending application
              const hasApplicationFromUser = allApplications.some(
                (app) =>
                  (app.applicant?.id === inviteeId ||
                    app.applicant_id === inviteeId) &&
                  app.status === "pending"
              );
              const isExistingMember =
                team.isInviteeMember === true ||
                team.is_invitee_member === true ||
                isInviteeExistingTeamMember(team, inviteeId);

              let openRoleCount = 0;
              let hasFilledRoleForInvitee = hasInviteeFilledRole(team, inviteeId);
              let isDemoTeam = isInviteModalDemoTeam(team);

              if (!isDemoTeam) {
                try {
                  const teamDetailsResponse = await teamService.getTeamById(team.id);
                  const teamDetails = unwrapTeamPayload(teamDetailsResponse);
                  isDemoTeam = isInviteModalDemoTeam(teamDetails);
                } catch {
                  isDemoTeam = false;
                }
              }

              try {
                const rolesResponse = await vacantRoleService.getVacantRoles(team.id, "all");
                const allRoles = rolesResponse.data || [];
                openRoleCount = allRoles.filter((role) => {
                  const status = String(role?.status ?? "open").toLowerCase();
                  return status === "open";
                }).length;
                hasFilledRoleForInvitee =
                  hasFilledRoleForInvitee ||
                  allRoles.some((role) => isRoleFilledByInvitee(role, inviteeId));
              } catch {
                try {
                  const rolesResponse = await vacantRoleService.getVacantRoles(team.id, "open");
                  openRoleCount = (rolesResponse.data || []).length;
                } catch {
                  openRoleCount = 0;
                }
              }

              statusData[team.id] = {
                hasInviteForUser,
                hasApplicationFromUser,
                isExistingMember,
                hasFilledRoleForInvitee,
                isDemoTeam,
                allInvitations,
                allApplications,
                openRoleCount,
              };
            } catch (err) {
              console.warn(`Could not fetch status for team ${team.id}:`, err);
              statusData[team.id] = {
                hasInviteForUser: false,
                hasApplicationFromUser: false,
                isExistingMember: false,
                hasFilledRoleForInvitee: false,
                isDemoTeam: isInviteModalDemoTeam(team),
                allInvitations: [],
                allApplications: [],
                openRoleCount: 0,
              };
            }
          })
        );

        setTeamStatusData(statusData);
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load your teams. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsAndStatus();
  }, [isOpen, inviteeId, normalizedPrefillTeamId, prefillTeamName]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTeamId(normalizedPrefillTeamId);
      setIsTeamSectionExpanded(true);
      setVacantRoles([]);
      setSelectedRoleId(normalizedPrefillRoleId);
      setIsRoleSectionExpanded(Boolean(normalizedPrefillRoleId));
      setMessage("");
      setLoadingRoles(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, normalizedPrefillTeamId, normalizedPrefillRoleId]);

  useEffect(() => {
    if (!isOpen || loading) return;

    setSelectedTeamId((currentSelectedTeamId) => {
      const isSelectableTeam = (team) => {
        if (!team) return false;

        const status = teamStatusData[team.id] || {};
        const max = team.max_members ?? team.maxMembers;
        const currentMembers =
          team.current_members_count ??
          team.currentMembersCount ??
          team.member_count ??
          team.memberCount ??
          0;
        const hasOpenSlot =
          max === null || max === undefined ? true : currentMembers < max;
        const isExistingMember = status.isExistingMember === true;

        return (
          !status.hasInviteForUser &&
          !status.hasApplicationFromUser &&
          status.hasFilledRoleForInvitee !== true &&
          (hasOpenSlot || isExistingMember)
        );
      };

      const currentlySelectedTeam = teams.find((team) =>
        idsMatch(team.id, currentSelectedTeamId),
      );
      if (currentlySelectedTeam && isSelectableTeam(currentlySelectedTeam)) {
        return normalizeId(currentlySelectedTeam.id);
      }

      const prefilledTeam = teams.find((team) =>
        idsMatch(team.id, normalizedPrefillTeamId),
      );
      if (prefilledTeam && isSelectableTeam(prefilledTeam)) {
        return normalizeId(prefilledTeam.id);
      }

      return null;
    });
  }, [isOpen, loading, teams, teamStatusData, normalizedPrefillTeamId]);

  useEffect(() => {
    if (!isOpen || !selectedTeamId) {
      setVacantRoles([]);
      setSelectedRoleId(null);
      setIsRoleSectionExpanded(false);
      setLoadingRoles(false);
      return;
    }

    let cancelled = false;
    setIsRoleSectionExpanded(
      idsMatch(selectedTeamId, normalizedPrefillTeamId) &&
        normalizedPrefillRoleId != null,
    );

    const fetchVacantRoles = async () => {
      try {
        setLoadingRoles(true);
        setVacantRoles([]);

        const response = await vacantRoleService.getVacantRoles(
          selectedTeamId,
          "open",
        );

        if (!cancelled) {
          setVacantRoles(response.data || []);
        }
      } catch (err) {
        console.warn(
          `Could not fetch vacant roles for team ${selectedTeamId}:`,
          err,
        );
        if (!cancelled) {
          setVacantRoles([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRoles(false);
        }
      }
    };

    fetchVacantRoles();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    selectedTeamId,
    normalizedPrefillTeamId,
    normalizedPrefillRoleId,
  ]);

  useEffect(() => {
    if (!isOpen || !selectedTeamId || loadingRoles) return;

    const currentSelectedTeam = teams.find((team) => idsMatch(team.id, selectedTeamId));
    const teamRequiresRole = teamStatusData[currentSelectedTeam?.id]?.isExistingMember === true;

    setSelectedRoleId((currentSelectedRoleId) => {
      const selectedRoleStillExists = vacantRoles.find((role) =>
        idsMatch(role.id, currentSelectedRoleId),
      );
      if (selectedRoleStillExists) {
        return normalizeId(selectedRoleStillExists.id);
      }

      if (teamRequiresRole && vacantRoles.length === 1) {
        return normalizeId(vacantRoles[0].id);
      }

      if (
        !idsMatch(selectedTeamId, normalizedPrefillTeamId) ||
        normalizedPrefillRoleId == null
      ) {
        return null;
      }

      const prefilledRole = vacantRoles.find((role) =>
        idsMatch(role.id, normalizedPrefillRoleId),
      );

      return prefilledRole ? normalizeId(prefilledRole.id) : null;
    });
  }, [
    isOpen,
    selectedTeamId,
    vacantRoles,
    loadingRoles,
    normalizedPrefillTeamId,
    normalizedPrefillRoleId,
    teams,
    teamStatusData,
  ]);

  // ============ Helper Functions ============

  // Get full display name from first/last name or fallback to inviteeName
  const getInviteeDisplayName = () => {
    const first = inviteeFirstName || "";
    const last = inviteeLastName || "";
    const fullName = `${first} ${last}`.trim();

    if (fullName.length > 0) {
      return fullName;
    }

    return inviteeName || inviteeUsername || "Unknown User";
  };

  // Get first given name for the modal title (e.g. "Alice Stephanie Beurer" → "Alice")
  const getInviteeAbbreviatedName = () => {
    return (inviteeFirstName || "").split(" ")[0] || inviteeName || inviteeUsername || "Unknown User";
  };

  // Get username
  const getUsername = () => {
    return inviteeUsername || "unknown";
  };

  // Build a user-like object for getUserInitials utility
  const getInviteeUserObject = () => {
    return {
      first_name: inviteeFirstName,
      last_name: inviteeLastName,
      username: inviteeUsername || inviteeName,
      avatar_url: inviteeAvatar || null,
      avatarUrl: inviteeAvatar || null,
      is_public: inviteeIsPublic,
      isPublic: inviteeIsPublic,
      is_private: inviteeIsPrivate,
      isPrivate: inviteeIsPrivate,
      is_synthetic: inviteeIsSynthetic,
      isSynthetic: inviteeIsSynthetic,
    };
  };
  const inviteeUser = getInviteeUserObject();
  const inviteeIsPrivateProfile = isPrivateProfileUser(inviteeUser);
  const displayInviteeUser = inviteeUser;

  // Get team avatar URL
  const getTeamAvatarUrl = (team) => {
    return team.teamavatar_url || team.teamavatarUrl || null;
  };

  // Get current member count
  const getMemberCount = (team) => {
    return (
      team.current_members_count ??
      team.currentMembersCount ??
      team.member_count ??
      team.memberCount ??
      0
    );
  };

  // Get max members
  const getMaxMembers = (team) => {
    const max = team.max_members ?? team.maxMembers;
    return max === null || max === undefined ? "∞" : max;
  };

  // Check if team has capacity
  const hasCapacity = (team) => {
    const max = team.max_members ?? team.maxMembers;
    if (max === null || max === undefined) return true;
    const current = getMemberCount(team);
    return current < max;
  };

  // Get team initials
  const getTeamInitials = (teamName) => {
    if (!teamName || typeof teamName !== "string") return "?";

    const words = teamName.trim().split(/\s+/);

    if (words.length === 1) {
      return teamName.slice(0, 2).toUpperCase();
    }

    return words
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  const getRoleInitials = (roleName) => {
    const name = roleName || "Vacant Role";
    const words = name.trim().split(/\s+/);

    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  };

  const getRoleLocation = (role) => {
    const isRemote = role.isRemote ?? role.is_remote;
    if (isRemote) return "Remote";

    const parts = [role.city, role.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const getTeamLocationDetails = (team) => {
    const isRemote = team.isRemote ?? team.is_remote;
    const locationParts = [team.city, team.country].filter(Boolean);
    const locationText = isRemote
      ? "Remote"
      : locationParts.length > 0
        ? locationParts.join(", ")
        : null;

    return { isRemote, locationText };
  };

  // Get the status badge for a team
  const getTeamStatusBadge = (teamId, team) => {
    const isSelected = idsMatch(selectedTeamId, teamId);
    const status = teamStatusData[teamId] || {};
    const hasPendingInvite = status.hasInviteForUser;
    const hasPendingApplication = status.hasApplicationFromUser;
    const isExistingMember = status.isExistingMember === true;
    const teamHasCapacity = hasCapacity(team);

    if (hasPendingInvite) {
      return {
        type: "pending-invite",
        label: "Invited",
        icon: SendHorizontal,
        badgeClass: "badge-role-admin",
        clickable: true,
      };
    }

    if (hasPendingApplication) {
      return {
        type: "pending-application",
        label: "Applied",
        icon: Mail,
        badgeClass: "badge-role-owner",
        clickable: true,
      };
    }

    if (isExistingMember) {
      if (isSelected) {
        return {
          type: "existing-member-selected",
          label: "Invite to Role",
          icon: Check,
          clickable: true,
          customStyle: {
            backgroundColor: "rgb(20, 83, 45)",
            border: "none",
            color: "#ffffff",
          },
        };
      }
      return {
        type: "existing-member",
        label: "Member",
        icon: Users,
        clickable: true,
        customStyle: {
          backgroundColor: "rgba(0, 146, 19, 0.08)",
          border: "none",
          color: "rgb(20, 83, 45)",
        },
      };
    }

    if (teamHasCapacity) {
      if (isSelected) {
        return {
          type: "selected",
          label: "Invite to Team",
          icon: Check,
          customStyle: {
            backgroundColor: "var(--color-primary-focus)",
            color: "#ffffff",
          },
          clickable: true,
        };
      } else {
        return {
          type: "available",
          label: "Invite",
          icon: UserPlus,
          badgeClass: "badge-role-member",
          clickable: true,
        };
      }
    }

    return null;
  };

  // Check if team is selectable for new invite
  const isTeamSelectable = (teamId, team) => {
    const status = teamStatusData[teamId] || {};
    return (
      !status.hasInviteForUser &&
      !status.hasApplicationFromUser &&
      status.hasFilledRoleForInvitee !== true &&
      (hasCapacity(team) || status.isExistingMember === true)
    );
  };

  const orderedTeams = useMemo(() => {
    const filtered = teams.filter((team) => {
      const userRole = team.user_role ?? team.userRole;
      if (userRole && !['owner', 'admin'].includes(userRole)) return false;

      const status = teamStatusData[team.id];
      if (status?.isExistingMember === true && status?.hasFilledRoleForInvitee === true) {
        return false;
      }

      if (status?.isExistingMember === true && (status?.openRoleCount ?? 0) === 0) {
        return false;
      }
      return true;
    });

    if (normalizedPrefillTeamId == null) return filtered;

    const prefilledTeam = filtered.find((team) =>
      idsMatch(team.id, normalizedPrefillTeamId),
    );
    if (!prefilledTeam) return filtered;

    return [
      prefilledTeam,
      ...filtered.filter((team) => !idsMatch(team.id, normalizedPrefillTeamId)),
    ];
  }, [teams, teamStatusData, normalizedPrefillTeamId]);

  const selectedTeam = useMemo(
    () =>
      teams.find((team) => idsMatch(team.id, selectedTeamId)) || null,
    [teams, selectedTeamId],
  );
  const selectedTeamStatus =
    (selectedTeam && teamStatusData[selectedTeam.id]) || {};
  const selectedTeamRequiresRole = selectedTeamStatus.isExistingMember === true;
  const shouldShowRolePicker =
    !!selectedTeamId &&
    (loadingRoles ||
      vacantRoles.length > 0 ||
      selectedTeamRequiresRole ||
      isRoleSectionExpanded);
  const roleAvailabilityLabel =
    vacantRoles.length === 1
      ? "1 open role available"
      : `${vacantRoles.length} open roles available`;
  const otherAvailableTeamCount = selectedTeam
    ? orderedTeams.filter((team) => !idsMatch(team.id, selectedTeam.id)).length
    : orderedTeams.length;
  const otherAvailableTeamLabel =
    otherAvailableTeamCount === 1
      ? "1 other team available"
      : `${otherAvailableTeamCount} other teams available`;
  const selectedRole =
    vacantRoles.find((role) => idsMatch(role.id, selectedRoleId)) ?? null;
  const isRoleSelectionRequired =
    selectedTeamRequiresRole && selectedRoleId === null;

  useEffect(() => {
    if (isOpen && isRoleSelectionRequired) {
      setIsRoleSectionExpanded(true);
    }
  }, [isOpen, isRoleSelectionRequired]);

  useEffect(() => {
    if (isOpen && selectedRoleId !== null) {
      setIsTeamSectionExpanded(false);
    }
  }, [isOpen, selectedRoleId]);

  useEffect(() => {
    if (!isOpen || loadingRoles || !selectedTeamId) return;
    if (vacantRoles.length > 0) {
      setIsTeamSectionExpanded(false);
      setIsRoleSectionExpanded(true);
    } else {
      setIsTeamSectionExpanded(false);
    }
  }, [isOpen, selectedTeamId, vacantRoles, loadingRoles]);

  useLayoutEffect(() => {
    const container = nameContainerRef.current;
    const probe = nameProbeRef.current;
    if (!container || !probe) return;

    const update = () => {
      const first = inviteeFirstName || "";
      const last = inviteeLastName || "";
      const full = `${first} ${last}`.trim();
      const displayName = inviteeIsPrivateProfile
        ? "Private Profile"
        : full || inviteeName || inviteeUsername || "Unknown User";
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
  }, [inviteeFirstName, inviteeLastName, inviteeName, inviteeUsername, inviteeIsPrivateProfile]);

  const prefillContextNote = useMemo(() => {
    if (!idsMatch(selectedTeamId, normalizedPrefillTeamId)) return null;

    const teamLabel = selectedTeam?.name || prefillTeamName || null;

    if (prefillRoleName && teamLabel) {
      return `Prefilled from match: ${prefillRoleName} in ${teamLabel}.`;
    }

    if (prefillRoleName) {
      return `Prefilled from match: ${prefillRoleName}.`;
    }

    if (teamLabel) {
      return `Prefilled team: ${teamLabel}.`;
    }

    return null;
  }, [
    prefillRoleName,
    prefillTeamName,
    normalizedPrefillTeamId,
    selectedTeam,
    selectedTeamId,
  ]);

  // ============ Handlers ============

  const handleSendInvitation = async () => {
    if (!selectedTeamId) {
      setError("Please select a team");
      return;
    }

    if (selectedTeamRequiresRole && !selectedRoleId) {
      setError(
        "Select a role to invite this team member for a specific position.",
      );
      return;
    }

    try {
      setSending(true);
      setError(null);

      await teamService.sendInvitation(
        selectedTeamId,
        inviteeId,
        message,
        selectedRoleId,
      );

      setSuccess(`Invitation sent to ${getInviteeDisplayName()}!`);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError(
        err.response?.data?.message ||
          "Failed to send invitation. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  // Handle badge click
  const handleBadgeClick = (e, teamId, team, statusBadge) => {
    e.stopPropagation();

    const status = teamStatusData[teamId] || {};

    if (statusBadge.type === "pending-invite") {
      // Open TeamInvitesModal with this team's invitations
      setSelectedTeamForModal(team);
      setSelectedTeamInvitations(status.allInvitations || []);
      setIsInvitesModalOpen(true);
    } else if (statusBadge.type === "pending-application") {
      // Open TeamApplicationsModal with this team's applications
      setSelectedTeamForModal(team);
      setSelectedTeamApplications(status.allApplications || []);
      setIsApplicationsModalOpen(true);
    } else if (
      statusBadge.type === "available" ||
      statusBadge.type === "selected" ||
      statusBadge.type === "existing-member" ||
      statusBadge.type === "existing-member-selected"
    ) {
      if (isTeamSelectable(teamId, team)) {
        const nextTeamId = idsMatch(selectedTeamId, teamId) ? null : teamId;
        setSelectedTeamId(nextTeamId);
        setIsTeamSectionExpanded(true);
        setSelectedRoleId(null);
        setVacantRoles([]);
        setError(null);
      }
    }
  };

  // Handle card click
  const handleCardClick = (team) => {
    setSelectedTeamForDetails(team);
    setIsTeamDetailsOpen(true);
  };

  // Handle team details modal close
  const handleTeamDetailsClose = () => {
    setIsTeamDetailsOpen(false);
    setSelectedTeamForDetails(null);
  };

  // Handle user click
  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // Handle user modal close
  const handleUserModalClose = () => {
    setSelectedUserId(null);
  };

  const handleRoleCardClick = (roleId) => {
    setSelectedRoleId((currentRoleId) => {
      const nextRoleId = idsMatch(currentRoleId, roleId) ? null : roleId;
      if (nextRoleId !== null) {
        setIsTeamSectionExpanded(false);
        setIsRoleSectionExpanded(false);
      }
      return nextRoleId;
    });
  };

  const handleRoleDetailsClick = (role, event) => {
    event?.stopPropagation();
    setSelectedRoleForDetails(role);
  };

  const handleRoleDetailsClose = () => {
    setSelectedRoleForDetails(null);
  };

  const refreshSelectedTeamRequests = useCallback(async () => {
    if (!selectedTeamForModal?.id) return;

    const teamId = selectedTeamForModal.id;
    const [invitationsResult, applicationsResult] = await Promise.allSettled([
      teamService.getTeamSentInvitations(teamId),
      teamService.getTeamApplications(teamId),
    ]);

    const allInvitations =
      invitationsResult.status === "fulfilled"
        ? invitationsResult.value?.data || []
        : selectedTeamInvitations;
    const allApplications =
      applicationsResult.status === "fulfilled"
        ? applicationsResult.value?.data || []
        : selectedTeamApplications;

    setSelectedTeamInvitations(allInvitations);
    setSelectedTeamApplications(allApplications);
    setTeamStatusData((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        allInvitations,
        allApplications,
        hasInviteForUser: allInvitations.some(
          (inv) =>
            (inv.invitee?.id === inviteeId || inv.invitee_id === inviteeId) &&
            inv.status === "pending",
        ),
        hasApplicationFromUser: allApplications.some(
          (app) =>
            (app.applicant?.id === inviteeId || app.applicant_id === inviteeId) &&
            app.status === "pending",
        ),
      },
    }));
  }, [
    inviteeId,
    selectedTeamApplications,
    selectedTeamForModal?.id,
    selectedTeamInvitations,
  ]);

  const handleTeamRequestEvent = useCallback((payload = {}) => {
    const payloadTeamId = payload.teamId ?? payload.team_id ?? null;
    if (
      payloadTeamId != null &&
      String(payloadTeamId) !== String(selectedTeamForModal.id)
    ) {
      return;
    }

    const type = String(payload.type ?? payload.notificationType ?? "").toLowerCase();
    if (
      !type ||
      type.includes("invitation") ||
      type.includes("invite") ||
      type.includes("application")
    ) {
      refreshSelectedTeamRequests();
    }
  }, [refreshSelectedTeamRequests, selectedTeamForModal?.id]);

  useSocketEvents(
    isOpen && selectedTeamForModal?.id
      ? {
          "notification:new": handleTeamRequestEvent,
          "notification:updated": handleTeamRequestEvent,
          "notification:deleted": handleTeamRequestEvent,
        }
      : null,
    [isOpen, refreshSelectedTeamRequests, selectedTeamForModal?.id],
  );

  // Handle cancel invitation (called from TeamInvitesModal)
  const handleCancelInvitation = async (invitationId) => {
    try {
      await teamService.cancelInvitation(invitationId);

      // Update local state - remove the cancelled invitation
      if (selectedTeamForModal) {
        const teamId = selectedTeamForModal.id;
        const updatedInvitations = selectedTeamInvitations.filter(
          (inv) => inv.id !== invitationId
        );
        setSelectedTeamInvitations(updatedInvitations);

        // Update teamStatusData
        setTeamStatusData((prev) => ({
          ...prev,
          [teamId]: {
            ...prev[teamId],
            allInvitations: updatedInvitations,
            hasInviteForUser: updatedInvitations.some(
              (inv) =>
                (inv.invitee?.id === inviteeId ||
                  inv.invitee_id === inviteeId) &&
                inv.status === "pending"
            ),
          },
        }));
      }
    } catch (err) {
      console.error("Error canceling invitation:", err);
      throw err;
    }
  };

  const handleCancelRoleInvitation = async (invitationId) => {
    try {
      const result = await teamService.cancelRoleInvitation(invitationId);

      if (selectedTeamForModal) {
        const teamId = selectedTeamForModal.id;
        const canceledInvitation =
          result?.data?.canceledInvitation ?? result?.canceledInvitation ?? false;
        const updatedInvitations = canceledInvitation
          ? selectedTeamInvitations.filter((inv) => inv.id !== invitationId)
          : selectedTeamInvitations.map((inv) =>
              inv.id === invitationId
                ? {
                    ...inv,
                    role: null,
                    roleId: null,
                    role_id: null,
                    roleName: null,
                    role_name: null,
                  }
                : inv,
            );

        setSelectedTeamInvitations(updatedInvitations);
        setTeamStatusData((prev) => ({
          ...prev,
          [teamId]: {
            ...prev[teamId],
            allInvitations: updatedInvitations,
            hasInviteForUser: updatedInvitations.some(
              (inv) =>
                (inv.invitee?.id === inviteeId ||
                  inv.invitee_id === inviteeId) &&
                inv.status === "pending"
            ),
          },
        }));
      }
    } catch (err) {
      console.error("Error canceling role invitation:", err);
      throw err;
    }
  };

  // Handle application action (called from TeamApplicationsModal)
  const handleApplicationAction = async (
    applicationId,
    action,
    response = "",
    fillRole = false
  ) => {
    try {
      const result = await teamService.handleTeamApplication(applicationId, action, response, fillRole);

      // Update local state - remove the processed application
      if (selectedTeamForModal) {
        const teamId = selectedTeamForModal.id;
        const updatedApplications = selectedTeamApplications.filter(
          (app) => app.id !== applicationId
        );
        setSelectedTeamApplications(updatedApplications);

        // Update teamStatusData
        setTeamStatusData((prev) => ({
          ...prev,
          [teamId]: {
            ...prev[teamId],
            allApplications: updatedApplications,
            hasApplicationFromUser: updatedApplications.some(
              (app) =>
                (app.applicant?.id === inviteeId ||
                  app.applicant_id === inviteeId) &&
                app.status === "pending"
            ),
          },
        }));
      }
      return result;
    } catch (err) {
      console.error(`Error ${action}ing application:`, err);
      throw err;
    }
  };

  // Close invites modal
  const handleInvitesModalClose = () => {
    setIsInvitesModalOpen(false);
    setSelectedTeamForModal(null);
    setSelectedTeamInvitations([]);
  };

  // Close applications modal
  const handleApplicationsModalClose = () => {
    setIsApplicationsModalOpen(false);
    setSelectedTeamForModal(null);
    setSelectedTeamApplications([]);
  };

  // ============ Render ============

  const customHeader = (
    <div className="flex items-start gap-3">
      <UserPlus className="text-primary mt-0.5" size={24} />
      <div>
        <h2 className="text-xl font-medium text-primary leading-[110%]">
          Invite {getInviteeAbbreviatedName()} to a Team
        </h2>
        {/* <p className="text-sm text-base-content/70">
          Invite {getInviteeDisplayName()} to join your team
        </p> */}
      </div>
    </div>
  );

  const canSendInvitation =
    !!selectedTeamId &&
    !sending &&
    !success &&
    (!selectedTeamRequiresRole || selectedRoleId !== null);
  const showInviteeDemoProfile = isSyntheticUser(inviteeUser);
  const locationText = [inviteeCity, inviteeCountry].filter(Boolean).join(", ");
  const joinedDateText = (() => {
    if (!inviteeJoinedAt) return null;
    try {
      return format(new Date(inviteeJoinedAt), "MMM d, yyyy");
    } catch {
      return null;
    }
  })();
  const handleRoleSectionToggle = () => {
    setIsRoleSectionExpanded((isExpanded) => {
      if (isExpanded && isRoleSelectionRequired) {
        return true;
      }

      return !isExpanded;
    });
  };
  const handleTeamSectionToggle = () => {
    setIsTeamSectionExpanded((isExpanded) => !isExpanded);
  };

  const renderTeamSelectionCard = (
    team,
    { isCollapsedSummary = false } = {},
  ) => {
    const statusBadge = getTeamStatusBadge(team.id, team);
    const BadgeIcon = statusBadge?.icon;
    const showDemoTeam =
      isInviteModalDemoTeam(team) ||
      teamStatusData[team.id]?.isDemoTeam === true;
    const isMember = teamStatusData[team.id]?.isExistingMember === true;
    const { isRemote, locationText } = getTeamLocationDetails(team);
    const cardClasses = idsMatch(selectedTeamId, team.id)
      ? "bg-green-100 ring-2 ring-primary shadow-md"
      : isMember
        ? "bg-green-50 hover:bg-green-100 hover:shadow-md"
        : "bg-base-200 hover:bg-base-300 hover:shadow-md";

    const activateCard = () => {
      if (isCollapsedSummary) {
        setIsTeamSectionExpanded(true);
        return;
      }

      handleCardClick(team);
    };

    return (
      <div
        key={team.id}
        role={isCollapsedSummary ? "button" : undefined}
        tabIndex={isCollapsedSummary ? 0 : undefined}
        onClick={activateCard}
        onKeyDown={(event) => {
          if (!isCollapsedSummary) return;

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsTeamSectionExpanded(true);
          }
        }}
        className={`flex items-start gap-4 p-4 rounded-xl shadow cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${cardClasses}`}
      >
        <div className="avatar">
          <div className="w-14 h-14 rounded-full relative overflow-hidden">
            {getTeamAvatarUrl(team) ? (
              <img
                src={getTeamAvatarUrl(team)}
                alt={team.name}
                className="object-cover w-full h-full rounded-full"
                onError={(e) => {
                  e.target.style.display = "none";
                  const fallback =
                    e.target.parentElement.querySelector(".avatar-fallback");
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
              style={{
                display: getTeamAvatarUrl(team) ? "none" : "flex",
              }}
            >
              <span className="text-xl">
                {getTeamInitials(team.name)}
              </span>
            </div>
            {showDemoTeam && (
              <DemoAvatarOverlay
                textClassName="text-[7px]"
                textTranslateClassName="-translate-y-[3px]"
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-[1px]">
          <div className="flex flex-col">
            <div className="flex min-w-0 items-center gap-1">
              <h3 className="min-w-0 flex-1 truncate font-medium text-base leading-[120%]">
                {team.name}
              </h3>
              {statusBadge && (
                <div
                  className="shrink-0 ml-1"
                  onClick={(event) => {
                    if (isCollapsedSummary) {
                      event.stopPropagation();
                      setIsTeamSectionExpanded(true);
                      return;
                    }

                    handleBadgeClick(event, team.id, team, statusBadge);
                  }}
                >
                  <RoleBadgePill
                    icon={BadgeIcon}
                    label={statusBadge.label}
                    badgeColorClass={statusBadge.badgeClass || ""}
                    interactive={statusBadge.clickable}
                    style={statusBadge.customStyle}
                  />
                </div>
              )}
            </div>
          <div className="mt-0.5 flex max-h-[2.1em] flex-wrap items-center gap-x-2 gap-y-0 overflow-hidden text-xs">
              <div className="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden">
                <Users size={10} className="text-base-content/60 shrink-0" />
                <span className="text-base-content/60 leading-[1.05] truncate">
                  {getMemberCount(team)}/{getMaxMembers(team)}
                </span>
              </div>
              {(teamStatusData[team.id]?.openRoleCount ?? 0) > 0 && (
                <div className="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden">
                  <UserSearch size={10} className="text-base-content/60 shrink-0" />
                  <span className="text-base-content/60 leading-[1.05] truncate">
                    {teamStatusData[team.id].openRoleCount}
                  </span>
                </div>
              )}
              {locationText && (
                <div className="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden">
                  {isRemote ? (
                    <Globe size={10} className="text-base-content/60 shrink-0" />
                  ) : (
                    <MapPin size={10} className="text-base-content/60 shrink-0" />
                  )}
                  <span className="text-base-content/60 leading-[1.05] truncate">
                    {locationText}
                  </span>
                </div>
              )}
              {(statusBadge?.type === "existing-member-selected" ||
                ((statusBadge?.type === "pending-invite" ||
                  statusBadge?.type === "pending-application") &&
                  teamStatusData[team.id]?.isExistingMember === true)) && (
                <div className="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden">
                  <Users size={10} className="text-base-content/60 shrink-0" />
                  <span className="text-base-content/60 leading-[1.05] truncate">
                    Member
                  </span>
                </div>
              )}
              {showDemoTeam && (
                <Tooltip
                  content={DEMO_TEAM_TOOLTIP}
                  wrapperClassName="flex shrink-0 items-center gap-1 min-w-0 text-base-content/50"
                >
                  <FlaskConical
                    size={10}
                    className="text-base-content/50 shrink-0"
                  />
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="errorOutline" onClick={onClose} disabled={sending}>
        Cancel
      </Button>
      <Button
        variant="successOutline"
        onClick={handleSendInvitation}
        disabled={!canSendInvitation}
        icon={<Send size={16} />}
      >
        {sending ? "Sending..." : "Send Invitation"}
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={customHeader}
        footer={footer}
        position="center"
        size="default"
        closeOnBackdrop={!sending}
        closeOnEscape={!sending}
        showCloseButton={true}
      >
        <ScreenAlert
          alerts={[
            success && {
              type: "success",
              message: success,
              onClose: () => setSuccess(null),
            },
            error && {
              type: "error",
              message: error,
              onClose: () => setError(null),
            },
          ]}
        />

        <div className="space-y-5">
          {/* Invitee info */}
          <div className="relative flex items-start justify-between gap-4 mb-5">
            <div className="flex min-w-0 flex-1 items-start space-x-4">
              <Tooltip content={inviteeIsPrivateProfile ? undefined : "View profile"} position="bottom" wrapperClassName="block">
                <UserAvatar
                  user={displayInviteeUser}
                  sizeClass="w-12 h-12"
                  initialsClassName="text-xl font-medium"
                  clickable={!inviteeIsPrivateProfile}
                  onClick={() => {
                    if (!inviteeIsPrivateProfile) handleUserClick(inviteeId);
                  }}
                  title={inviteeIsPrivateProfile ? undefined : "View profile"}
                  privateProfile={false}
                  showDemoOverlay={showInviteeDemoProfile}
                  demoOverlayTextClassName="text-[8px]"
                />
              </Tooltip>

              <div className="flex-1 min-w-0">
                <h4
                  ref={nameContainerRef}
                  className="font-medium text-base-content leading-[120%] mb-[0.2em] truncate relative"
                >
                  {inviteeIsPrivateProfile ? (
                    <span>{getInviteeDisplayName()}</span>
                  ) : (
                    <Tooltip content="View profile" position="bottom" wrapperClassName="cursor-pointer hover:text-primary transition-colors">
                      <span onClick={() => handleUserClick(inviteeId)}>{getInviteeDisplayName()}</span>
                    </Tooltip>
                  )}
                  <span
                    ref={nameProbeRef}
                    className="invisible absolute whitespace-nowrap pointer-events-none left-0 top-0 font-medium"
                    aria-hidden="true"
                  >
                    {getInviteeDisplayName()}
                  </span>
                </h4>

                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 overflow-hidden text-xs" style={{ maxHeight: "2.1em" }}>
                  {inviteeUsername && (
                    inviteeIsPrivateProfile ? (
                      <p className="text-base-content/70">@{getUsername()}</p>
                    ) : (
                      <Tooltip content="View profile" position="bottom" wrapperClassName="inline-flex">
                        <p
                          className="text-base-content/70 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleUserClick(inviteeId)}
                        >
                          @{getUsername()}
                        </p>
                      </Tooltip>
                    )
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
                  {showInviteeDemoProfile && (
                    <Tooltip
                      content={DEMO_PROFILE_TOOLTIP}
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

          {/* Bio if available */}
          {!inviteeIsPrivateProfile && inviteeBio && (
            <div className="text-sm text-base-content/80 mb-5">
              <p className="line-clamp-2">{inviteeBio}</p>
            </div>
          )}

          {/* Team selection */}
          <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-xs text-base-content/60 mb-2 hover:text-base-content/80 transition-colors"
              onClick={handleTeamSectionToggle}
              aria-expanded={isTeamSectionExpanded}
            >
              <span className="flex min-w-0 items-center">
                <Users size={12} className="text-primary mr-1" />
                <span className="truncate">Select a team to invite them to:</span>
              </span>
              <span className="ml-2 flex min-w-0 items-center gap-1 text-base-content/40">
                {!isTeamSectionExpanded && selectedTeam && (
                  <span className="truncate whitespace-nowrap">
                    {otherAvailableTeamLabel}
                  </span>
                )}
                {isTeamSectionExpanded ? (
                  <ChevronUp size={14} className="shrink-0" />
                ) : (
                  <ChevronRight size={14} className="shrink-0" />
                )}
              </span>
            </button>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="loading loading-spinner loading-md text-primary"></div>
              </div>
            ) : orderedTeams.length === 0 ? (
              <div className="text-center py-6 bg-base-200/30 rounded-lg border border-base-300">
                <AlertCircle className="mx-auto mb-2 text-warning" size={28} />
                <p className="text-sm text-base-content/70">
                  You don't have any teams where you can invite members.
                </p>
                <p className="form-helper-text">
                  Create a team or become an admin to send invitations.
                </p>
              </div>
            ) : isTeamSectionExpanded ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-1">
                {orderedTeams.map((team) => renderTeamSelectionCard(team))}
              </div>
            ) : selectedTeam ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
                {renderTeamSelectionCard(selectedTeam, {
                  isCollapsedSummary: true,
                })}
              </div>
            ) : null}
          </div>

          {/* Vacant role selection */}
          {shouldShowRolePicker && (
            <div className="bg-base-200/30 rounded-lg border border-base-300 p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-xs text-base-content/60 mb-2 hover:text-base-content/80 transition-colors"
                onClick={handleRoleSectionToggle}
                aria-expanded={isRoleSectionExpanded}
                aria-disabled={isRoleSelectionRequired && isRoleSectionExpanded}
                title={
                  isRoleSelectionRequired && isRoleSectionExpanded
                    ? "Select a role before collapsing this section"
                    : undefined
                }
              >
                <span className="flex min-w-0 items-center">
                  <UserSearch size={12} className="text-orange-500 mr-1" />
                  <span className="truncate">
                    Select a role you want to fill in this team:
                  </span>
                </span>
                <span className="ml-2 flex items-center gap-1 text-base-content/40">
                  {!isRoleSectionExpanded && vacantRoles.length > 0 && (
                    <span className="whitespace-nowrap">
                      {roleAvailabilityLabel}
                    </span>
                  )}
                  {isRoleSectionExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </span>
              </button>

              {prefillContextNote && (
                <p className="text-xs text-base-content/40 mb-2">
                  {prefillContextNote}
                </p>
              )}

              {!isRoleSectionExpanded ? (
                selectedRole ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setIsRoleSectionExpanded(true)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setIsRoleSectionExpanded(true);
                        }
                      }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-amber-100 text-left shadow ring-2 ring-amber-400 transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <button
                        type="button"
                        className="avatar placeholder cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full"
                        aria-label={`Open details for ${
                          selectedRole.roleName ??
                          selectedRole.role_name ??
                          "this role"
                        }`}
                        onClick={(event) =>
                          handleRoleDetailsClick(selectedRole, event)
                        }
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <div className="bg-amber-500 text-white w-14 h-14 rounded-full relative flex items-center justify-center overflow-hidden">
                          <span className="text-xl">
                            {getRoleInitials(
                              selectedRole.roleName ??
                                selectedRole.role_name ??
                                "Vacant Role",
                            )}
                          </span>
                          {isSyntheticRole(selectedRole) && (
                            <DemoAvatarOverlay
                              textClassName="text-[7px]"
                              textTranslateClassName="-translate-y-[3px]"
                            />
                          )}
                        </div>
                      </button>

                      <div className="flex-1 min-w-0 pt-[1px]">
                        <div className="flex flex-col">
                          <div className="flex min-w-0 items-center gap-1">
                            <button
                              type="button"
                              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left font-medium text-base text-base-content truncate leading-[120%] hover:text-primary focus-visible:outline-none focus-visible:text-primary"
                              onClick={(event) =>
                                handleRoleDetailsClick(selectedRole, event)
                              }
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              {selectedRole.roleName ??
                                selectedRole.role_name ??
                                "Vacant Role"}
                            </button>
                            <div className="shrink-0 ml-1">
                              <RoleBadgePill
                                icon={Check}
                                label="Selected"
                                badgeColorClass="bg-amber-800 text-white"
                                interactive
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRoleCardClick(selectedRole.id);
                                }}
                              />
                            </div>
                          </div>

                        {(getRoleLocation(selectedRole) ||
                          isSyntheticRole(selectedRole)) && (
                          <CardMetaRow>
                            {getRoleLocation(selectedRole) && (
                              <CardMetaItem
                                icon={
                                  (selectedRole.isRemote ??
                                    selectedRole.is_remote)
                                    ? Globe
                                    : MapPin
                                }
                              >
                                {getRoleLocation(selectedRole)}
                              </CardMetaItem>
                            )}
                            {isSyntheticRole(selectedRole) && (
                              <Tooltip
                                content={DEMO_ROLE_TOOLTIP}
                                wrapperClassName="flex items-center gap-1 min-w-0 text-base-content/50"
                              >
                                <FlaskConical
                                  size={10}
                                  className="text-base-content/50 shrink-0"
                                />
                              </Tooltip>
                            )}
                          </CardMetaRow>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null
              ) : loadingRoles ? (
                <div className="flex justify-center py-6">
                  <div className="loading loading-spinner loading-md text-primary"></div>
                </div>
              ) : vacantRoles.length === 0 ? (
                <div className="text-center py-5 bg-base-200/30 rounded-lg border border-base-300">
                  <AlertCircle className="mx-auto mb-2 text-warning" size={24} />
                  <p className="text-sm text-base-content/70">
                    This team has no open vacant roles right now.
                  </p>
                  <p className="form-helper-text">
                    {selectedTeamRequiresRole
                      ? "This user is already a member of the team, so an open role is required before you can send an invitation."
                      : idsMatch(selectedTeamId, normalizedPrefillTeamId) &&
                          prefillRoleName
                        ? `${prefillRoleName} isn't currently available. You can still send a general team invitation.`
                        : "You can still send a general team invitation without choosing a role."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-1">
                  {vacantRoles.map((role) => {
                    const roleName =
                      role.roleName ?? role.role_name ?? "Vacant Role";
                    const isSelected = idsMatch(selectedRoleId, role.id);
                    const locationText = getRoleLocation(role);
                    const isRemote = role.isRemote ?? role.is_remote;
                    const showDemoRole = isSyntheticRole(role);

                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        key={role.id}
                        onClick={() => handleRoleCardClick(role.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleRoleCardClick(role.id);
                          }
                        }}
                        className={`flex items-start gap-4 p-4 rounded-xl text-left shadow cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                          ${
                            isSelected
                              ? "bg-amber-100 ring-2 ring-amber-400 shadow-md"
                              : "bg-amber-50 hover:bg-amber-100/70 hover:shadow-md"
                          }`}
                      >
                        <button
                          type="button"
                          className="avatar placeholder cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full"
                          aria-label={`Open details for ${roleName}`}
                          onClick={(event) =>
                            handleRoleDetailsClick(role, event)
                          }
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <div className="bg-amber-500 text-white w-14 h-14 rounded-full relative flex items-center justify-center overflow-hidden">
                            <span className="text-xl">
                              {getRoleInitials(roleName)}
                            </span>
                            {showDemoRole && (
                              <DemoAvatarOverlay
                                textClassName="text-[7px]"
                                textTranslateClassName="-translate-y-[3px]"
                              />
                            )}
                          </div>
                        </button>

                        <div className="flex-1 min-w-0 pt-[1px]">
                          <div className="flex flex-col">
                            <div className="flex min-w-0 items-center gap-1">
                              <button
                                type="button"
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left font-medium text-base text-base-content truncate leading-[120%] hover:text-primary focus-visible:outline-none focus-visible:text-primary"
                                onClick={(event) =>
                                  handleRoleDetailsClick(role, event)
                                }
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                {roleName}
                              </button>
                              <div className="shrink-0 ml-1">
                                <RoleBadgePill
                                  icon={isSelected ? Check : UserSearch}
                                  label={isSelected ? "Selected" : "Select"}
                                  badgeColorClass={
                                    isSelected
                                      ? "bg-amber-800 text-white"
                                      : "badge-role-vacant"
                                  }
                                  interactive
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRoleCardClick(role.id);
                                  }}
                                />
                              </div>
                            </div>

                          {(locationText || showDemoRole) && (
                            <CardMetaRow>
                              {locationText && (
                                <CardMetaItem icon={isRemote ? Globe : MapPin}>
                                  {locationText}
                                </CardMetaItem>
                              )}
                              {showDemoRole && (
                                <Tooltip
                                  content={DEMO_ROLE_TOOLTIP}
                                  wrapperClassName="flex items-center gap-1 min-w-0 text-base-content/50"
                                >
                                  <FlaskConical
                                    size={10}
                                    className="text-base-content/50 shrink-0"
                                  />
                                </Tooltip>
                              )}
                            </CardMetaRow>
                          )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loadingRoles &&
                isRoleSectionExpanded &&
                vacantRoles.length > 0 &&
                selectedRoleId === null &&
                selectedTeamRequiresRole && (
                  <p className="text-xs text-base-content/40 mt-1.5">
                    Select a role to invite this team member for a specific
                    position.
                  </p>
                )}

              {!loadingRoles &&
                isRoleSectionExpanded &&
                vacantRoles.length > 0 &&
                selectedRoleId === null &&
                !selectedTeamRequiresRole && (
                  <p className="text-xs text-base-content/40 mt-1.5">
                    No role selected. Your invitation will be sent as a general
                    team invitation.
                  </p>
                )}
            </div>
          )}

          {/* Optional message */}
          {orderedTeams.length > 0 && (
            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between text-xs text-base-content/60 mb-2 hover:text-base-content/80 transition-colors"
                onClick={() => setIsMessageSectionExpanded((v) => !v)}
                aria-expanded={isMessageSectionExpanded}
              >
                <span className="flex min-w-0 items-center">
                  <Send size={12} className="text-info mr-1" />
                  <span className="truncate">Add a message (optional){isMessageSectionExpanded ? ":" : ""}</span>
                </span>
                <span className="ml-2 flex min-w-0 items-center gap-1 text-base-content/40">
                  {!isMessageSectionExpanded && message && (
                    <span className="truncate max-w-[160px] whitespace-nowrap">
                      {message}
                    </span>
                  )}
                  {isMessageSectionExpanded ? (
                    <ChevronUp size={14} className="shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="shrink-0" />
                  )}
                </span>
              </button>
              {isMessageSectionExpanded && (
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Hi ${getInviteeDisplayName()}, I'd like to invite you to join our team...`}
                    className="textarea textarea-bordered w-full h-24 resize-none text-sm pb-6"
                    maxLength={500}
                  />
                  <span className="absolute bottom-2 left-3 text-xs text-base-content/40 pointer-events-none">
                    {message.length}/500 characters
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={!!selectedUserId}
        userId={selectedUserId}
        onClose={handleUserModalClose}
      />

      {/* Team Details Modal */}
      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={selectedTeamForDetails?.id}
        initialTeamData={selectedTeamForDetails}
        onClose={handleTeamDetailsClose}
      />

      {selectedRoleForDetails && (
        <VacantRoleDetailsModal
          isOpen={Boolean(selectedRoleForDetails)}
          onClose={handleRoleDetailsClose}
          team={selectedTeam}
          role={selectedRoleForDetails}
          isTeamMember={true}
          canManage={true}
          hideActions
        />
      )}

      {/* Team Invites Modal */}
      <TeamInvitesModal
        isOpen={isInvitesModalOpen}
        onClose={handleInvitesModalClose}
        teamId={selectedTeamForModal?.id}
        invitations={selectedTeamInvitations}
        onCancelInvitation={handleCancelInvitation}
        onCancelRoleInvitation={handleCancelRoleInvitation}
        teamName={selectedTeamForModal?.name}
        highlightInvitationId={selectedTeamInvitations?.[0]?.id ?? null}
        highlightUserId={inviteeId}
      />

      {/* Team Applications Modal */}
      <TeamApplicationsModal
        isOpen={isApplicationsModalOpen}
        onClose={handleApplicationsModalClose}
        teamId={selectedTeamForModal?.id}
        applications={selectedTeamApplications}
        onApplicationAction={handleApplicationAction}
        teamName={selectedTeamForModal?.name}
        highlightApplicationId={selectedTeamApplications?.[0]?.id ?? null}
        highlightUserId={inviteeId}
      />
    </>
  );
};

export default TeamInviteModal;
