import api from "./api";

class GeocodingService {
  constructor() {
    this.cache = new Map(); // Simple in-memory cache
  }

  /**
   * Detect the country from a postal code format - but only when the format is
   * genuinely distinctive.
   *
   * A postal code does not identify a country. Four digits are used by AT, CH,
   * BE, DK, NO, HU and SI; five by DE, FR, IT, ES and FI. This function used to
   * resolve that ambiguity by guessing (four digits -> NL, five -> DE), which
   * made the later branches for AT, CH, DK, BE, IT, FR and ES unreachable and
   * could write a wrong country into a profile: 20099 is Hamburg in Germany and
   * Sesto San Giovanni in Italy, and the Italian user got Hamburg.
   *
   * It now returns null when the format is ambiguous. The caller must ask the
   * user instead of guessing.
   *
   * @param {string} postalCode
   * @returns {string|null} ISO country code, or null when undeterminable
   */
  detectCountryCode(postalCode) {
    if (!postalCode) return null;

    const code = postalCode.toString().trim();

    // Letters make these formats unmistakable
    if (/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(code)) return "CA"; // M5H 2N2
    if (/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(code)) return "GB"; // SW1A 1AA
    if (/^\d{4}\s?[A-Z]{2}$/i.test(code)) return "NL"; // 1012 AB

    // Distinctive separators
    if (/^\d{2}-\d{3}$/.test(code)) return "PL"; // 12-345
    if (/^\d{4}-\d{3}$/.test(code)) return "PT"; // 1234-567
    if (/^\d{3}\s\d{2}$/.test(code)) return "SE"; // 123 45

    // Everything else (four and five bare digits above all) is ambiguous.
    return null;
  }

  async getLocationFromPostalCode(postalCode, countryCode = null) {
    if (!postalCode) return null;

    const detectedCountryCode = countryCode || this.detectCountryCode(postalCode);

    // Without a country the lookup cannot be answered correctly - the same
    // digits exist in several countries - so do not send a request that would
    // return a confidently wrong place.
    if (!detectedCountryCode) return null;

    const cacheKey = `${postalCode}-${detectedCountryCode}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await api.get(`/api/geocoding/postal-code/${postalCode}`, {
        params: { country: detectedCountryCode },
      });

      if (response.data) {
        const locationInfo = {
          // Basic information
          city: response.data.city,
          state: response.data.state,
          country: response.data.country,
          
          // Enhanced detailed information
          district: response.data.district,        // Charlottenburg, Schweinheim
          suburb: response.data.suburb,            // Neighborhood level
          borough: response.data.borough,          // Borough/Bezirk
          cityDistrict: response.data.cityDistrict, // City district
          
          // Multiple display options
          displayName: response.data.displayName,
          shortDisplayName: this.formatShortDisplayName(response.data),
          detailedDisplayName: this.formatDetailedDisplayName(response.data),
          
          // Map coordinates
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          
          // Additional data
          importance: response.data.importance,
          osmType: response.data.osmType,
          
          // Raw address components for debugging
          rawAddress: response.data.rawAddress
        };

        this.cache.set(cacheKey, locationInfo);
        setTimeout(() => this.cache.delete(cacheKey), 60 * 60 * 1000);

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

  // Format detailed display name with district/neighborhood
  formatDetailedDisplayName(addressData) {
    const components = [];
    
    // Add district/neighborhood if available
    if (addressData.district) {
      components.push(addressData.district);
    } else if (addressData.suburb) {
      components.push(addressData.suburb);
    } else if (addressData.borough) {
      components.push(addressData.borough);
    } else if (addressData.cityDistrict) {
      components.push(addressData.cityDistrict);
    }
    
    // Add city
    if (addressData.city) {
      components.push(addressData.city);
    }
    
    // Add country
    if (addressData.country) {
      components.push(addressData.country);
    }
    
    return components.join(", ");
  }

  // Format short display name (city, country)
  formatShortDisplayName(addressData) {
    const components = [];
    
    if (addressData.city) {
      components.push(addressData.city);
    }
    
    if (addressData.country) {
      components.push(addressData.country);
    }
    
    return components.join(", ");
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
