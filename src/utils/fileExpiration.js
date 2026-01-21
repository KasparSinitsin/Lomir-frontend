// Utilities for handling file expiration display

/**
 * Calculate days until a file expires
 * @param {string|Date} expiresAt - Expiration date
 * @returns {number|null} - Days until expiration, or null if no expiration
 */
export const getDaysUntilExpiration = (expiresAt) => {
  if (!expiresAt) return null;

  const now = new Date();
  const expiration = new Date(expiresAt);
  const diffTime = expiration - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Get expiration status for a file
 * @param {object} message - Message object with file data
 * @returns {{ status: string, daysLeft: number|null, message: string }}
 */
export const getFileExpirationStatus = (message) => {
  // Check if file was deleted
  if (message.fileDeletedAt) {
    return {
      status: "expired",
      daysLeft: null,
      message: "This file has expired and is no longer available.",
    };
  }

  // Check if there's no file or no expiration
  if (!message.fileExpiresAt && !message.file_expires_at) {
    return {
      status: "none",
      daysLeft: null,
      message: "",
    };
  }

  const expiresAt = message.fileExpiresAt || message.file_expires_at;
  const daysLeft = getDaysUntilExpiration(expiresAt);

  if (daysLeft === null) {
    return {
      status: "none",
      daysLeft: null,
      message: "",
    };
  }

  if (daysLeft <= 0) {
    return {
      status: "expired",
      daysLeft: 0,
      message: "This file has expired and is no longer available.",
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
