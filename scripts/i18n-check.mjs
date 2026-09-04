#!/usr/bin/env node
/**
 * Fails the build when a translation key is used but not defined, when the
 * two languages have drifted apart, or when a message is not valid ICU.
 *
 * Why this exists before the strings, not after
 * ---------------------------------------------
 * "Every new feature also needs its German text" is a rule that decays the
 * moment someone is in a hurry. A check that fails does not - but only if it
 * was there from the first string. Arriving at the end, its first run reports
 * hundreds of gaps at once, which is the moment such a check gets switched
 * off rather than satisfied.
 *
 * What it deliberately does NOT do
 * --------------------------------
 * It cannot find hardcoded English still sitting in JSX - it only sees keys
 * that already go through t(). Finding what was never extracted is the job of
 * the pseudo-localization pass, page by page, during Phase 1.
 *
 * Run: npm run i18n:check
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { IntlMessageFormat } from "intl-messageformat";

const SRC = "src";
const LOCALES = join(SRC, "locales");
const DEFAULT_NAMESPACE = "common";

const errors = [];
const warnings = [];

// ---------------------------------------------------------------- Dateien
const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(js|jsx)$/.test(entry) ? [full] : [];
  });

// ---------------------------------------------------- Keys aus dem Code
/**
 * Matches t("key") and i18n.t("key"), and nothing else.
 *
 * The lookbehind is the whole trick: without it this also matches get(,
 * set(, split( and format( - a first attempt did exactly that and reported
 * 170 "keys" that were URL paths and separators.
 */
const CALL = /(?:\bi18n\.t\(|(?<![\w$.])t\()/g;

/**
 * Blanks out comments, keeping every character position so reported line
 * numbers stay true.
 *
 * Needed because a comment mentioning t() is otherwise reported as an
 * unreadable key - src/i18n/index.js says "would make every t() a potential
 * blank screen", and the first version of this script duly flagged it.
 * Strings are respected, so a "http://..." in code is not mistaken for one.
 */
const stripComments = (source) => {
  const out = source.split("");
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") i += 1;
        i += 1;
      }
      i += 1;
    } else if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") { out[i] = " "; i += 1; }
    } else if (c === "/" && source[i + 1] === "*") {
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] !== "\n") out[i] = " ";
        i += 1;
      }
      out[i] = " "; out[i + 1] = " "; i += 2;
    } else {
      i += 1;
    }
  }
  return out.join("");
};
const STRING = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;

const keyId = (namespace, key) => `${namespace}:${key}`;
const splitKey = (key) => {
  const separator = key.indexOf(":");
  if (separator === -1) return [DEFAULT_NAMESPACE, key];
  return [key.slice(0, separator), key.slice(separator + 1)];
};

const collectUsedKeys = (files) => {
  const used = new Map(); // key -> [where]
  const dynamic = [];

  for (const file of files) {
    if (file.startsWith(join(SRC, "locales"))) continue;
    const source = stripComments(readFileSync(file, "utf8"));

    for (const match of source.matchAll(CALL)) {
      // Scan to the call's closing paren, then keep the first argument.
      let depth = 1;
      let i = match.index + match[0].length;
      const start = i;
      while (depth > 0 && i < source.length) {
        if (source[i] === "(") depth += 1;
        else if (source[i] === ")") depth -= 1;
        i += 1;
      }
      let arg = source.slice(start, i - 1);
      // Only the key argument; options come after a top-level comma.
      let d = 0;
      for (let k = 0; k < arg.length; k += 1) {
        const c = arg[k];
        if ("([{".includes(c)) d += 1;
        else if (")]}".includes(c)) d -= 1;
        else if (c === "," && d === 0) { arg = arg.slice(0, k); break; }
      }

      const line = source.slice(0, match.index).split("\n").length;
      const where = `${relative(".", file)}:${line}`;
      const literals = [...arg.matchAll(STRING)].map((m) => m[1] ?? m[2]);

      // A ternary of two literals - t(short ? "a" : "b") - is two keys, both
      // real. Anything with no literal at all is a key this check cannot see.
      if (literals.length === 0) dynamic.push(`${where}  ${arg.trim().slice(0, 60)}`);
      for (const key of literals) {
        const [namespace, namespaceKey] = splitKey(key);
        const id = keyId(namespace, namespaceKey);
        if (!used.has(id)) used.set(id, []);
        used.get(id).push(where);
      }
    }
  }
  return { used, dynamic };
};

