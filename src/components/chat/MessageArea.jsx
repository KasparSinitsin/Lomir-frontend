import { ChevronLeft } from "lucide-react";
import ConversationHeader from "./ConversationHeader";
import ArchivedTeamBanner from "./ArchivedTeamBanner";
import MessageDisplay from "./MessageDisplay";
import MessageInput from "./MessageInput";

// Right column of the chat page: conversation header + message stream + (archived
// banner) + message input, or an empty prompt when no conversation is selected.
// Presentational — all data + handlers come from Chat.jsx (the orchestrator).
// Extracted verbatim from Chat.jsx's render (Stage 7). `messagesContainerRef` is
// the scroll container ref owned by Chat, passed through as a plain prop.
const MessageArea = ({
  showChatView,
  conversationId,
  onBack,
  messagesContainerRef,
  // header
  showCompactConversationHeader,
  conversationType,
  teamData,
  conversationPartner,
  activeConversation,
  conversationUpdatedAt,
  onTeamClick,
  onUserClick,
  // message display
  messages,
  currentUserId,
  loadingMessages,
  typingUsers,
  teamMembers,
  highlightMessageIds,
  hasMoreMessages,
  loadingMore,
  teamMembersRefreshSignal,
  onLoadEarlierMessages,
  onDeleteConversation,
  onDeleteMessage,
  onEditMessage,
  onLeaveTeam,
  onReply,
  searchQuery,
  // archived banner
  isActiveTeamArchived,
  isCurrentUserActiveTeamMember,
  activeTeamArchiveTimeRemaining,
  // message input
  onSendMessage,
  onSendImage,
  onSendFile,
  onTyping,
  canSendInActiveConversation,
  participants,
  replyingTo,
  onClearReply,
}) => (
  <div
    className={`bg-white shadow-soft rounded-xl overflow-hidden flex flex-col min-w-0 transition-all duration-300 ${
      showChatView ? "w-full md:w-2/3" : "hidden md:flex md:w-2/3"
    }`}
  >
    {conversationId ? (
      <>
        <ConversationHeader
          showCompactConversationHeader={showCompactConversationHeader}
          onBack={onBack}
          conversationType={conversationType}
          teamData={teamData}
          conversationPartner={conversationPartner}
          activeConversation={activeConversation}
          conversationUpdatedAt={conversationUpdatedAt}
          onTeamClick={onTeamClick}
          onUserClick={onUserClick}
        />

        <div ref={messagesContainerRef} className="flex-grow overflow-y-auto p-4">
          <MessageDisplay
            messages={messages}
            currentUserId={currentUserId}
            conversationPartner={conversationPartner}
            teamData={teamData}
            loading={loadingMessages}
            typingUsers={typingUsers}
            conversationType={conversationType}
            teamMembers={teamMembers}
            highlightMessageIds={highlightMessageIds}
            hasMoreMessages={hasMoreMessages}
            loadingMore={loadingMore}
            teamMembersRefreshSignal={teamMembersRefreshSignal}
            onLoadEarlierMessages={onLoadEarlierMessages}
            onDeleteConversation={onDeleteConversation}
            onDeleteMessage={onDeleteMessage}
            onEditMessage={onEditMessage}
            onLeaveTeam={onLeaveTeam}
            onReply={onReply}
            searchQuery={searchQuery}
          />
        </div>

        {/* Deleted team banner + message input */}
        <div className="border-t border-base-200">
          {/* Show banner for archived teams */}
          {isActiveTeamArchived &&
            conversationType === "team" &&
            isCurrentUserActiveTeamMember && (
            <ArchivedTeamBanner
              timeRemaining={activeTeamArchiveTimeRemaining}
              onLeave={() => onLeaveTeam()}
            />
          )}

          <div className="p-4">
            <MessageInput
              onSendMessage={onSendMessage}
              onSendImage={onSendImage}
              onSendFile={onSendFile}
              onTyping={onTyping}
              disabled={!canSendInActiveConversation}
              participants={participants}
              replyingTo={replyingTo}
              onClearReply={onClearReply}
            />
          </div>
        </div>
      </>
    ) : (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-base-content/70">
          Select a conversation to start chatting
        </p>
        <button
          onClick={onBack}
          className="md:hidden flex items-center gap-2 btn btn-sm btn-outline"
        >
          <ChevronLeft size={16} />
          Back to conversations
        </button>
      </div>
    )}
  </div>
);

export default MessageArea;
