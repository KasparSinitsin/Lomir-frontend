# Lomir - Temporary Dark Mode Suspension

## Purpose

This document explains why dark mode is currently suspended in Lomir, how the temporary suspension is implemented, and how proper dark mode can be reintroduced later.

The goal of the current setup is very specific:

- Users who prefer dark mode in their browser or operating system must still see Lomir in the exact same colors as the current light mode.
- The app must not fall back to browser-default or DaisyUI-default dark styling.
- The current behavior is a temporary accessibility and UX safeguard, not the final dark mode solution.

---

## Why Dark Mode Was Suspended

At the time of this change, Lomir did not yet have a complete, tested, accessible dark theme.

In practice this caused problems such as:

- low contrast and legibility issues
- white or very light text on very light backgrounds
- browser- or framework-driven dark styling that did not match the Lomir design system
- inconsistent results across browsers

Because of that, the safest interim decision was:

- keep the app visually identical to light mode everywhere
- suppress automatic dark mode behavior until a real dark theme is ready

This is a frontend-only concern for now. No backend changes are required unless theme preference should later be stored per user.

---

## Current Implementation

The suspension is implemented in several layers so that browser, framework, and app-level theme behavior all point to light mode.

### 1. Document-level light mode lock

The HTML document is explicitly marked as light theme:

- `index.html`
  - `<html lang="en" data-theme="light">`
  - `<meta name="color-scheme" content="only light" />`

Why this matters:

- `data-theme="light"` ensures DaisyUI components use the light theme.
- `meta name="color-scheme"` tells the browser that the document should be treated as light-only.

### 2. CSS-level browser UI lock

In `src/index.css`, the root element declares:

```css
:root {
  color-scheme: only light;
}
```

Why this matters:

- This keeps browser-painted UI such as form controls, scrollbars, and similar native surfaces in light mode.
- It adds a CSS-level fallback in addition to the HTML meta tag.

### 3. App-level theme lock

Several app entry points explicitly keep the app on the light theme:

- `src/main.jsx`
- `src/App.jsx`
- `src/hooks/useTheme.js`

Current behavior:

- the app sets `data-theme` to `light`
- the theme hook initializes to `light`
- `toggleTheme()` is intentionally locked to `light`

Why this matters:

- Even if a future component accidentally calls the current theme hook, it cannot switch the app into an unfinished dark mode.

### 4. DaisyUI is configured to ship only the light theme

In `tailwind.config.js`, DaisyUI is configured like this:

```js
daisyui({
  themes: ["light --default"],
})
```

Why this matters:

- This prevents DaisyUI from generating its built-in `dark --prefersdark` media-query behavior.
- Without this, Firefox and other browsers could still apply DaisyUI's automatic dark theme when the OS or browser prefers dark mode.

### 5. The DaisyUI light theme is overridden with Lomir's actual light palette

Also in `tailwind.config.js`, the built-in DaisyUI `light` theme is overridden using `daisyui/theme/index.js`.

This is important because we do not want generic DaisyUI light colors. We want Lomir's existing light colors.

The override restores Lomir-specific values for:

- `base-100`
- `base-200`
- `base-300`
- `base-content`
- `primary`
- `secondary`
- `accent`
- `info`
- `success`
- `warning`
- `error`

Why this matters:

- Classes such as `bg-base-100`, `text-base-content`, `btn-primary`, notification badges, avatar fallback fills, and semantic colors must look exactly like they do in Lomir light mode.

---

## Important DaisyUI v5 Note

One major implementation detail is easy to miss:

- DaisyUI v5 did not behave correctly with the older top-level config style we initially tried.
- The old custom theme setup allowed DaisyUI's built-in dark `prefers-color-scheme` rule to remain active.
- That caused Firefox to keep showing dark styling even though the app was trying to force light mode.

The working solution is:

- configure DaisyUI directly in the `plugins` array
- ship only `light --default`
- override the built-in `light` theme with Lomir's actual light palette

This detail is important if the theme setup is revisited later.

---

## Files Involved

The temporary suspension currently depends on these files:

- `index.html`
- `src/index.css`
- `src/main.jsx`
- `src/App.jsx`
- `src/hooks/useTheme.js`
- `tailwind.config.js`

If dark mode work starts in the future, these are the first files to revisit.

---

## Known Limitations

This solution is designed to suppress normal browser and operating-system dark mode behavior.

It does not guarantee control over:

- browser extensions that forcibly restyle websites
- external tools that inject their own dark-mode CSS

Within standard browser behavior, the app should remain light-only.

---

## How To Reintroduce Dark Mode Later

Dark mode should only be reintroduced when a full dark design has been defined and tested for accessibility.

Recommended approach:

### 1. Keep the current light theme as the reference

Do not change the current light palette unless intentionally redesigning it.

### 2. Create a real dark theme in DaisyUI

Add a dedicated dark theme with explicit dark values, for example via `daisyuiTheme(...)`.

Important:

- define all required semantic tokens explicitly
- do not rely on browser defaults
- do not rely on incomplete partial overrides

### 3. Decide the product behavior for theme selection

Choose one of these strategies:

- manual toggle only
- follow system preference
- manual override plus optional system default

If system preference is enabled, it should only happen after the dark theme has been fully tested.

### 4. Remove the temporary light-only locks

When proper dark mode is ready, revisit and update:

- `index.html`
  - remove or change `<meta name="color-scheme" content="only light" />`
- `src/index.css`
  - remove or change `color-scheme: only light`
- `src/main.jsx`
  - stop forcing `data-theme="light"`
- `src/App.jsx`
  - stop hardcoding `data-theme="light"`
- `src/hooks/useTheme.js`
  - restore real theme switching logic
- `tailwind.config.js`
  - allow both light and dark themes

### 5. Test the dark theme systematically

Before shipping, test at minimum:

- Chrome, Firefox, Safari
- light OS preference
- dark OS preference
- hard refresh / first paint behavior
- forms, buttons, badges, notifications, cards, modals, tooltips
- avatar fallbacks
- semantic colors like success, warning, error, and info
- contrast and readability on all major screens

### 6. Consider persistence only after the UI is ready

If user theme preference should be stored:

- local storage is sufficient for a simple client-side preference
- backend persistence is only needed if the preference should follow the user across devices

---

## Practical Reimplementation Checklist

When dark mode work begins, use this checklist:

1. Design the full dark token set first.
2. Implement the dark theme in DaisyUI with explicit values.
3. Re-enable real theme switching in `useTheme`.
4. Remove the temporary light-only meta/CSS guards.
5. Decide whether to support system preference, manual toggle, or both.
6. Test all major surfaces in both themes.
7. Verify that light mode still looks exactly the same as before.

---

## Summary

Dark mode is currently suspended on purpose because the app does not yet have a complete, accessible, user-friendly dark theme.

The current implementation forces Lomir to remain in its existing light-mode appearance by:

- locking the document to light mode
- locking browser UI to light mode
- locking the app theme state to light mode
- removing DaisyUI's automatic dark theme behavior
- overriding DaisyUI's `light` theme with Lomir's actual light palette

This ensures that users with dark-mode browser or OS preferences still see the normal Lomir light theme until a proper dark mode is ready.
