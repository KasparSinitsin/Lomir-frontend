import React, { useRef, useEffect } from "react";
import { format, isToday, isYesterday } from "date-fns";

const MessageDisplay = ({
  messages,
  currentUserId,
  conversationPartner,
  loading,
  typingUsers = [],
}) => {
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change or when someone is typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading loading-spinner loading-md text-primary"></div>
      </div>
    );
  }

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-base-content/70">No messages yet</p>
        <p className="text-sm text-base-content/50 mt-2">
          Send a message to start the conversation
        </p>
      </div>
    );
  }

  // Group messages by date
  const messagesByDate = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt);
    const dateString = format(date, "yyyy-MM-dd");

    if (!groups[dateString]) {
      groups[dateString] = [];
    }

    groups[dateString].push(message);
    return groups;
  }, {});

  const formatDateHeading = (dateString) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return "Today";
    }

    if (isYesterday(date)) {
      return "Yesterday";
    }

    return format(date, "EEEE, MMMM d, yyyy");
  };

  return (
    <div className="space-y-6">
      {conversationPartner && (
        <div className="text-center pb-4 mb-4 border-b border-base-200">
          <div className="avatar mb-2">
            <div className="w-16 h-16 rounded-full mx-auto">
              {conversationPartner.avatarUrl ? (
                <img
                  src={conversationPartner.avatarUrl}
                  alt={conversationPartner.username}
                  className="object-cover"
                />
              ) : (
                <div className="bg-primary text-primary-content flex items-center justify-center">
                  <span className="text-xl">
                    {conversationPartner.firstName?.charAt(0) ||
                      conversationPartner.username?.charAt(0) ||
                      "?"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <h3 className="font-medium">
            {conversationPartner.firstName && conversationPartner.lastName
              ? `${conversationPartner.firstName} ${conversationPartner.lastName}`
              : conversationPartner.username}
          </h3>
        </div>
      )}

      {/* Group messages by date */}
      {Object.entries(messagesByDate).map(([dateString, messagesForDate]) => (
        <div key={dateString} className="space-y-4">
          <div className="text-center">
            <div className="badge badge-neutral badge-sm">
              {formatDateHeading(dateString)}
            </div>
          </div>

          {/* Render messages for this date */}
          {messagesForDate.map((message, index) => {
            const isCurrentUser = message.senderId === currentUserId;
            const showAvatar =
              index === 0 ||
              messagesForDate[index - 1].senderId !== message.senderId;

            return (
              <div
                key={`${message.id}-${dateString}-${index}`}
                className={`flex ${
                  isCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isCurrentUser && showAvatar && conversationPartner && (
                  <div className="avatar mr-2 self-end">
                    <div className="w-8 h-8 rounded-full">
                      {conversationPartner.avatarUrl ? (
                        <img
                          src={conversationPartner.avatarUrl}
                          alt={conversationPartner.username}
                          className="object-cover"
                        />
                      ) : (
                        <div className="bg-primary text-primary-content flex items-center justify-center">
                          <span className="text-sm">
                            {conversationPartner.firstName?.charAt(0) ||
                              conversationPartner.username?.charAt(0) ||
                              "?"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div
                  className={`
                    max-w-[70%] rounded-lg p-3 
                    ${
                      isCurrentUser
                        ? "bg-primary text-primary-content rounded-br-none"
                        : "bg-base-200 rounded-bl-none"
                    }
                  `}
                >
                  <p>{message.content}</p>
                  <div
                    className={`
                      flex justify-between items-center text-xs mt-1 
                      ${
                        isCurrentUser
                          ? "text-primary-content/80"
                          : "text-base-content/50"
                      }
                    `}
                  >
                    <span>{format(new Date(message.createdAt), "p")}</span>
                    {isCurrentUser && message.readAt && (
                      <span className="ml-2">✓</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Typing animation */}
      {typingUsers.length > 0 && (
        <div className="flex justify-start">
          <div className="bg-base-200 rounded-lg p-3 rounded-bl-none">
            <div className="flex items-center">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-sm ml-2">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageDisplay;