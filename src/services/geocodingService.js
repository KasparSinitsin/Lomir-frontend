import axios from "axios";

class GeocodingService {
  constructor() {
    this.baseURL = "https://nominatim.openstreetmap.org";
    this.cache = new Map(); // Simple in-memory cache
  }

  async getLocationFromPostalCode(postalCode, countryCode = "DE") {
    if (!postalCode) return null;

    // Check cache first
    const cacheKey = `${postalCode}-${countryCode}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          postalcode: postalCode,
          countrycodes: countryCode,
          format: "json",
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          "User-Agent": "Lomir-App/1.0", // Required by Nominatim
        },
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const address = result.address;

        const locationInfo = {
          // Display information
          city:
            address.city || address.town || address.village || address.hamlet,
          state: address.state,
          country: address.country,
          displayName: this.formatDisplayName(address),

          // Map coordinates for future use
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),

          // Additional useful data
          importance: result.importance,
          osmType: result.osm_type,
        };

        // Cache the result for 1 hour
        this.cache.set(cacheKey, locationInfo);

        // Optional: Set cache expiry (for production)
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
