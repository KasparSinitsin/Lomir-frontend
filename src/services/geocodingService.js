import api from "./api";

class GeocodingService {
  constructor() {
    this.cache = new Map(); // Simple in-memory cache
  }

  // Helper function to detect country code from postal code format
  detectCountryCode(postalCode) {
    if (!postalCode) return "DE";

    const code = postalCode.toString().trim();

    if (/^\d{5}$/.test(code)) return "DE"; // German: 12345
    if (/^\d{4}$/.test(code)) return "NL"; // Dutch: 1234
    if (/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(code)) return "GB"; // UK: SW1A 1AA
    if (/^\d{2}-\d{3}$/.test(code)) return "PL"; // Polish: 12-345
    if (/^\d{5}-\d{3}$/.test(code)) return "PT"; // Portuguese: 12345-123
    if (/^\d{3}\s\d{2}$/.test(code)) return "SE"; // Swedish: 123 45
    if (/^\d{4}\s[A-Z]{2}$/i.test(code)) return "NO"; // Norwegian: 1234 AB
    if (/^\d{4}$/.test(code)) return "DK"; // Danish: 1234
    if (/^\d{4}$/.test(code)) return "AT"; // Austrian: 1234
    if (/^\d{4}$/.test(code)) return "CH"; // Swiss: 1234
    if (/^\d{5}$/.test(code)) return "IT"; // Italian: 12345
    if (/^\d{5}$/.test(code)) return "FR"; // French: 12345
    if (/^\d{5}$/.test(code)) return "ES"; // Spanish: 12345
    if (/^\d{4}$/.test(code)) return "BE"; // Belgian: 1234
    if (/^\d{2}\s\d{3}$/.test(code)) return "CZ"; // Czech: 12 345

    return "DE"; // Default fallback
  }

  async getLocationFromPostalCode(postalCode, countryCode = null) {
    if (!postalCode) return null;

    // Auto-detect country code if not provided
    const detectedCountryCode =
      countryCode || this.detectCountryCode(postalCode);

    // Check cache first
    const cacheKey = `${postalCode}-${detectedCountryCode}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use your backend API instead of direct Nominatim call
      const response = await api.get(
        `/api/geocoding/postal-code/${postalCode}`,
        {
          params: { country: detectedCountryCode },
        }
      );

      if (response.data) {
        const locationInfo = {
          // Display information
          city: response.data.city,
          state: response.data.state,
          country: response.data.country,
          displayName: response.data.displayName,

          // Map coordinates for future use
          latitude: response.data.latitude,
          longitude: response.data.longitude,

          // Additional useful data
          importance: response.data.importance,
          osmType: response.data.osmType,
        };

        // Cache the result for 1 hour
        this.cache.set(cacheKey, locationInfo);

        // Set cache expiry
        setTimeout(() => {
          this.cache.delete(cacheKey);
        }, 60 * 60 * 1000); // 1 hour

        return locationInfo;
      }

      return null;
    } catch (error) {
      console.warn("Geocoding error for postal code:", postalCode, error);
      return null;
    }
  }

  formatDisplayName(address) {
    const city =
      address.city || address.town || address.village || address.hamlet;
    const country = address.country;

    if (city && country) {
      return `${city}, ${country}`;
    } else if (city) {
      return city;
    } else if (country) {
      return country;
    }

    return "";
  }

  // Clear cache method for testing
  clearCache() {
    this.cache.clear();
  }

  // Get cache size for debugging
  getCacheSize() {
    return this.cache.size;
  }
}

export const geocodingService = new GeocodingService();
export default geocodingService;
