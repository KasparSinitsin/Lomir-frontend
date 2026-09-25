/**
 * What both language versions of the legal texts share, kept once so the two
 * cannot drift apart on it.
 */

export const CONTACT_EMAIL = "lomirapp@gmail.com";

export const mailLink = (
  <a href={`mailto:${CONTACT_EMAIL}`} className="link link-primary">
    {CONTACT_EMAIL}
  </a>
);

/**
 * When each page last changed, as ISO dates. Formatted per language at render.
 * One date per page for both languages: they are one text in two languages,
 * so a change to either is a change to both.
 */
export const LEGAL_UPDATED = {
  about: "2026-06-18",
  terms: "2026-06-18",
  privacy: "2026-06-30",
  legalNotice: "2026-06-16",
};
