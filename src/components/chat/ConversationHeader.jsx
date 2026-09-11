import Tooltip from "../common/Tooltip";
import { useTranslation } from "react-i18next";
import { CountBadge } from "../common/NotificationBadge";
import UserAvatar from "../users/UserAvatar";
import TeamAvatar from "../teams/TeamAvatar";
import { ChevronLeft, Users, User, FlaskConical } from "lucide-react";
import {
  isSyntheticTeam,
  isSyntheticUser,
} from "../../utils/userHelpers";
import { formatRelativeChatTimestamp } from "../../utils/dateHelpers";

// Compact conversation header for the chat page: avatar, name, and meta line
// (team member count / DM label, demo overlay, relative timestamp), plus a
// mobile back button. Presentational — all data and click handlers are passed
// in by Chat.jsx. Extracted verbatim from Chat.jsx (Stage 3 decomposition).
const ConversationHeader = ({
  showCompactConversationHeader,
  onBack,
  conversationType,
  teamData,
  conversationPartner,
  activeConversation,
  conversationUpdatedAt,
  onTeamClick,
  onUserClick,
}) => {
  const { t } = useTranslation();

  /**
   * Both halves of a person's name are optional, so the join can be empty.
   * An empty interpolation would render "View  details", and in German the
   * sentence would lose its object entirely - hence a separate key rather
   * than an interpolated blank.
   */
  const detailsTooltip = (name) =>
    name ? t("chatHeader.viewDetails", { name }) : t("chatHeader.viewDetailsGeneric");

  const partnerName = [conversationPartner?.firstName, conversationPartner?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
              <div
                className={`flex items-center justify-between border-b border-base-200 p-3 md:p-4 bg-base-100 ${
                  showCompactConversationHeader ? "md:flex" : "md:hidden"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Back/List toggle button - visible on small screens */}
                  <Tooltip
                    content={t("chatHeader.backToList")}
                    position="bottom"
                    wrapperClassName="md:hidden inline-flex items-center flex-shrink-0"
                  >
                    <button
                      onClick={onBack}
                      className="flex items-center justify-center p-2 hover:bg-base-200 rounded-lg transition-colors"
                      aria-label={t("chatHeader.backToList")}
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </Tooltip>
                  
                  {/* Conversation Header - Avatar and name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {conversationType === "team" && teamData ? (
                      <Tooltip
                        content={detailsTooltip(teamData.name)}
                        position="bottom"
                        wrapperClassName="inline-flex items-center flex-shrink-0"
                      >
                        <div className="relative">
                          <TeamAvatar
                            team={teamData}
                            sizeClass="w-10 h-10"
                            clickable={true}
                            onClick={onTeamClick}
                            initialsClassName="text-sm font-medium"
                            showDemoOverlay={isSyntheticTeam(teamData)}
                            demoOverlayTextClassName="text-[7px]"
                          />
                          {(activeConversation?.unreadCount ?? activeConversation?.unread_count ?? 0) > 0 && (
                            <CountBadge
                              count={activeConversation.unreadCount ?? activeConversation.unread_count}
                              className="absolute -top-1 -left-2 z-10"
                            />
                          )}
                        </div>
                      </Tooltip>
                    ) : conversationPartner ? (
                      <Tooltip
                        content={detailsTooltip(partnerName)}
                        position="bottom"
                        wrapperClassName="inline-flex items-center flex-shrink-0"
                      >
                        <div
                          className="cursor-pointer hover:opacity-80 transition-opacity relative"
                          onClick={onUserClick}
                        >
                          <UserAvatar
                            user={conversationPartner}
                            sizeClass="w-10 h-10"
                            iconSize={20}
                            initialsClassName="text-sm font-medium"
                            showDemoOverlay
                            demoOverlayTextClassName="text-[7px]"
                            demoOverlayTextTranslateClassName="-translate-y-[2px]"
                          />
                          {(activeConversation?.unreadCount ?? activeConversation?.unread_count ?? 0) > 0 && (
                            <CountBadge
                              count={activeConversation.unreadCount ?? activeConversation.unread_count}
                              className="absolute -top-1 -left-2 z-10"
                            />
                          )}
                        </div>
                      </Tooltip>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <Tooltip
                        content={
                          conversationType === "team"
                            ? detailsTooltip(teamData?.name)
                            : detailsTooltip(partnerName)
                        }
                        position="bottom"
                        wrapperClassName="block min-w-0"
                      >
                        <h3
                          className="font-medium truncate text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={conversationType === "team" ? onTeamClick : onUserClick}
                        >
                          {conversationType === "team" ? teamData?.name : partnerName}
                        </h3>
                      </Tooltip>
                      {conversationType === "team" ? (
                        <div className="text-xs text-base-content/60 flex items-center justify-between gap-1.5 flex-nowrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Users size={12} className="flex-shrink-0" />
                            <span className="truncate">
                              {teamData?.members
                                ? t("chatHeader.teamChatMembers", {
                                    count: teamData.members.length,
                                  })
                                : t("chatHeader.teamChat")}
                            </span>
                            {isSyntheticTeam(teamData) && (
                              <Tooltip
                                content={t("demo.teamTooltip")}
                                wrapperClassName="flex items-center gap-0.5 text-base-content/50 flex-shrink-0"
                              >
                                <FlaskConical size={10} className="flex-shrink-0" />
                              </Tooltip>
                            )}
                          </div>
                          {conversationUpdatedAt && (
                            <span className="text-xs text-base-content/50 whitespace-nowrap ml-2">
                              {formatRelativeChatTimestamp(conversationUpdatedAt)}
                            </span>
                          )}
                        </div>
                      ) : conversationType === "direct" ? (
                        <div className="text-xs text-base-content/60 flex items-center justify-between gap-1.5 flex-nowrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User size={12} className="flex-shrink-0" />
                            <span className="truncate">{t("chatHeader.directChat")}</span>
                            {isSyntheticUser(conversationPartner) && (
                              <Tooltip
                                content={t("demo.profileTooltip")}
                                wrapperClassName="flex items-center gap-0.5 text-base-content/50 flex-shrink-0"
                              >
                                <FlaskConical size={10} className="flex-shrink-0" />
                              </Tooltip>
                            )}
                          </div>
                          {conversationUpdatedAt && (
                            <span className="text-xs text-base-content/50 whitespace-nowrap ml-2">
                              {formatRelativeChatTimestamp(conversationUpdatedAt)}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
  );
};

export default ConversationHeader;
