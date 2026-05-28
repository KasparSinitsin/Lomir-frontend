import { useQuery } from "@tanstack/react-query";
import { tagService } from "../services/tagService";

export const structuredTagsQueryKey = ["tags", "structured"];

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
