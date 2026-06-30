import React from "react";
import { Check, CheckCheck } from "lucide-react";
import Tooltip from "../common/Tooltip";

// Read-receipt indicator for the current user's own messages. The tooltip text
// is resolved by the parent (getReadByTooltip) so name-resolution state stays in
// MessageDisplay. Extracted verbatim from MessageDisplay.renderReadReceipt.
const ReadReceipt = ({
  message,
  isCurrentUser,
  conversationType,
  teamMembers,
  currentUserId,
  getReadByTooltip,
}) => {
  if (!isCurrentUser) return null;

  const parsedReadCount = Number(message.readCount ?? message.read_count);
  const readCount = Number.isFinite(parsedReadCount) ? parsedReadCount : 0;
  const fallbackRecipientCount =
    conversationType === "team"
      ? (teamMembers || []).filter((member) => {
          const memberId = member?.user_id ?? member?.userId ?? member?.id;
          return String(memberId) !== String(currentUserId);
        }).length
      : 1;
  const parsedRecipientCount = Number(
    message.recipientCount ??
      message.recipient_count ??
      fallbackRecipientCount,
  );
  const recipientCount = Number.isFinite(parsedRecipientCount)
    ? parsedRecipientCount
    : fallbackRecipientCount;

  if (conversationType === "team") {
    if (readCount <= 0 && !message.readAt) return null;

    const isReadByAll = recipientCount > 0 && readCount >= recipientCount;
    const ReceiptIcon = isReadByAll ? CheckCheck : Check;

    return (
      <Tooltip
        content={isReadByAll ? "Read by all" : getReadByTooltip(message)}
        position="top"
      >
        <span className="ml-2 inline-flex shrink-0">
          <ReceiptIcon
            size={14}
            strokeWidth={2.25}
            aria-label={isReadByAll ? "Read by all" : "Read by someone"}
          />
        </span>
      </Tooltip>
    );
  }

  if (!message.readAt) return null;

  return (
    <Tooltip content={getReadByTooltip(message)} position="top">
      <span className="ml-2 inline-flex shrink-0">
        <CheckCheck size={14} strokeWidth={2.25} aria-label="Read" />
      </span>
    </Tooltip>
  );
};

export default ReadReceipt;