// -------------------------------------------------------- Sprachdateien
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v]],
  );

const languages = readdirSync(LOCALES).filter((entry) =>
  statSync(join(LOCALES, entry)).isDirectory(),
);

const messages = {};
for (const lang of languages) {
  messages[lang] = new Map();
  const namespaceFiles = readdirSync(join(LOCALES, lang)).filter((entry) =>
    entry.endsWith(".json"),
  );

  for (const filename of namespaceFiles) {
    const namespace = filename.replace(/\.json$/, "");
    const file = join(LOCALES, lang, filename);
    try {
      for (const [key, value] of flatten(JSON.parse(readFileSync(file, "utf8")))) {
        messages[lang].set(keyId(namespace, key), value);
      }
    } catch (error) {
      errors.push(`${file}: cannot be read or is not valid JSON - ${error.message}`);
    }
  }
}

// ------------------------------------------------------------- Prüfungen
const { used, dynamic } = collectUsedKeys(walk(SRC));

// 1. Every key the code uses exists in every language.
for (const [key, places] of used) {
  for (const lang of languages) {
    if (!messages[lang].has(key)) {
      const [namespace, namespaceKey] = splitKey(key);
      errors.push(
        `missing key "${namespaceKey}" in ${lang}/${namespace}.json  (used at ${places[0]})`,
      );
    }
  }
}

// 2. The languages carry the same keys. Catches the half-finished addition
//    where English was updated and German was not.
const [reference, ...others] = languages;
for (const lang of others) {
  for (const key of messages[reference].keys()) {
    if (!messages[lang].has(key)) errors.push(`key "${key}" exists in ${reference} but not in ${lang}`);
  }
  for (const key of messages[lang].keys()) {
    if (!messages[reference].has(key)) errors.push(`key "${key}" exists in ${lang} but not in ${reference}`);
  }
}

// 3. Every message is valid ICU, in its own language. A malformed plural is
//    not a wrong translation, it is a page that throws when it renders.
for (const lang of languages) {
  for (const [key, value] of messages[lang]) {
    if (typeof value !== "string") {
      errors.push(`${lang}: "${key}" is not a string`);
      continue;
    }
    try {
      new IntlMessageFormat(value, lang);
    } catch (error) {
      errors.push(`${lang}: "${key}" is not valid ICU - ${error.message.split("\n")[0]}`);
    }
  }
}

// 4. Defined but never used. A warning, not an error: keys can legitimately
//    be reached through a variable, which check 1 cannot see either.
for (const key of messages[reference].keys()) {
  if (!used.has(key)) warnings.push(`unused key "${key}"`);
}

// ---------------------------------------------------------------- Ausgabe
console.log(
  `i18n:check  ${languages.join(", ")}  |  ${messages[reference].size} keys  |  ` +
    `${used.size} used in code`,
);

if (dynamic.length) {
  console.log(`\n${dynamic.length} call(s) with a non-literal key - not checkable here:`);
  for (const entry of dynamic) console.log(`  ${entry}`);
}
for (const warning of warnings) console.log(`  warning: ${warning}`);
for (const error of errors) console.error(`  error:   ${error}`);

if (errors.length) {
  console.error(`\ni18n:check FAILED - ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`\ni18n:check passed${warnings.length ? ` (${warnings.length} warning(s))` : ""}`);
