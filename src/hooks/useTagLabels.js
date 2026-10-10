import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTagTranslations } from "./useTagQueries";
import { createTagLabels, EMPTY_TAG_DICTIONARY } from "../utils/tagLabels";

/**
 * The labels to SHOW for tags, categories and supercategories in the active language.
 *
 *   const { tagLabel, categoryLabel, supercategoryLabel, language } = useTagLabels();
 *   tagLabel(tag)                       // by id, falls back to tag.name
 *   categoryLabel(tag.category)         // by the English text, falls back to it
 *   supercategoryLabel(tag.supercategory)
 *
 * English asks for nothing. While the dictionary loads, or if it fails, every label is the
 * stored name: translations decorate the page and must never be able to break it.
 * Sort lists by the label you show, with `language` as the locale.
 */
export const useTagLabels = () => {
  const { i18n } = useTranslation();
  const language = (i18n.language || "en").split("-")[0];
  const { data } = useTagTranslations(language);

  return useMemo(
    () => ({ ...createTagLabels(data || EMPTY_TAG_DICTIONARY), language }),
    [data, language],
  );
};
