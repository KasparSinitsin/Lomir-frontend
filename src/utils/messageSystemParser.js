// System-message parser for chat. Pure (no React/JSX): turns the encoded
// system/event message strings (joins/leaves, role events, invitations,
// ownership transfers, deletions, …) into structured data used for rendering
// and previews. Extracted verbatim from MessageDisplay.jsx so non-component
// callers (eventPreview, MessageNotifications) can share it without importing
// the component.

const parseIdNameToken = (token) => {
  const t = (token || "").trim();
  const m = t.match(/^(\d+)\s*:(.+)$/);
  if (!m) return { id: null, name: t };
  return { id: Number(m[1]), name: m[2].trim() };
};

/**
 * Parse system messages (join notifications, invitation responses)
 * Returns structured data if it's a system message, null otherwise
 */
export const parseSystemMessage = (content) => {
  if (!content) return null;

  // Pattern 1: Team join message — with optional role and optional personal message
  // Format A: 👋 Name joined the team as Role!\n\n"personal message"
  // Format B: 👋 Name joined the team as Role!
  // Format C: 👋 Name joined the team!\n\n"personal message"
  // Format D: 👋 Name joined the team!
  const joinWithRoleMatch = content.match(
    /^👋\s+(.+?)\s+joined the team as (.+?)!\s*(?:\n\n"([\s\S]+)")?$/,
  );
  if (joinWithRoleMatch) {
    return {
      type: "team_join",
      userName: joinWithRoleMatch[1].trim(),
      roleName: joinWithRoleMatch[2].trim(),
      personalMessage: joinWithRoleMatch[3]?.trim() ?? null,
    };
  }

  const joinMatch = content.match(
    /^👋\s+(.+?)\s+joined the team!\s*(?:\n\n"([\s\S]+)")?$/,
  );
  if (joinMatch) {
    return {
      type: "team_join",
      userName: joinMatch[1].trim(),
      personalMessage: joinMatch[2]?.trim() ?? null,
    };
  }

  // Pattern 2: Invitation decline response (direct message to inviter)
  // Format: 📋 Response to your invitation for "Team Name":\n\n"personal message"
  const declineMatch = content.match(
    /^📋\s+Response to your invitation for "(.+?)":\s*\n\n"(.+)"$/s,
  );
  if (declineMatch) {
    return {
      type: "invitation_response",
      teamName: declineMatch[1].trim(),
      personalMessage: declineMatch[2].trim(),
    };
  }

  // Pattern 3: Application approved message
  // Supports legacy messages with or without 🎉
  const applicationApprovedMatch = content.match(
    /^(?:🎉\s*)?(.+?)\s+has applied successfully to your team and has been added as a team member by (.+?)\.\s*Say hello to them!$/,
  );

  if (applicationApprovedMatch) {
    return {
      type: "application_approved",
      applicantName: applicationApprovedMatch[1].trim(),
      approverName: applicationApprovedMatch[2].trim(),
    };
  }

  // Pattern 4A: Role application approved message
  // Format: Anna Kowalski's application for Improv Performer was approved
  // Handle both straight (') and curly (') apostrophes from the backend
  const roleApplicationApprovedMatch = content.match(
    /^(.+?)[’']s application for (.+?) was approved\.?$/,
  );
  if (roleApplicationApprovedMatch) {
    const applicant = parseIdNameToken(roleApplicationApprovedMatch[1].trim());
    const role = parseIdNameToken(roleApplicationApprovedMatch[2].trim());

    return {
      type: "role_application_approved",
      applicantId: applicant.id,
      applicantName: applicant.name,
      roleId: role.id,
      roleName: role.name,
    };
  }

  // Pattern 4B: Filled role reopened message
  // Format: 🔓 ROLE_REOPENED: teamId:teamName | roleId:roleName | userId:userName
  const roleReopenedMatch = content.match(
    /^(?:🔓\s*)?ROLE_REOPENED:\s*(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );
  if (roleReopenedMatch) {
    const team = parseIdNameToken(roleReopenedMatch[1].trim());
    const role = parseIdNameToken(roleReopenedMatch[2].trim());
    const user = parseIdNameToken(roleReopenedMatch[3].trim());

    return {
      type: "role_reopened",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      userId: user.id,
      userName: user.name,
    };
  }

  const legacyRoleReopenedMatch = content.match(
    /^(.+?)\s+has left the role\s+(.+?)\.\s+The role is open again to be filled\.$/,
  );
  if (legacyRoleReopenedMatch) {
    return {
      type: "role_reopened",
      userId: null,
      userName: legacyRoleReopenedMatch[1].trim(),
      roleId: null,
      roleName: legacyRoleReopenedMatch[2].trim(),
    };
  }

  const legacyRoleReopenedNoUserMatch = content.match(
    /^🔓\s+The role (.+?) is now open again\.$/,
  );
  if (legacyRoleReopenedNoUserMatch) {
    return {
      type: "role_reopened",
      userId: null,
      userName: null,
      roleId: null,
      roleName: legacyRoleReopenedNoUserMatch[1].trim(),
    };
  }

  // Pattern 4B-admin: Closed role reopened by admin
  // Format: 🔓 ROLE_REOPENED_ADMIN: teamId:teamName | roleId:roleName | adminId:adminName
  const roleReopenedAdminMatch = content.match(
    /^(?:🔓\s*)?ROLE_REOPENED_ADMIN:\s*(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );
  if (roleReopenedAdminMatch) {
    const team = parseIdNameToken(roleReopenedAdminMatch[1].trim());
    const role = parseIdNameToken(roleReopenedAdminMatch[2].trim());
    const admin = parseIdNameToken(roleReopenedAdminMatch[3].trim());

    return {
      type: "role_reopened_admin",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      userId: admin.id,
      userName: admin.name,
    };
  }

  // Pattern 4C: Open role marked as filled message
  // Format: ✅ ROLE_FILLED: teamId:teamName | roleId:roleName | filledUserId:filledUserName | filledById:filledByName
  // (filledBy token is optional for backwards compatibility)
  const roleFilledMatch = content.match(
    /^(?:✅\s*)?ROLE_FILLED:\s*(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)(?:\s+\|\s+(.+))?$/,
  );
  if (roleFilledMatch) {
    const team = parseIdNameToken(roleFilledMatch[1].trim());
    const role = parseIdNameToken(roleFilledMatch[2].trim());
    const user = parseIdNameToken(roleFilledMatch[3].trim());
    const filledBy = roleFilledMatch[4]
      ? parseIdNameToken(roleFilledMatch[4].trim())
      : { id: null, name: null };

    return {
      type: "role_filled",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      userId: user.id,
      userName: user.name,
      filledById: filledBy.id,
      filledByName: filledBy.name,
    };
  }

  // Pattern 4D: Vacant role closed message
  // Format: 🔒 ROLE_CLOSED: teamId:teamName | roleId:roleName | closedById:closedByName
  const roleClosedMatch = content.match(
    /^(?:🔒\s*)?ROLE_CLOSED:\s*(.+?)\s+\|\s+(.+?)(?:\s+\|\s+(.+))?$/,
  );
  if (roleClosedMatch) {
    const team = parseIdNameToken(roleClosedMatch[1].trim());
    const role = parseIdNameToken(roleClosedMatch[2].trim());
    const closedBy = roleClosedMatch[3]
      ? parseIdNameToken(roleClosedMatch[3].trim())
      : { id: null, name: null };

    return {
      type: "role_closed",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      closedById: closedBy.id,
      closedByName: closedBy.name,
    };
  }

  // Pattern 4E: Vacant role updated message
  // Format: ✏️ ROLE_UPDATED: teamId:teamName | roleId:roleName | updatedById:updatedByName
  const roleUpdatedMatch = content.match(
    /^(?:✏️\s*)?ROLE_UPDATED:\s*(.+?)\s+\|\s+(.+?)(?:\s+\|\s+(.+))?$/,
  );
  if (roleUpdatedMatch) {
    const team = parseIdNameToken(roleUpdatedMatch[1].trim());
    const role = parseIdNameToken(roleUpdatedMatch[2].trim());
    const updatedBy = roleUpdatedMatch[3]
      ? parseIdNameToken(roleUpdatedMatch[3].trim())
      : { id: null, name: null };

    return {
      type: "role_updated",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      updatedById: updatedBy.id,
      updatedByName: updatedBy.name,
    };
  }

  // Pattern 4F: Vacant role deleted message
  // Format: 🗑️ ROLE_DELETED: teamId:teamName | roleId:roleName | deletorId:deletorName
  // (deletor token is optional for backwards compatibility)
  const roleDeletedMatch = content.match(
    /^(?:🗑️\s*)?ROLE_DELETED:\s*(.+?)\s+\|\s+(.+?)(?:\s+\|\s+(.+))?$/,
  );
  if (roleDeletedMatch) {
    const team = parseIdNameToken(roleDeletedMatch[1].trim());
    const role = parseIdNameToken(roleDeletedMatch[2].trim());
    const deletor = roleDeletedMatch[3]
      ? parseIdNameToken(roleDeletedMatch[3].trim())
      : { id: null, name: null };

    return {
      type: "role_deleted",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      deletorId: deletor.id,
      deletorName: deletor.name,
    };
  }

  // Pattern 4E: New vacant role created message
  // Format: 🆕 ROLE_CREATED: teamId:teamName | roleId:roleName | creatorId:creatorName
  // (creator token is optional for backwards compatibility)
  const roleCreatedMatch = content.match(
    /^(?:🆕\s*)?ROLE_CREATED:\s*(.+?)\s+\|\s+(.+?)(?:\s+\|\s+(.+))?$/,
  );
  if (roleCreatedMatch) {
    const team = parseIdNameToken(roleCreatedMatch[1].trim());
    const role = parseIdNameToken(roleCreatedMatch[2].trim());
    const creator = roleCreatedMatch[3]
      ? parseIdNameToken(roleCreatedMatch[3].trim())
      : { id: null, name: null };

    return {
      type: "role_created",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      creatorId: creator.id,
      creatorName: creator.name,
    };
  }

  // Pattern 4G: Application approved + role filled combined message
  // Format: ✅ ROLE_APPLICATION_FILLED: teamId:teamName | roleId:roleName | applicantId:applicantName | approverId:approverName
  // (approver token is optional for backwards compatibility)
  const roleApplicationFilledMatch = content.match(
    /^(?:✅\s*)?ROLE_APPLICATION_FILLED:\s*(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)(?:\s+\|\s+(.+))?$/,
  );
  if (roleApplicationFilledMatch) {
    const team = parseIdNameToken(roleApplicationFilledMatch[1].trim());
    const role = parseIdNameToken(roleApplicationFilledMatch[2].trim());
    const applicant = parseIdNameToken(roleApplicationFilledMatch[3].trim());
    const approver = roleApplicationFilledMatch[4]
      ? parseIdNameToken(roleApplicationFilledMatch[4].trim())
      : { id: null, name: null };

    return {
      type: "role_application_filled",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      applicantId: applicant.id,
      applicantName: applicant.name,
      approverId: approver.id,
      approverName: approver.name,
    };
  }

  // Pattern 4G.5: Application approved as a deferred role invitation
  // Format: 📬 ROLE_APPLICATION_DEFERRED_INVITE: teamId:teamName | roleId:roleName | applicantId:applicantName | approverId:approverName | currentRoleId:currentRoleName
  const roleApplicationDeferredInviteMatch = content.match(
    /^(?:📬\s*)?ROLE_APPLICATION_DEFERRED_INVITE:\s*(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );
  if (roleApplicationDeferredInviteMatch) {
    const team = parseIdNameToken(roleApplicationDeferredInviteMatch[1].trim());
    const role = parseIdNameToken(roleApplicationDeferredInviteMatch[2].trim());
    const applicant = parseIdNameToken(roleApplicationDeferredInviteMatch[3].trim());
    const approver = parseIdNameToken(roleApplicationDeferredInviteMatch[4].trim());
    const currentRole = parseIdNameToken(roleApplicationDeferredInviteMatch[5].trim());

    return {
      type: "role_application_deferred_invite",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      applicantId: applicant.id,
      applicantName: applicant.name,
      approverId: approver.id,
      approverName: approver.name,
      currentRoleId: currentRole.id,
      currentRoleName: currentRole.name,
    };
  }

  // Pattern 4H: Invitation accepted + role filled combined message
  // Format: ✅ ROLE_INVITATION_FILLED: teamId:teamName | roleId:roleName | inviteeId:inviteeName
  const roleInvitationFilledMatch = content.match(
    /^(?:✅\s*)?ROLE_INVITATION_FILLED:\s*(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );
  if (roleInvitationFilledMatch) {
    const team = parseIdNameToken(roleInvitationFilledMatch[1].trim());
    const role = parseIdNameToken(roleInvitationFilledMatch[2].trim());
    const invitee = parseIdNameToken(roleInvitationFilledMatch[3].trim());

    return {
      type: "role_invitation_filled",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      inviteeId: invitee.id,
      inviteeName: invitee.name,
    };
  }

  // Pattern 4I: Invitation accepted (frontend message with inviter + fillRole flag)
  // Format: 🤝 ROLE_INVITATION_ACCEPTED: teamId:teamName | roleId:roleName | inviteeId:inviteeName | inviterId:inviterName | true/false
  const roleInvitationAcceptedMatch = content.match(
    /^(?:🤝\s*)?ROLE_INVITATION_ACCEPTED:\s*(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/,
  );
  if (roleInvitationAcceptedMatch) {
    const team = parseIdNameToken(roleInvitationAcceptedMatch[1].trim());
    const role = parseIdNameToken(roleInvitationAcceptedMatch[2].trim());
    const invitee = parseIdNameToken(roleInvitationAcceptedMatch[3].trim());
    const inviter = parseIdNameToken(roleInvitationAcceptedMatch[4].trim());

    return {
      type: "role_invitation_accepted",
      teamId: team.id,
      teamName: team.name,
      roleId: role.id,
      roleName: role.name,
      inviteeId: invitee.id,
      inviteeName: invitee.name,
      inviterId: inviter.id,
      inviterName: inviter.name,
      fillRole: roleInvitationAcceptedMatch[5] === "true",
    };
  }

  // Pattern 4J: Backend "assigned to role" message (sent when invitation is accepted)
  // Format: 🎯 Name was assigned the role RoleName!\n\n"personal message"
  const roleInvitationAssignedMatch = content.match(
    /^🎯\s+(.+?)\s+was assigned the role\s+(.+?)!(?:\s*\n+"(.+)")?$/s,
  );
  if (roleInvitationAssignedMatch) {
    return {
      type: "role_invitation_assigned_legacy",
      inviteeName: roleInvitationAssignedMatch[1].trim(),
      roleName: roleInvitationAssignedMatch[2].trim(),
      personalMessage: roleInvitationAssignedMatch[3]?.trim() ?? null,
    };
  }

  // Pattern 4E: Application decline response (direct message to applicant)
  // Format: 📋 Application declined: [Applicant] for "[Team]":\n\n"personal message"
  const applicationDeclineMatch = content.match(
    /^📋\s+Application declined:\s+(.+?)\s+for\s+"(.+?)":\s*\n\n"(.+)"$/s,
  );
  if (applicationDeclineMatch) {
    return {
      type: "application_response",
      applicantName: applicationDeclineMatch[1].trim(),
      teamName: applicationDeclineMatch[2].trim(),
      personalMessage: applicationDeclineMatch[3].trim(),
    };
  }

  // Pattern 5A (NEW): Team leave message with userId
  // Format: 🚪 MEMBER_LEFT:<userId>:<displayName>
  // Also accepts raw backend payloads without the emoji prefix.
  const leaveIdMatch = content.match(/^(?:🚪\s*)?MEMBER_LEFT:(\d+):(.+)$/);
  if (leaveIdMatch) {
    return {
      type: "team_leave",
      userId: Number(leaveIdMatch[1]),
      userName: leaveIdMatch[2].trim(),
    };
  }

  // Pattern 5B (LEGACY): Team leave message
  // Format: 🚪 Name has left the team.
  const leaveMatch = content.match(/^🚪\s+(.+?)\s+has left the team\.$/);
  if (leaveMatch) {
    return {
      type: "team_leave",
      userId: null,
      userName: leaveMatch[1].trim(),
    };
  }

  // Pattern 5C: User left Lomir message
  // Format: 🚪 Name has left Lomir.
  const userLeftLomirMatch = content.match(/^🚪\s+(.+?)\s+has left Lomir\.$/);
  if (userLeftLomirMatch) {
    return {
      type: "user_left_lomir",
      userId: null,
      userName: userLeftLomirMatch[1].trim(),
    };
  }

  // Pattern 5D (NEW): Member removed public message (team chat)
  // Format: 🚫 MEMBER_REMOVED_PUBLIC: <teamId>:<teamName> | <memberId>:<memberName>
  // Also accepts raw backend payloads without the emoji prefix.
  const removedPublicMatch = content.match(
    /^(?:🚫\s*)?MEMBER_REMOVED_PUBLIC:\s*(.+?)\s*\|\s*(.+)$/,
  );

  if (removedPublicMatch) {
    const team = parseIdNameToken(removedPublicMatch[1].trim());
    const member = parseIdNameToken(removedPublicMatch[2].trim());

    return {
      type: "member_removed_public",
      teamId: team.id,
      teamName: team.name,
      userId: member.id,
      userName: member.name,
    };
  }

  // Pattern 6: Application declined message
  // Format: 🚫 APPLICATION_DECLINED: teamId:teamName | approverId:approverName | applicantId:applicantName | hasPersonalMessage
  const applicationDeclinedMatch = content.match(
    /^🚫\s+APPLICATION_DECLINED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/,
  );

  if (applicationDeclinedMatch) {
    const teamToken = applicationDeclinedMatch[1].trim(); // "id:name" OR legacy "name"
    const approverToken = applicationDeclinedMatch[2].trim();
    const applicantToken = applicationDeclinedMatch[3].trim();

    const team = parseIdNameToken(teamToken);
    const approver = parseIdNameToken(approverToken);
    const applicant = parseIdNameToken(applicantToken);

    return {
      type: "application_declined",
      teamId: team.id,
      teamName: team.name,
      approverId: approver.id,
      approverName: approver.name,
      applicantId: applicant.id,
      applicantName: applicant.name,
      hasPersonalMessage: applicationDeclinedMatch[4] === "true",
    };
  }

  // Pattern 7: Application approved DM message
  // Format: ✅ APPLICATION_APPROVED: teamId:teamName | approverId:approverName | applicantId:applicantName | hasPersonalMessage
  const applicationApprovedDmMatch = content.match(
    /^✅\s+APPLICATION_APPROVED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/,
  );
  if (applicationApprovedDmMatch) {
    const teamToken = applicationApprovedDmMatch[1].trim(); // "id:name" OR legacy "name"
    const approverToken = applicationApprovedDmMatch[2].trim();
    const applicantToken = applicationApprovedDmMatch[3].trim();

    const team = parseIdNameToken(teamToken);
    const approver = parseIdNameToken(approverToken);
    const applicant = parseIdNameToken(applicantToken);

    return {
      type: "application_approved_dm",
      teamId: team.id, // ✅ new
      teamName: team.name, // ✅ now without "124:"
      approverId: approver.id,
      approverName: approver.name,
      applicantId: applicant.id,
      applicantName: applicant.name,
      hasPersonalMessage: applicationApprovedDmMatch[4] === "true",
    };
  }

  // Pattern 8: Invitation declined message
  // Format: 🚫 INVITATION_DECLINED: Team Name | Inviter Name | Invitee Name | hasPersonalMessage
  const invitationDeclinedMatch = content.match(
    /^🚫\s+INVITATION_DECLINED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/,
  );
  if (invitationDeclinedMatch) {
    const teamToken = invitationDeclinedMatch[1].trim(); // "id:name" or legacy "name"
    const inviterToken = invitationDeclinedMatch[2].trim(); // "id:name" or legacy "name"
    const inviteeToken = invitationDeclinedMatch[3].trim(); // "id:name" or legacy "name"

    const team = parseIdNameToken(teamToken);
    const inviter = parseIdNameToken(inviterToken);
    const invitee = parseIdNameToken(inviteeToken);

    return {
      type: "invitation_declined",
      teamId: team.id,
      teamName: team.name,
      inviterId: inviter.id,
      inviterName: inviter.name,
      inviteeId: invitee.id,
      inviteeName: invitee.name,
      hasPersonalMessage: invitationDeclinedMatch[4] === "true",
    };
  }

  // Pattern 9: Invitation cancelled message
  // Format: 🚫 INVITATION_CANCELLED: teamId:teamName | cancellerId:cancellerName | inviteeId:inviteeName
  // (Legacy tolerated: names without ids)
  const invitationCancelledMatch = content.match(
    /^🚫\s+INVITATION_CANCELLED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );

  if (invitationCancelledMatch) {
    const teamToken = invitationCancelledMatch[1].trim();
    const cancellerToken = invitationCancelledMatch[2].trim();
    const inviteeToken = invitationCancelledMatch[3].trim();

    const team = parseIdNameToken(teamToken);
    const canceller = parseIdNameToken(cancellerToken);
    const invitee = parseIdNameToken(inviteeToken);

    return {
      type: "invitation_cancelled",
      teamId: team.id,
      teamName: team.name,
      cancellerId: canceller.id,
      cancellerName: canceller.name,
      inviteeId: invitee.id,
      inviteeName: invitee.name,
    };
  }

  // Pattern 10: Application cancelled message
  // Format: 🚫 APPLICATION_CANCELLED: teamId:teamName | applicantId:applicantName | adminId:adminName
  // (Legacy tolerated: teamName | applicantName | adminName)
  const applicationCancelledMatch = content.match(
    /^🚫\s+APPLICATION_CANCELLED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );

  if (applicationCancelledMatch) {
    const teamToken = applicationCancelledMatch[1].trim();
    const applicantToken = applicationCancelledMatch[2].trim();
    const adminToken = applicationCancelledMatch[3].trim();

    const team = parseIdNameToken(teamToken);
    const applicant = parseIdNameToken(applicantToken);
    const admin = parseIdNameToken(adminToken);

    return {
      type: "application_cancelled",
      teamId: team.id,
      teamName: team.name,
      applicantId: applicant.id,
      applicantName: applicant.name,
      adminId: admin.id,
      adminName: admin.name,
    };
  }

  // Pattern 11: Member removed message
  // Format: 🚫 MEMBER_REMOVED: teamId:teamName | removerId:removerName | memberId:memberName
  // (Legacy tolerated: "teamName" without id)
  const memberRemovedMatch = content.match(
    /^🚫\s+MEMBER_REMOVED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );

  if (memberRemovedMatch) {
    const teamToken = memberRemovedMatch[1].trim(); // "id:name" OR "name"
    const removerToken = memberRemovedMatch[2].trim(); // "id:name" OR "name"
    const memberToken = memberRemovedMatch[3].trim(); // "id:name" OR "name"

    const team = parseIdNameToken(teamToken);
    const remover = parseIdNameToken(removerToken);
    const member = parseIdNameToken(memberToken);

    return {
      type: "member_removed",
      teamId: team.id,
      teamName: team.name,
      removerId: remover.id,
      removerName: remover.name,
      memberId: member.id,
      memberName: member.name,
    };
  }

  // Pattern 12: Role changed message
  // Format: 🔄 ROLE_CHANGED: Team Name | Changer Name | Member Name | Old Role | New Role
  const roleChangedMatch = content.match(
    /^🔄\s+ROLE_CHANGED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );
  if (roleChangedMatch) {
    const teamToken = roleChangedMatch[1].trim(); // "teamId:teamName" OR just "teamName" (legacy)
    const changerToken = roleChangedMatch[2].trim(); // "id:name" or "name"
    const memberToken = roleChangedMatch[3].trim(); // "id:name" or "name"

    const team = parseIdNameToken(teamToken);
    const changer = parseIdNameToken(changerToken);
    const member = parseIdNameToken(memberToken);

    return {
      type: "role_changed",
      teamId: team.id,
      teamName: team.name,
      changerId: changer.id,
      changerName: changer.name,
      memberId: member.id,
      memberName: member.name,
      oldRole: roleChangedMatch[4].trim(),
      newRole: roleChangedMatch[5].trim(),
    };
  }
  // Pattern 13: Ownership transferred message (DM)
  // Format (new): 👑 OWNERSHIP_TRANSFERRED: teamId:teamName | prevOwnerId:prevOwnerName | newOwnerId:newOwnerName
  // Format (legacy): 👑 OWNERSHIP_TRANSFERRED: teamName | prevOwnerName | newOwnerName
  const ownershipTransferredMatch = content.match(
    /^(?:👑\s*)?OWNERSHIP_TRANSFERRED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/,
  );

  if (ownershipTransferredMatch) {
    const teamToken = ownershipTransferredMatch[1].trim(); // "id:name" or "name"
    const prevToken = ownershipTransferredMatch[2].trim(); // "id:name" or "name"
    const newToken = ownershipTransferredMatch[3].trim(); // "id:name" or "name"

    const team = parseIdNameToken(teamToken);
    const prev = parseIdNameToken(prevToken);
    const next = parseIdNameToken(newToken);

    return {
      type: "ownership_transferred",
      teamId: team.id,
      teamName: team.name,
      prevOwnerId: prev.id,
      prevOwnerName: prev.name,
      newOwnerId: next.id,
      newOwnerName: next.name,
    };
  }

  // Pattern 14: Ownership transferred team chat message
  const ownershipTeamMatch = content.match(
    /^(?:👑\s*)?OWNERSHIP_TEAM:\s+(.+?)\s+\|\s+(.+)$/,
  );
  if (ownershipTeamMatch) {
    return {
      type: "ownership_team",
      prevOwnerName: ownershipTeamMatch[1].trim(),
      newOwnerName: ownershipTeamMatch[2].trim(),
    };
  }

  // Pattern 15: Team deleted message
  const teamDeletedMatch = content.match(
    /^🗑️\s+TEAM_DELETED:\s+(.+?)\s+\|\s+(.+)$/,
  );
  if (teamDeletedMatch) {
    const team = parseIdNameToken(teamDeletedMatch[1].trim());
    const owner = parseIdNameToken(teamDeletedMatch[2].trim());

    return {
      type: "team_deleted",
      teamId: team.id,
      teamName: team.name,
      ownerId: owner.id,
      ownerName: owner.name,
    };
  }

  return null;
};
