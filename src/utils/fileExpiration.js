// Utilities for handling file expiration display

const FILE_EXPIRATION_DAYS = 60;

/**
 * Calculate days until a file expires
 * Uses Math.floor to show full days remaining (more intuitive for users)
 * @param {string|Date} expiresAt - Expiration date
 * @returns {number|null} - Days until expiration, or null if no expiration
 */
export const getDaysUntilExpiration = (expiresAt) => {
  if (!expiresAt) return null;
  const now = new Date();
  const expiration = new Date(expiresAt);
  const diffTime = expiration - now;
  // Use Math.floor to show full days remaining
  // This is more intuitive: "59 days" means at least 59 full days remain
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate expiration date from message sent date
 * @param {object} message - Message object with sent_at/createdAt
 * @returns {Date|null} - Calculated expiration date, or null if no sent date
 */
const calculateExpirationFromSentDate = (message) => {
  const sentAt =
    message.sentAt ||
    message.sent_at ||
    message.createdAt ||
    message.created_at;
  if (!sentAt) return null;
  const sentDate = new Date(sentAt);
  if (isNaN(sentDate.getTime())) return null;
  const expirationDate = new Date(sentDate);
  expirationDate.setDate(expirationDate.getDate() + FILE_EXPIRATION_DAYS);
  return expirationDate;
};

/**
 * Get expiration status for a file
 * @param {object} message - Message object with file data
 * @returns {{ status: string, daysLeft: number|null, message: string }}
 */
export const getFileExpirationStatus = (message) => {
  if (message.fileDeletedAt || message.file_deleted_at) {
    return {
      status: "expired",
      daysLeft: null,
      message: "This data has expired and is no longer available.",
    };
  }

  const hasFile =
    message.imageUrl ||
    message.image_url ||
    message.fileUrl ||
    message.file_url;

  if (!hasFile) {
    return { status: "none", daysLeft: null, message: "" };
  }

  let expiresAt = message.fileExpiresAt || message.file_expires_at;
  if (!expiresAt) {
    expiresAt = calculateExpirationFromSentDate(message);
  }

  if (!expiresAt) {
    return { status: "none", daysLeft: null, message: "" };
  }

  const daysLeft = getDaysUntilExpiration(expiresAt);

  if (daysLeft === null) {
    return { status: "none", daysLeft: null, message: "" };
  }

  if (daysLeft <= 0) {
    return {
      status: "expired",
      daysLeft: 0,
      message: "This data has expired and is no longer available.",
    };
  }

  if (daysLeft <= 7) {
    return {
      status: "expiring-soon",
      daysLeft,
      message: `This file will expire in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Download to keep a copy.`,
    };
  }

  return {
    status: "active",
    daysLeft,
    message: `File expires in ${daysLeft} days.`,
  };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
