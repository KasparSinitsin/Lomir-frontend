import { useQuery } from "@tanstack/react-query";
import { tagService } from "../services/tagService";

export const structuredTagsQueryKey = ["tags", "structured"];

export const tagTranslationsQueryKey = (language) => ["tags", "translations", language];

export const popularTagsQueryKey = (limit = 10, supercategory = null) => [
  "tags",
  "popular",
  limit,
  supercategory ?? null,
];

export const flattenStructuredTags = (structuredTags = []) =>
  (structuredTags || [])
    .flatMap((supercat) =>
      (supercat.categories || []).map((category) => ({
        category,
        supercategory: supercat,
      })),
    )
    .flatMap(({ category, supercategory }) =>
      (category.tags || []).map((tag) => ({
        ...tag,
        supercategory: supercategory.name,
        category: category.name,
      })),
    );

export const useStructuredTags = (options = {}) =>
  useQuery({
    queryKey: structuredTagsQueryKey,
    queryFn: tagService.getStructuredTags,
    staleTime: 10 * 60_000,
    ...options,
  });

export const usePopularTags = (
  limit = 10,
  supercategory = null,
  options = {},
) =>
  useQuery({
    queryKey: popularTagsQueryKey(limit, supercategory),
    queryFn: () => tagService.getPopularTags(limit, supercategory),
    staleTime: 10 * 60_000,
    ...options,
  });

/**
 * The dictionary of translated tag names for a language. English (or no language) is never
 * fetched. The names change when somebody imports a portion, not while the app runs, so the
 * answer is kept for half an hour; a failure is retried once and then shows the stored names.
 */
export const useTagTranslations = (language, options = {}) =>
  useQuery({
    queryKey: tagTranslationsQueryKey(language),
    queryFn: () => tagService.getTagTranslations(language),
    enabled: Boolean(language) && language !== "en",
    staleTime: 30 * 60_000,
    retry: 1,
    ...options,
  });
