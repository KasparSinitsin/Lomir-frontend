/**
 * Display labels for the tag taxonomy (STATUS item 11, mechanism B).
 *
 * The stored English names are DATA: `teamMatchUtils` and the visibility rules compare them, and
 * the icons are keyed by them. They are never translated in place. These helpers only choose
 * the text to SHOW, from the dictionary `GET /api/tags/translations?lang=` returns:
 *
 *   { language, tags: { "<tag id>": "name" },
 *     categories: { "<English category text>": "name" },
 *     supercategories: { "<English supercategory text>": "name" } }
 *
 * Tags are looked up by id, categories and supercategories by the English text a tag carries.
 * Anything the dictionary does not know (English, a language without translations, a tag made
 * later, a failed request) shows the stored name, so a missing translation is never blank.
 */

export const EMPTY_TAG_DICTIONARY = Object.freeze({
  language: null,
  tags: Object.freeze({}),
  categories: Object.freeze({}),
  supercategories: Object.freeze({}),
});

const has = (map, key) => Object.prototype.hasOwnProperty.call(map, key);

const pick = (map, key, stored) =>
  typeof key === "string" && has(map, key) && map[key] ? map[key] : stored;

export const createTagLabels = (dictionary) => {
  const d = dictionary && typeof dictionary === "object" ? dictionary : EMPTY_TAG_DICTIONARY;
  const tags = d.tags || {};
  const categories = d.categories || {};
  const supercategories = d.supercategories || {};

  return {
    /** A tag object `{ id, name }` (`tag_id` / `tagId` also count), or `(id, name)`. */
    tagLabel: (tagOrId, name) => {
      const id =
        tagOrId !== null && typeof tagOrId === "object"
          ? (tagOrId.id ?? tagOrId.tag_id ?? tagOrId.tagId)
          : tagOrId;
      const stored = tagOrId !== null && typeof tagOrId === "object" ? tagOrId.name : name;
      const key = id === undefined || id === null ? null : String(id);
      return key !== null && has(tags, key) && tags[key] ? tags[key] : stored;
    },
    categoryLabel: (storedName) => pick(categories, storedName, storedName),
    supercategoryLabel: (storedName) => pick(supercategories, storedName, storedName),
  };
};
