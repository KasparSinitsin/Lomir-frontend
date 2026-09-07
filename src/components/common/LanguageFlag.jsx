import React, { useId } from "react";

/**
 * A language's flag, drawn to fill a round frame the way the navbar avatar
 * fills its own - cropped, not letterboxed.
 *
 * `preserveAspectRatio="xMidYMid slice"` is the SVG equivalent of CSS
 * `object-cover`: the drawing is scaled until it covers the box and the
 * overflow is cut. Flags are wider than they are tall, so what goes is the
 * left and right edge, and the frame is filled edge to edge.
 *
 * ⚠️ Inline SVG rather than emoji, deliberately. A regional-indicator pair
 * (🇩🇪) is a *glyph*: its size follows font metrics, it cannot be made to cover
 * a box, and on Windows it renders as the bare letters "DE". None of that
 * survives being asked to look like the avatar.
 *
 * ⚠️ **This header used to say flags live here and nowhere else.** That held
 * while the navbar badge was the only exception. On 2026-09-05 Julia asked for
 * the flag in `LanguageSelect` too, so the rule above `SUPPORTED_LANGUAGES` was
 * rewritten rather than left to be contradicted by the code. The objection it
 * recorded has not gone away and is worth knowing: a language is not a country,
 * and `COUNTRY_LANGUAGE_MAP` maps AT and CH to German precisely because German
 * is theirs too - a German flag beside "Deutsch" quietly says otherwise.
 *
 * The file moved from `layout/` to `common/` with that change. It was in
 * `layout/` to keep the exception visible; now that it is shared, the old home
 * would have made `common/` import from `layout/`, which is a direction
 * nothing else in this codebase goes.
 *
 * Adding a language means adding an entry here. A missing one renders nothing
 * rather than a broken frame.
 *
 * `paint` is a function of the instance's own id prefix rather than static
 * markup: the Union Flag needs a `clipPath`, and a `clipPath` needs a DOM id.
 * A hardcoded one is fine until the same flag renders twice on a page - two
 * elements with one id, which is invalid and resolves by luck. `useId` makes
 * it per-instance, so the menu can show a flag on every row without thinking
 * about it.
 */
const FLAGS = {
  // 5:3, the official proportion.
  de: {
    viewBox: "0 0 5 3",
    paint: () => (
      <>
        <rect width="5" height="1" y="0" fill="#000000" />
        <rect width="5" height="1" y="1" fill="#DD0000" />
        <rect width="5" height="1" y="2" fill="#FFCE00" />
      </>
    ),
  },
  /**
   * The Union Flag's standard 60x30 construction: blue field, the white
   * saltire, the red saltire counterchanged into alternate quarters (that is
   * what the clip path is for - the red diagonals are offset, not centred),
   * then the white and red cross of St George over the top.
   */
  en: {
    viewBox: "0 0 60 30",
    paint: (idPrefix) => (
      <>
        <clipPath id={`${idPrefix}-quarters`}>
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath={`url(#${idPrefix}-quarters)`}
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </>
    ),
  },
};

const LanguageFlag = ({ code, className = "" }) => {
  const idPrefix = useId();
  const flag = FLAGS[code];
  if (!flag) return null;

  return (
    <svg
      viewBox={flag.viewBox}
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {flag.paint(idPrefix)}
    </svg>
  );
};

export default LanguageFlag;
