#!/usr/bin/env node
/**
 * Fails when the German and English legal texts no longer have the same shape.
 *
 * Why this exists
 * ---------------
 * The legal pages are one file per language (src/content/legal/de.jsx and
 * en.jsx), not translation keys, so i18n:check cannot see them. Both versions
 * carry equal legal weight, which means a section, paragraph or list item that
 * exists in one language and not the other is a defect in a binding text - and
 * nothing on screen would show it.
 *
 * What it compares, per page and in order
 * ---------------------------------------
 * - the pages themselves, and that each has a title and an intro
 * - the number of sections
 * - per section: paragraphs, items or ordered blocks, and how many - and for
 *   blocks, that paragraph and list follow in the same order
 * - per title, intro, paragraph and item:
 *   - the embedded elements in order ({mailLink}, {contactLink}, <br />, ...),
 *     so a link or a line of the address cannot be lost in translation
 *   - the numbers (ages, periods, the address), so "60 days" cannot become
 *     "30 Tage"
 *   - the legal citations, normalised across the two citation styles, so
 *     "Art. 6(1)(b)" must be "Art. 6 Abs. 1 lit. b" and "Section 25(2)" must
 *     be "§ 25 Abs. 2" - a changed letter is not a changed number
 *   Numbers and citations are compared as sets with counts, not in order:
 *   German word order may move them within a sentence. Elements stay in
 *   order, because the order of the address lines is the address.
 *
 * What it deliberately does NOT do
 * --------------------------------
 * It cannot tell whether a sentence is translated correctly. That is a human
 * review; this only guarantees there is the same thing to review on each side.
 *
 * Run: npm run legal:check
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as espree from "espree";

const DIR = join("src", "content", "legal");
const LANGUAGES = ["en", "de"];

const errors = [];

const parse = (language) => {
  const file = join(DIR, `${language}.jsx`);
  const ast = espree.parse(readFileSync(file, "utf8"), {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
    loc: true,
  });

  for (const node of ast.body) {
    if (node.type !== "VariableDeclaration") continue;
    const declarator = node.declarations.find((d) => d.id.name === "content");
    if (declarator?.init?.type === "ObjectExpression") {
      return { file, root: declarator.init };
    }
  }
  throw new Error(`${file}: no \`const content = { ... }\` found`);
};

const propertyName = (property) => property.key.name ?? property.key.value;

const properties = (objectNode) =>
  objectNode.properties.map((property) => [propertyName(property), property.value]);

const get = (objectNode, name) =>
  properties(objectNode).find(([key]) => key === name)?.[1];

/**
 * Legal citations in a canonical form, "Art 6(1)(b)" or "§ 25(2)". English
 * writes "Art. 6(1)(b)" and "Section 25(2)", German "Art. 6 Abs. 1 lit. b"
 * and "§ 25 Abs. 2".
 */
const CITATIONS = {
  en: [
    [/\bArt\.\s*(\d+)(?:\((\d+)\))?(?:\(([a-z])\))?/g, "Art"],
    [/\bSection\s+(\d+)(?:\((\d+)\))?(?:\(([a-z])\))?/g, "§"],
  ],
  de: [
    [/\bArt\.\s*(\d+)(?:\s+Abs\.\s*(\d+))?(?:\s+lit\.\s*([a-z]))?/g, "Art"],
    [/§\s*(\d+)(?:\s+Abs\.\s*(\d+))?(?:\s+(?:lit\.|Nr\.)\s*([a-z0-9]))?/g, "§"],
  ],
};

const citations = (language, text) =>
  CITATIONS[language].flatMap(([pattern, label]) =>
    [...text.matchAll(pattern)].map(
      ([, number, paragraph, letter]) =>
        `${label} ${number}${paragraph ? `(${paragraph})` : ""}${letter ? `(${letter})` : ""}`,
    ),
  );

const asSet = (values) => [...values].sort().join(" ");

const elementName = (node) => {
  const name = node.openingElement.name;
  return name.type === "JSXIdentifier" ? name.name : "element";
};

/**
 * Reduces one text node to what must be equal across languages: the embedded
 * elements in order, the numbers and the legal citations. Wording is left out
 * on purpose.
 */
const fingerprint = (language, node) => {
  const embedded = [];
  let text = "";

  const visit = (current) => {
    switch (current.type) {
      case "Literal":
        text += ` ${current.value} `;
        break;
      case "TemplateLiteral":
        current.quasis.forEach((quasi) => (text += ` ${quasi.value.cooked} `));
        current.expressions.forEach(visit);
        break;
      case "JSXText":
        text += ` ${current.value} `;
        break;
      case "JSXExpressionContainer":
        visit(current.expression);
        break;
      case "Identifier":
        embedded.push(`{${current.name}}`);
        break;
      case "JSXFragment":
        current.children.forEach(visit);
        break;
      case "JSXElement":
        embedded.push(`<${elementName(current)}>`);
        current.children.forEach(visit);
        break;
      case "JSXEmptyExpression":
        break;
      default:
        embedded.push(`?${current.type}`);
    }
  };

  visit(node);
  return {
    embedded: embedded.join(" "),
    numbers: asSet(text.match(/\d+/g) ?? []),
    citations: asSet(citations(language, text)),
  };
};

