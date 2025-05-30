import React, { useState } from 'react';
import LocationDisplay from '../common/LocationDisplay';
import { geocodingService } from '../../services/geocodingService';

const LocationTest = () => {
  const [testPostalCode, setTestPostalCode] = useState('55116');
  const [cacheInfo, setCacheInfo] = useState({ size: 0 });

  const handleTest = async () => {
    // Test direct service call
    const result = await geocodingService.getLocationFromPostalCode(testPostalCode);
    console.log('Direct geocoding result:', result);
    
    // Update cache info
    setCacheInfo({ size: geocodingService.getCacheSize() });
  };

  return (
    <div className="p-4 border rounded-lg bg-base-200 m-4">
      <h3 className="text-lg font-semibold mb-4">Location Display Test</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Test Postal Code:
        </label>
        <input
          type="text"
          value={testPostalCode}
          onChange={(e) => setTestPostalCode(e.target.value)}
          className="input input-bordered w-full max-w-xs"
          placeholder="Enter postal code"
        />
        <button 
          onClick={handleTest}
          className="btn btn-primary btn-sm ml-2"
        >
          Test Direct Call
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <strong>LocationDisplay Component:</strong>
          <LocationDisplay postalCode={testPostalCode} />
        </div>
        
        <div>
          <strong>Without Icon:</strong>
          <LocationDisplay postalCode={testPostalCode} showIcon={false} />
        </div>
        
        <div>
          <strong>Custom Style:</strong>
          <LocationDisplay 
            postalCode={testPostalCode} 
            className="bg-primary/10 px-2 py-1 rounded-full"
            iconSize={20}
          />
        </div>
      </div>

      <div className="mt-4 text-xs text-base-content/60">
        Cache size: {cacheInfo.size} entries
      </div>
    </div>
  );
};

export default LocationTest;