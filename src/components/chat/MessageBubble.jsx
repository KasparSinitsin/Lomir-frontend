import React, { forwardRef } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  Pencil,
  Reply,
  Trash2,
  X,
} from "lucide-react";
import { formatLocalTime } from "../../utils/dateHelpers";
import { getFileExpirationStatus } from "../../utils/fileExpiration";
import {
  formatReplyTooltipText,
  getEventReactionPreview,
  getFileIcon,
} from "../../utils/messageDisplayHelpers";
import { renderReplyContent } from "../../utils/messageDisplayRenderers";
import Tooltip from "../common/Tooltip";
import FileAttachment from "./FileAttachment";
import MessageText from "./MessageText";
import ReadReceipt from "./ReadReceipt";

const buildReplyPreview = (message, messagesById) => {
  const replySourceMessage = message.replyTo?.id
    ? messagesById.get(String(message.replyTo.id))
    : null;

  if (!message.replyTo) return null;

  return {
    ...replySourceMessage,
    ...message.replyTo,
    content: message.replyTo.content ?? replySourceMessage?.content,
    createdAt:
      message.replyTo.createdAt ||
      message.replyTo.created_at ||
      replySourceMessage?.createdAt ||
      replySourceMessage?.created_at,
    imageUrl:
      message.replyTo.imageUrl ||
      message.replyTo.image_url ||
      replySourceMessage?.imageUrl ||
      replySourceMessage?.image_url,
    fileUrl:
      message.replyTo.fileUrl ||
      message.replyTo.file_url ||
      replySourceMessage?.fileUrl ||
      replySourceMessage?.file_url,
    fileName:
      message.replyTo.fileName ||
      message.replyTo.file_name ||
      replySourceMessage?.fileName ||
      replySourceMessage?.file_name,
    fileSize:
      message.replyTo.fileSize ||
      message.replyTo.file_size ||
      replySourceMessage?.fileSize ||
      replySourceMessage?.file_size,
    fileExpiresAt:
      message.replyTo.fileExpiresAt ||
      message.replyTo.file_expires_at ||
      replySourceMessage?.fileExpiresAt ||
      replySourceMessage?.file_expires_at,
    fileDeletedAt:
      message.replyTo.fileDeletedAt ||
      message.replyTo.file_deleted_at ||
      replySourceMessage?.fileDeletedAt ||
      replySourceMessage?.file_deleted_at,
  };
};

const scrollToReplySource = (replyPreview) => {
  const targetEl = document.querySelector(
    `[data-message-id="${replyPreview.id}"]`,
  );

  if (!targetEl) return;

  targetEl.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  targetEl.classList.add("bg-primary/10");
  setTimeout(() => targetEl.classList.remove("bg-primary/10"), 2000);
};

const MessageActions = ({
  canReplyMessage,
  canEditMessage,
  canDeleteMessage,
  message,
  senderInfo,
  onReply,
  onEditStart,
  onDeleteMessage,
}) => (
  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
    {canReplyMessage && (
      <Tooltip content="React" position="top" wrapperClassName="inline-flex">
        <button
          type="button"
          onClick={() =>
            onReply({
              id: message.id,
              content: message.content,
              createdAt: message.createdAt || message.created_at,
              imageUrl: message.imageUrl || message.image_url,
              fileUrl: message.fileUrl || message.file_url,
              fileName: message.fileName || message.file_name,
              fileSize: message.fileSize || message.file_size,
              fileExpiresAt: message.fileExpiresAt || message.file_expires_at,
              fileDeletedAt: message.fileDeletedAt || message.file_deleted_at,
              senderId: message.senderId || message.sender_id,
              senderUsername:
                senderInfo?.username ||
                message.senderUsername ||
                message.sender_username,
              senderFirstName:
                senderInfo?.firstName ||
                senderInfo?.first_name ||
                message.senderFirstName ||
                message.sender_first_name,
            })
          }
          className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow"
          aria-label="React to message"
        >
          <Reply size={14} className="text-base-content/50 hover:text-primary" />
        </button>
      </Tooltip>
    )}

    {canEditMessage && (
      <Tooltip content="Edit message" position="top" wrapperClassName="inline-flex">
        <button
          type="button"
          onClick={() => onEditStart(message)}
          className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow"
          aria-label="Edit message"
        >
          <Pencil size={14} className="text-base-content/50 hover:text-primary" />
        </button>
      </Tooltip>
    )}

    {canDeleteMessage && (
      <Tooltip content="Delete message" position="top" wrapperClassName="inline-flex">
        <button
          type="button"
          onClick={() => onDeleteMessage(message.id)}
          className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow"
          aria-label="Delete message"
        >
          <Trash2 size={14} className="text-base-content/50 hover:text-error" />
        </button>
      </Tooltip>
    )}
  </div>
);

