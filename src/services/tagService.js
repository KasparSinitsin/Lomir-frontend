import api from "./api";

const TAG_CACHE_TTL_MS = 10 * 60 * 1000;

let structuredTagsCache = null;
let structuredTagsCacheExpiresAt = 0;
let structuredTagsRequest = null;
const popularTagsCache = new Map();

const cloneTagData = (data) => {
  if (typeof structuredClone === "function") {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data));
};

const isCacheFresh = (expiresAt) => expiresAt > Date.now();

const getPopularTagsCacheKey = (limit, supercategory) =>
  JSON.stringify([limit, supercategory || null]);

const clearTagCaches = () => {
  structuredTagsCache = null;
  structuredTagsCacheExpiresAt = 0;
  structuredTagsRequest = null;
  popularTagsCache.clear();
};

export const tagService = {
  // Fetch structured tags
  getStructuredTags: async () => {
    try {
      if (structuredTagsCache && isCacheFresh(structuredTagsCacheExpiresAt)) {
        return cloneTagData(structuredTagsCache);
      }

      if (structuredTagsRequest) {
        const cachedData = await structuredTagsRequest;
        return cloneTagData(cachedData);
      }

      structuredTagsRequest = api.get("/api/tags/structured").then((response) => {
        const processedData = (response.data || []).map((supercat) => ({
          ...supercat,

          // IMPORTANT: supercat.id is a STRING (e.g. "Business & Entrepreneurship") — keep it
          id: supercat?.id,
          name: supercat?.name,

          categories: (supercat?.categories || []).map((cat) => ({
            ...cat,

            // IMPORTANT: cat.id may also be a STRING — keep it
            id: cat?.id,
            name: cat?.name,

            // Leaf tags are the selectable focus areas → ensure tag.id is numeric
            tags: (cat?.tags || []).map((tag) => ({
              ...tag,
              id: Number(tag?.id),
            })),
          })),
        }));

        structuredTagsCache = processedData;
        structuredTagsCacheExpiresAt = Date.now() + TAG_CACHE_TTL_MS;
        structuredTagsRequest = null;

        return processedData;
      });

      const processedData = await structuredTagsRequest;
      return cloneTagData(processedData);
    } catch (error) {
      structuredTagsRequest = null;
      console.error("Error fetching structured tags:", error);
      throw error;
    }
  },

  // Create a new tag
  createTag: async (tagData) => {
    try {
      const response = await api.post("/api/tags/create", tagData);
      clearTagCaches();
      return response.data;
    } catch (error) {
      console.error("Error creating tag:", error);
      throw error;
    }
  },

  // Search tags
  searchTags: async (query) => {
    try {
      const response = await api.get("/api/tags/search", {
        params: { query },
      });
      return response.data;
    } catch (error) {
      console.error("Error searching tags:", error);
      throw error;
    }
  },
  // NEW METHODS FOR AUTOCOMPLETE

  /**
   * Get popular tags with usage counts
   */
  getPopularTags: async (limit = 10, supercategory = null) => {
    try {
      const cacheKey = getPopularTagsCacheKey(limit, supercategory);
      const cachedEntry = popularTagsCache.get(cacheKey);

      if (cachedEntry && isCacheFresh(cachedEntry.expiresAt)) {
        return cloneTagData(cachedEntry.data);
      }

      const params = { limit };
      if (supercategory) {
        params.supercategory = supercategory;
      }
      const response = await api.get("/api/tags/popular", { params });
      const popularTags = response.data.data || [];

      popularTagsCache.set(cacheKey, {
        data: popularTags,
        expiresAt: Date.now() + TAG_CACHE_TTL_MS,
      });

      return cloneTagData(popularTags);
    } catch (error) {
      console.error("Error fetching popular tags:", error);
      return [];
    }
  },

  /**
   * Get tag suggestions based on search query
   */
  getSuggestions: async (query, limit = 10, excludeIds = []) => {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }
      const params = {
        query: query.trim(),
        limit,
      };
      if (excludeIds.length > 0) {
        params.exclude = excludeIds.join(",");
      }
      const response = await api.get("/api/tags/suggestions", { params });
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching tag suggestions:", error);
      return [];
    }
  },

  /**
   * Get related tags from same category or supercategory
   */
  getRelatedTags: async (tagId, limit = 5, excludeIds = []) => {
    try {
      const params = { limit };
      if (excludeIds.length > 0) {
        params.exclude = excludeIds.join(",");
      }
      const response = await api.get(`/api/tags/related/${tagId}`, { params });
      return {
        tags: response.data.data || [],
        context: response.data.context || {},
      };
    } catch (error) {
      console.error("Error fetching related tags:", error);
      return { tags: [], context: {} };
    }
  },
};

export default tagService;
