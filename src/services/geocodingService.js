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

    const detectedCountryCode = countryCode || this.detectCountryCode(postalCode);
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