const ReplyPreview = ({ replyPreview }) => {
  const replyImageUrl = replyPreview?.imageUrl || replyPreview?.image_url;
  const replyFileUrl = replyPreview?.fileUrl || replyPreview?.file_url;
  const replyFileName = replyPreview?.fileName || replyPreview?.file_name;
  const replyFileDeletedAt =
    replyPreview?.fileDeletedAt || replyPreview?.file_deleted_at;
  const replyExpirationStatus = replyPreview
    ? getFileExpirationStatus(replyPreview)
    : { status: "active" };
  const replyMediaExpired =
    replyExpirationStatus.status === "expired" || Boolean(replyFileDeletedAt);
  const replyHasMedia = Boolean(replyImageUrl || replyFileUrl || replyFileName);
  const ReplyFileIcon = getFileIcon(replyFileName);
  const replyEventPreview = replyPreview?.content
    ? getEventReactionPreview(replyPreview.content)
    : null;
  const ReplyEventIcon = replyEventPreview?.Icon;
  const ReplyEventTrailingIcon = replyEventPreview?.trailingIcon;

  return (
    <div
      onClick={() => scrollToReplySource(replyPreview)}
      className="mb-1.5 px-2.5 py-1.5 rounded-lg bg-white cursor-pointer hover:bg-white transition-colors max-w-full"
    >
      <p className="text-xs font-semibold text-primary truncate">
        {replyPreview.senderFirstName ||
          replyPreview.senderUsername ||
          "Former Lomir User"}
      </p>
      <Tooltip
        content={
          replyHasMedia && !replyPreview.content
            ? replyMediaExpired
              ? "Image or file no longer available"
              : replyExpirationStatus.status !== "none"
                ? replyExpirationStatus.message
                : replyImageUrl
                  ? "Image"
                  : replyFileName || "File"
            : formatReplyTooltipText(replyPreview.content, replyEventPreview)
        }
        position="top"
        wrapperClassName="block min-w-0 max-w-full"
      >
        {replyHasMedia && replyMediaExpired ? (
          <div className="mt-1 flex min-w-0 items-center gap-2 text-warning">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="text-xs font-medium truncate">
              Image or file no longer available
            </p>
          </div>
        ) : replyImageUrl ? (
          <div className="mt-1 min-w-0">
            <img
              src={replyImageUrl}
              alt="Replied image"
              className="rounded-lg max-w-full max-h-64 object-contain"
              loading="lazy"
            />
            <div className="mt-1 min-w-0">
              {replyPreview.content && (
                <p className="text-xs text-base-content/60 truncate">
                  {renderReplyContent(replyPreview.content)}
                </p>
              )}
              {replyExpirationStatus.status !== "none" &&
                replyExpirationStatus.daysLeft !== null && (
                  <div
                    className={`flex items-center gap-1 min-w-0 ${
                      replyExpirationStatus.status === "expiring-soon"
                        ? "text-warning"
                        : "text-base-content/40"
                    }`}
                  >
                    <Clock size={11} className="shrink-0" />
                    <p className="text-[11px] truncate">
                      {replyExpirationStatus.message}
                    </p>
                  </div>
                )}
              {replyExpirationStatus.status === "none" &&
                !replyPreview.content && (
                  <p className="text-xs text-base-content/60 truncate">Image</p>
                )}
            </div>
          </div>
        ) : replyFileUrl ? (
          <div className="mt-1 flex min-w-0 items-start gap-2">
            <ReplyFileIcon size={18} className="text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-base-content/60 truncate">
                {replyFileName || "File"}
              </p>
              {replyExpirationStatus.status !== "none" &&
                replyExpirationStatus.daysLeft !== null && (
                  <div
                    className={`flex items-center gap-1 min-w-0 ${
                      replyExpirationStatus.status === "expiring-soon"
                        ? "text-warning"
                        : "text-base-content/40"
                    }`}
                  >
                    <Clock size={11} className="shrink-0" />
                    <p className="text-[11px] truncate">
                      {replyExpirationStatus.message}
                    </p>
                  </div>
                )}
            </div>
          </div>
        ) : replyEventPreview ? (
          <p
            className="flex min-w-0 items-center gap-1 text-xs font-medium truncate"
            style={{ color: replyEventPreview.color }}
          >
            {ReplyEventIcon && (
              <ReplyEventIcon size={13} className="shrink-0" />
            )}
            <span className="truncate">{replyEventPreview.text}</span>
            {ReplyEventTrailingIcon && (
              <ReplyEventTrailingIcon size={13} className="shrink-0" />
            )}
          </p>
        ) : (
          <p className="text-xs text-base-content/60 truncate">
            {replyPreview.content
              ? renderReplyContent(replyPreview.content)
              : "Original message was deleted"}
          </p>
        )}
      </Tooltip>
    </div>
  );
};

