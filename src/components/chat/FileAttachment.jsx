import React from "react";
import { AlertTriangle, Clock, Download } from "lucide-react";
import Tooltip from "../common/Tooltip";
import {
  getFileExpirationStatus,
  formatFileSize,
} from "../../utils/fileExpiration";
import { getFileIcon } from "../../utils/messageDisplayHelpers";

// Renders a message's file attachment (or an expired/deleted placeholder).
// Self-contained: derives everything from the message prop. Extracted verbatim
// from MessageDisplay.renderFileAttachment.
const FileAttachment = ({ message }) => {
  const fileUrl = message?.fileUrl || message?.file_url;
  const fileName = message?.fileName || message?.file_name;
  const fileSize = message?.fileSize || message?.file_size;
  const fileDeletedAt = message?.fileDeletedAt || message?.file_deleted_at;
  const imageUrl = message?.imageUrl || message?.image_url;

  const expirationStatus = getFileExpirationStatus(message);

  // If file was deleted/expired, show placeholder
  // But only if there's no imageUrl (to avoid duplicate with image placeholder)
  // OR if there was specifically a file (fileName exists)
  if ((expirationStatus.status === "expired" || fileDeletedAt) && !imageUrl) {
    return (
      <div className={message.content ? "mb-2" : ""}>
        <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg border border-base-300">
          <AlertTriangle size={24} className="text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-base-content/60">
              Image or file no longer available
            </p>
            <p className="text-xs text-base-content/40">
              This data has expired.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!fileUrl) return null;

  const FileIcon = getFileIcon(fileName);
  const fileSizeDisplay = formatFileSize(fileSize);

  return (
    <div className={message.content ? "mb-2" : ""}>
      {/* Warning banner for files expiring soon (≤7 days) */}
      {expirationStatus.status === "expiring-soon" && (
        <div className="flex items-center gap-2 p-2 mb-2 bg-warning/10 border border-warning/30 rounded-lg">
          <Clock size={16} className="text-warning flex-shrink-0" />
          <p className="text-xs text-warning">{expirationStatus.message}</p>
        </div>
      )}

      <Tooltip
        content="Click to open and download file"
        position="top"
        wrapperClassName="block"
      >
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-base-100/50 rounded-lg hover:bg-base-100 hover:shadow-soft transition-all duration-200 group"
          download={fileName || undefined}
        >
          {React.createElement(FileIcon, {
            size: 24,
            className: "text-primary flex-shrink-0",
          })}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {fileName || "Download file"}
            </p>
            <p className="text-xs text-base-content/60">
              {fileSizeDisplay || "Click to download"}
            </p>
          </div>

          <Download
            size={18}
            className="text-base-content/40 group-hover:text-primary transition-colors flex-shrink-0"
          />
        </a>
      </Tooltip>

      {/* Grey expiration info for files NOT expiring soon (>7 days) */}
      {expirationStatus.status === "active" &&
        expirationStatus.daysLeft !== null && (
          <div className="flex items-center gap-2 mt-1 ml-1">
            <Clock size={12} className="text-base-content/40 flex-shrink-0" />
            <p className="text-xs text-base-content/40">
              {expirationStatus.message}
            </p>
          </div>
        )}
    </div>
  );
};

export default FileAttachment;
