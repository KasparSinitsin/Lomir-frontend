// Utilities for handling file expiration display

import { getActiveLocale } from "./languageUtils";

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
 * Get expiration status for a file.
 *
 * ⚠️ **Returns a status and the numbers behind it — never a sentence.** Until
 * 2026-09-13 this returned finished English on a `message` field, rendered at
 * nine sites in three components, two of which (`MessageBubble`,
 * `MessageInput`) counted as translated and put English on screen anyway. The
 * tell was one DOM node: an English expiry line and a German `alt` text from
 * the same component, fifteen lines apart.
 *
 * A pure helper cannot translate — no hook, no `t`. So it names the state and
 * the consumer says it, through `fileExpiry.*` and ICU. Same shape as
 * `Contact.jsx`'s attachment errors; `imagekit.js` still needs it.
 *
 * `mediaType` is what German needs and English does not: „Das Bild läuft ab"
 * against „**Die** Datei läuft ab". One template with an interpolated noun
 * yields „Das Datei", so the article travels with the type and the message
 * picks it with ICU `select`.
 *
 * @param {object} message - Message object with file data
 * @returns {{ status: "none"|"active"|"expiring-soon"|"expired",
 *             daysLeft: number|null, mediaType: "image"|"file"|null }}
 */
export const getFileExpirationStatus = (message) => {
  if (message.fileDeletedAt || message.file_deleted_at) {
    return { status: "expired", daysLeft: null, mediaType: null };
  }

  const hasFile =
    message.imageUrl ||
    message.image_url ||
    message.fileUrl ||
    message.file_url;
  const mediaType =
    (message.imageUrl || message.image_url) &&
    !(message.fileUrl || message.file_url)
      ? "image"
      : "file";

  if (!hasFile) {
    return { status: "none", daysLeft: null, mediaType: null };
  }

  let expiresAt = message.fileExpiresAt || message.file_expires_at;
  if (!expiresAt) {
    expiresAt = calculateExpirationFromSentDate(message);
  }

  if (!expiresAt) {
    return { status: "none", daysLeft: null, mediaType };
  }

  const daysLeft = getDaysUntilExpiration(expiresAt);

  if (daysLeft === null) {
    return { status: "none", daysLeft: null, mediaType };
  }

  if (daysLeft <= 0) {
    return { status: "expired", daysLeft: 0, mediaType };
  }

  if (daysLeft <= 7) {
    return { status: "expiring-soon", daysLeft, mediaType };
  }

  return { status: "active", daysLeft, mediaType };
};

/**
 * Format file size for display, in the reader's own conventions.
 *
 * ⚠️ Was built with `toFixed(1)`, which is a decimal point in every language —
 * "1.5 MB" to a German reader, where the separator means nothing or reads as a
 * thousands group. `toFixed` is a string operation that looks like a formatter.
 * Second instance of that exact bug in two days, after
 * `Contact.jsx`'s `formatAttachmentSize`; worth grepping for elsewhere.
 *
 * Built through `Intl` with `getActiveLocale()`, like `formatDistance` in
 * `locationUtils.js`. ⚠️ Intl writes the SI-correct "kB", not "KB".
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return "";

  // ⚠️ Below 1 kB there is nothing to localise — a whole number under 1024 has
  // no decimal separator and no thousands group — and Intl actively makes it
  // worse: `unit: "byte"` renders "529 byte" in English, lower-case, spelled
  // out and not even plural. German gets "529 Byte", which is fine, so this
  // was invisible until the English side was checked. Plain "B" for this
  // branch; Intl only where a separator is actually at stake.
  if (bytes < 1024) return `${bytes} B`;

  const [value, unit] =
    bytes < 1024 * 1024
      ? [bytes / 1024, "kilobyte"]
      : [bytes / (1024 * 1024), "megabyte"];

  return new Intl.NumberFormat(getActiveLocale(), {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
};