const MessageImage = ({ message }) => {
  const imageUrl = message.imageUrl || message.image_url;
  const imageDeletedAt = message.fileDeletedAt || message.file_deleted_at;
  const imageExpirationStatus = getFileExpirationStatus(message);
  const imageName = message.fileName || message.file_name;

  if (
    imageUrl &&
    (imageExpirationStatus.status === "expired" || imageDeletedAt)
  ) {
    return (
      <div className={message.content ? "mb-2" : ""}>
        <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg border border-base-300 max-w-xs">
          <AlertTriangle size={24} className="text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-base-content/60">
              Image or file no longer available
            </p>
            <p className="text-xs text-base-content/40">This data has expired.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!imageUrl) return null;

  return (
    <div className={message.content ? "mb-2" : ""}>
      {imageExpirationStatus.status === "expiring-soon" && (
        <div className="flex items-center gap-2 p-2 mb-2 bg-warning/10 border border-warning/30 rounded-lg max-w-xs">
          <Clock size={16} className="text-warning flex-shrink-0" />
          <p className="text-xs text-warning">{imageExpirationStatus.message}</p>
        </div>
      )}
      <Tooltip
        content="Click to open and download image in new tab"
        position="top"
        wrapperClassName="block"
      >
        <div
          className="relative inline-block group/img cursor-pointer"
          onClick={() => window.open(imageUrl, "_blank")}
        >
          <img
            src={imageUrl}
            alt="Shared image"
            className="rounded-lg max-w-full max-h-64 object-contain transition-opacity group-hover/img:opacity-80"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
            <Download size={64} className="text-white drop-shadow-lg" />
          </div>
        </div>
      </Tooltip>
      {imageName && (
        <p className="text-xs text-base-content/60 mt-1 ml-1 truncate">
          {imageName}
        </p>
      )}
      {imageExpirationStatus.status === "active" &&
        imageExpirationStatus.daysLeft !== null && (
          <div className="flex items-center gap-2 mt-1 ml-1">
            <Clock size={12} className="text-base-content/40 flex-shrink-0" />
            <p className="text-xs text-base-content/40">
              {imageExpirationStatus.message}
            </p>
          </div>
        )}
    </div>
  );
};

const EditMessageForm = ({
  message,
  editingContent,
  setEditingContent,
  editingError,
  isSavingEdit,
  onCancelEdit,
  onSaveEdit,
}) => (
  <div className="space-y-2 min-w-[16rem] max-w-full">
    <textarea
      value={editingContent}
      onChange={(event) => setEditingContent(event.target.value)}
      className="textarea textarea-bordered textarea-sm w-full min-h-20 resize-none bg-base-100 text-base-content"
      maxLength={500}
      disabled={isSavingEdit}
      autoFocus
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSavingEdit) {
          onCancelEdit();
        }

        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          onSaveEdit(message.id);
        }
      }}
    />
    {editingError && <p className="text-xs text-error">{editingError}</p>}
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        onClick={onCancelEdit}
        disabled={isSavingEdit}
      >
        <X size={14} />
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-primary btn-xs"
        onClick={() => onSaveEdit(message.id)}
        disabled={
          isSavingEdit ||
          !editingContent.trim() ||
          editingContent.trim() === (message.content || "").trim()
        }
      >
        {isSavingEdit ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Check size={14} />
        )}
        Save
      </button>
    </div>
  </div>
);