const compareText = (where, nodes) => {
  const [a, b] = nodes.map((node, index) => fingerprint(LANGUAGES[index], node));
  if (a.embedded !== b.embedded) {
    errors.push(`${where}: embedded elements differ\n      en: ${a.embedded || "(none)"}\n      de: ${b.embedded || "(none)"}`);
  }
  if (a.numbers !== b.numbers) {
    errors.push(`${where}: numbers differ\n      en: ${a.numbers || "(none)"}\n      de: ${b.numbers || "(none)"}`);
  }
  if (a.citations !== b.citations) {
    errors.push(`${where}: legal citations differ\n      en: ${a.citations || "(none)"}\n      de: ${b.citations || "(none)"}`);
  }
};

const line = (node) => node.loc.start.line;

const trees = LANGUAGES.map(parse);
const [en, de] = trees.map((tree) => tree.root);

const enPages = properties(en).map(([key]) => key);
const dePages = properties(de).map(([key]) => key);
if (enPages.join() !== dePages.join()) {
  errors.push(`pages differ\n      en: ${enPages.join(", ")}\n      de: ${dePages.join(", ")}`);
}

let sectionCount = 0;
let entryCount = 0;

for (const page of enPages.filter((key) => dePages.includes(key))) {
  const pages = [get(en, page), get(de, page)];

  for (const field of ["title", "intro"]) {
    const values = pages.map((p) => get(p, field));
    if (values.some((value) => !value)) {
      errors.push(`${page}.${field}: missing in ${LANGUAGES[values.findIndex((v) => !v)]}`);
    } else {
      compareText(`${page}.${field}`, values);
    }
  }

  const sectionLists = pages.map((p) => get(p, "sections")?.elements ?? []);
  if (sectionLists[0].length !== sectionLists[1].length) {
    errors.push(`${page}: ${sectionLists[0].length} sections in en, ${sectionLists[1].length} in de`);
  }

  const shared = Math.min(sectionLists[0].length, sectionLists[1].length);
  for (let s = 0; s < shared; s += 1) {
    sectionCount += 1;
    const sections = [sectionLists[0][s], sectionLists[1][s]];
    const where = `${page}.sections[${s}] (en:${line(sections[0])}, de:${line(sections[1])})`;

    const keys = sections.map((section) =>
      properties(section).map(([key]) => key).join(", "),
    );
    if (keys[0] !== keys[1]) {
      errors.push(`${where}: fields differ\n      en: ${keys[0]}\n      de: ${keys[1]}`);
      continue;
    }

    compareText(`${where}.title`, sections.map((section) => get(section, "title")));

    const blockLists = sections.map((section) => get(section, "blocks")?.elements);
    if (blockLists[0]) {
      if (blockLists[0].length !== blockLists[1].length) {
        errors.push(`${where}.blocks: ${blockLists[0].length} in en, ${blockLists[1].length} in de`);
      } else {
        blockLists[0].forEach((block, index) => {
          const pair = [block, blockLists[1][index]];
          const kinds = pair.map((node) => properties(node).map(([key]) => key).join(", "));
          if (kinds[0] !== kinds[1]) {
            errors.push(`${where}.blocks[${index}]: ${kinds[0]} in en, ${kinds[1]} in de`);
            return;
          }
          if (kinds[0] === "list") {
            const lists = pair.map((node) => get(node, "list").elements);
            if (lists[0].length !== lists[1].length) {
              errors.push(`${where}.blocks[${index}].list: ${lists[0].length} in en, ${lists[1].length} in de`);
              return;
            }
            lists[0].forEach((entry, i) => {
              entryCount += 1;
              compareText(`${where}.blocks[${index}].list[${i}] (en:${line(entry)}, de:${line(lists[1][i])})`, [entry, lists[1][i]]);
            });
          } else {
            entryCount += 1;
            compareText(`${where}.blocks[${index}].paragraph (en:${line(block)}, de:${line(pair[1])})`, pair.map((node) => get(node, "paragraph")));
          }
        });
      }
    }

    for (const list of ["paragraphs", "items"]) {
      const entries = sections.map((section) => get(section, list)?.elements);
      if (!entries[0]) continue;

      if (entries[0].length !== entries[1].length) {
        errors.push(`${where}.${list}: ${entries[0].length} in en, ${entries[1].length} in de`);
        continue;
      }
      entries[0].forEach((entry, index) => {
        entryCount += 1;
        compareText(`${where}.${list}[${index}] (en:${line(entry)}, de:${line(entries[1][index])})`, [entry, entries[1][index]]);
      });
    }
  }
}

console.log(
  `legal:check  ${LANGUAGES.join(", ")}  |  ${enPages.length} pages  |  ${sectionCount} sections  |  ${entryCount} paragraphs and items`,
);

if (errors.length) {
  console.error(`\n${errors.length} mismatch${errors.length === 1 ? "" : "es"}:\n`);
  errors.forEach((error) => console.error(`  ✗ ${error}`));
  process.exit(1);
}

console.log("\nlegal:check passed");
