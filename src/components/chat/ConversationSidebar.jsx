import ConversationList from "./ConversationList";

// Left column of the chat page: the scrollable conversation list. Presentational —
// all data + handlers come from Chat.jsx (the orchestrator). Extracted verbatim
// from Chat.jsx's render (Stage 7). `fullWidth` collapses the previous inline
// className condition (empty state / search / no active panel -> full width).
const ConversationSidebar = ({
  fullWidth,
  conversations,
  activeConversationId,
  activeConversationType,
  onSelectConversation,
  loading,
  onlineUsers,
  onActiveConversationVisibilityChange,
  teamMembersRefreshSignal,
  emptyState,
  searchQuery,
  chatVisible,
  currentUser,
}) => (
  <div
    data-conversation-list-viewport="true"
    className={`lomir-conversation-list-scrollbar overflow-y-auto transition-all duration-300 ${
      fullWidth ? "w-full" : "hidden md:block md:w-1/3"
    }`}
    style={{ direction: "rtl" }}
  >
    <div className="h-full" style={{ direction: "ltr" }}>
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        activeConversationType={activeConversationType}
        onSelectConversation={onSelectConversation}
        loading={loading}
        onlineUsers={onlineUsers}
        onActiveConversationVisibilityChange={onActiveConversationVisibilityChange}
        teamMembersRefreshSignal={teamMembersRefreshSignal}
        emptyState={emptyState}
        searchQuery={searchQuery}
        chatVisible={chatVisible}
        currentUser={currentUser}
      />
    </div>
  </div>
);

export default ConversationSidebar;