const MessageBubbleMeta = ({
  message,
  isCurrentUser,
  messageEdited,
  getMessageDisplayTime,
  conversationType,
  teamMembers,
  currentUserId,
  getReadByTooltip,
}) => (
  <div
    className={`
      flex justify-between items-center text-xs mt-1
      ${isCurrentUser ? "text-base-content/60" : "text-base-content/50"}
    `}
  >
    <span className="inline-flex items-center gap-1">
      {formatLocalTime(getMessageDisplayTime(message))}
      {messageEdited && (
        <Tooltip
          content="Message edited"
          position="top"
          wrapperClassName="inline-flex shrink-0"
        >
          <Pencil size={12} strokeWidth={2.25} aria-label="Message edited" />
        </Tooltip>
      )}
    </span>
    <span className="inline-flex items-center">
      <ReadReceipt
        message={message}
        isCurrentUser={isCurrentUser}
        conversationType={conversationType}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        getReadByTooltip={getReadByTooltip}
      />
    </span>
  </div>
);

class MessageBubbleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Message bubble render failed:", {
      messageId: this.props.messageId,
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
          Could not render this message.
          {this.props.messageId != null && (
            <span className="ml-1 text-xs opacity-70">
              ID: {String(this.props.messageId)}
            </span>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const MessageBubbleContent = forwardRef(
  (
    {
      message,
      messageIndex,
      messagesById,
      isCurrentUser,
      isHighlighted,
      isDeleted,
      isEditing,
      isSavingEdit,
      canReplyMessage,
      canEditMessage,
      canDeleteMessage,
      showMessageMeta,
      messageEdited,
      senderInfo,
      searchQuery,
      editingContent,
      setEditingContent,
      editingError,
      conversationType,
      teamMembers,
      currentUserId,
      onUserClick,
      onReply,
      onEditStart,
      onDeleteMessage,
      onCancelEdit,
      onSaveEdit,
      getMessageDisplayTime,
      getReadByTooltip,
    },
    ref,
  ) => {
    const replyPreview = buildReplyPreview(message, messagesById);

    return (
      <div
        data-message-id={message.id}
        ref={ref}
        className={`
          relative group rounded-lg p-3 transition-all duration-300 hover:shadow-md
          ${
            isCurrentUser
              ? "bg-green-100 text-base-content rounded-br-none ml-auto"
              : "bg-base-200 rounded-bl-none"
          }
          ${
            messageIndex === 0
              ? ""
              : isCurrentUser
                ? "rounded-tr-lg"
                : "rounded-tl-lg"
          }
          ${isHighlighted ? "message-highlight" : ""}
        `}
      >
        {(canReplyMessage || canEditMessage || canDeleteMessage) &&
          !isEditing && (
            <MessageActions
              canReplyMessage={canReplyMessage}
              canEditMessage={canEditMessage}
              canDeleteMessage={canDeleteMessage}
              message={message}
              senderInfo={senderInfo}
              onReply={onReply}
              onEditStart={onEditStart}
              onDeleteMessage={onDeleteMessage}
            />
          )}

        {!isDeleted && (
          <>
            {replyPreview && <ReplyPreview replyPreview={replyPreview} />}

            <MessageImage message={message} />
            <FileAttachment message={message} />

            {message.content && !isEditing && (
              <p>
                <MessageText
                  content={message.content}
                  searchQuery={searchQuery}
                  onUserClick={onUserClick}
                />
              </p>
            )}

            {isEditing && (
              <EditMessageForm
                message={message}
                editingContent={editingContent}
                setEditingContent={setEditingContent}
                editingError={editingError}
                isSavingEdit={isSavingEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
              />
            )}
          </>
        )}

        {isDeleted && (
          <p className="text-sm text-base-content/50 italic">
            This message was deleted.
          </p>
        )}

        {showMessageMeta && (
          <MessageBubbleMeta
            message={message}
            isCurrentUser={isCurrentUser}
            messageEdited={messageEdited}
            getMessageDisplayTime={getMessageDisplayTime}
            conversationType={conversationType}
            teamMembers={teamMembers}
            currentUserId={currentUserId}
            getReadByTooltip={getReadByTooltip}
          />
        )}
      </div>
    );
  },
);

MessageBubbleContent.displayName = "MessageBubbleContent";

const MessageBubble = forwardRef((props, ref) => (
  <MessageBubbleErrorBoundary messageId={props.message?.id}>
    <MessageBubbleContent {...props} ref={ref} />
  </MessageBubbleErrorBoundary>
));

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
