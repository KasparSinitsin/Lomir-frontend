/**
 * ⚠️ The notices this file used to hold now live in `src/locales/{en,de}/common.json`
 * under `privacy.*`, because they are user-facing text and had to become
 * translatable (FE i18n Phase 1, shared form controls).
 *
 * What is left here has **no caller** in the app. It was written for surfaces
 * that do not render it yet - the legal pages are their own piece of work - so
 * it is kept rather than translated: an untranslated key would only show up as
 * a warning in `npm run i18n:check` for as long as nothing uses it.
 *
 * Adding one of these to a screen means moving it into `common.json` first.
 */

export const PROFILE_VISIBILITY_NOTICE =
  "Your profile may be visible to other Lomir users depending on your visibility settings. Public profile information may include your username, name, bio, avatar, focus areas, badges, and approximate location details you add. You can change your profile visibility later in your settings.";

export const BROWSER_STORAGE_NOTICE =
  "Lomir uses a technically necessary httpOnly session cookie to keep users signed in. Browser storage such as sessionStorage or short-lived localStorage messages is used only for necessary UI state, for example in-app notification checks or registration success messages. We do not currently use advertising cookies, marketing trackers, or third-party analytics tools.";

export const LEGAL_PLACEHOLDER_NOTICE =
  "Lomir is currently being prepared for public use. Please do not enter sensitive personal information until the final legal documents are available.";
