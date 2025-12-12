

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// import React, { useState, FormEvent } from 'react';
import React, { useState, FormEvent } from 'react';
import { AgriculturalParameters, fetchAgriculturalRecommendations } from '@/lib/maps-grounding';
import { useMapStore, useAgriculturalStore } from '@/lib/state';
import { calculateRectangleCorners, calculateRectangleDimensions } from '@/lib/rectangle-utils';

interface AgriculturalFormProps {
  onSubmit?: (params: AgriculturalParameters) => void;
}

export default function AgriculturalForm({ onSubmit }: AgriculturalFormProps) {
  const { setRectangularOverlays, clearRectangularOverlays } = useMapStore();
  const { setRecommendations } = useAgriculturalStore();
  
  const [formData, setFormData] = useState<AgriculturalParameters>({
    latitude: 0,
    longitude: 0,
    soilType: 'loamy',
    climate: 'temperate',
    season: 'spring',
    rainfall: undefined,
    temperature: undefined,
    irrigationAvailable: undefined,
    farmSize: undefined,
    multiCrop: undefined,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof AgriculturalParameters, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      handleInputChange('latitude', latitude);
      handleInputChange('longitude', longitude);
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          alert("Please allow location access to use this feature.");
          break;
        case error.POSITION_UNAVAILABLE:
          alert("Location information is unavailable.");
          break;
        case error.TIMEOUT:
          alert("Request timed out. Try again.");
          break;
        default:
          alert("Unable to fetch location.");
      }
    }
  );
};

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.latitude || !formData.longitude) {
      setError('Please enter valid latitude and longitude coordinates');
      return;
    }

    if (formData.latitude < -90 || formData.latitude > 90) {
      setError('Latitude must be between -90 and 90 degrees');
      return;
    }

    if (formData.longitude < -180 || formData.longitude > 180) {
      setError('Longitude must be between -180 and 180 degrees');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Clear any existing rectangular overlays
      clearRectangularOverlays();
      
      // Create a rectangular overlay for the farm location
      const farmSize = formData.farmSize || 10; // Default to 10 hectares if not specified
      
      // Calculate rectangle dimensions
      const dimensions = calculateRectangleDimensions(farmSize);
      
      // Calculate the 4 corner points of the rectangle
      const corners = calculateRectangleCorners(
        formData.latitude,
        formData.longitude,
        farmSize
      );
      
      const rectangularOverlay = {
        center: {
          lat: formData.latitude,
          lng: formData.longitude,
          altitude: 0
        },
        corners: corners,
        width: dimensions.width,
        height: dimensions.height,
        label: `Farm Location (${farmSize} hectares)`,
        color: '#ff0000' // Red color as requested
      };
      
      // Set the rectangular overlay on the map
      setRectangularOverlays([rectangularOverlay]);
      
      const result = await fetchAgriculturalRecommendations(formData);
      const responseText =
        result.candidates?.[0]?.content?.parts?.[0]?.text || 'No recommendations available';
      setRecommendations(responseText);
      if (onSubmit) onSubmit(formData);
    } catch (error) {
      console.error('Error submitting agricultural form:', error);
      setError('Error getting recommendations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="agricultural-form">
      <form onSubmit={handleSubmit} className="form-content">
          {/* Location Section */}
          <div className="form-section">
            <h3>Farm Location</h3>
            <div className="input-group">
              <div className="input-field">
                <label htmlFor="latitude">Latitude *</label>
                <input
                  type="number"
                  id="latitude"
                  value={formData.latitude || ''}
                  onChange={(e) =>
                    handleInputChange('latitude', parseFloat(e.target.value) || 0)
                  }
                  placeholder="e.g., 40.7128"
                  min="-90"
                  max="90"
                  step="any"
                  required
                />
              </div>
              <div className="input-field">
                <label htmlFor="longitude">Longitude *</label>
                <input
                  type="number"
                  id="longitude"
                  value={formData.longitude || ''}
                  onChange={(e) =>
                    handleInputChange('longitude', parseFloat(e.target.value) || 0)
                  }
                  placeholder="e.g., -74.0060"
                  min="-180"
                  max="180"
                  step="any"
                  required
                />
              </div>
            </div>
            {/* Use Current Location Button */}
            <button
              type="button"
              className="use-location-btn"
              onClick={getCurrentLocation}
            >
              <span className="material-symbols-outlined">my_location</span>
              Use Current Location
            </button>
          </div>

          <div className="form-section">
  <h3>Required Parameters</h3>
  <div className="input-group">
    {/* Soil Type */}
    <div className="input-field">
      <label htmlFor="soilType">Soil Type *</label>
      <select
        id="soilType"
        value={formData.soilType}
        onChange={(e) => handleInputChange('soilType', e.target.value)}
        required
      >
        <option value="" disabled hidden>
          Select soil type
        </option>
        <option value="clay">Clay</option>
        <option value="sandy">Sandy</option>
        <option value="silty">Silty</option>
        <option value="peaty">Peaty</option>
        <option value="chalky">Chalky</option>
        <option value="loamy">Loamy</option>
      </select>
    </div>

    {/* Climate Zone */}
    <div className="input-field">
      <label htmlFor="climate">Climate Zone *</label>
      <select
        id="climate"
        value={formData.climate}
        onChange={(e) => handleInputChange('climate', e.target.value)}
        required
      >
        <option value="tropical">Tropical</option>
        <option value="arid">Arid</option>
        <option value="temperate">Temperate</option>
        <option value="continental">Continental</option>
        <option value="polar">Polar</option>
      </select>
    </div>

    {/* Season */}
    <div className="input-field">
      <label htmlFor="season">Season *</label>
      <select
        id="season"
        value={formData.season}
        onChange={(e) => handleInputChange('season', e.target.value)}
        required
      >
        <option value="spring">Spring</option>
        <option value="summer">Summer</option>
        <option value="fall">Fall</option>
        <option value="winter">Winter</option>
      </select>
    </div>

    {/* Farm Size */}
    <div className="input-field">
      <label htmlFor="farmSize">Farm Size (hectares)</label>
      <input
        type="number"
        id="farmSize"
        value={formData.farmSize || ''}
        onChange={(e) =>
          handleInputChange('farmSize', parseFloat(e.target.value) || undefined)
        }
        placeholder="e.g., 10"
        min="0"
        step="any"
      />
    </div>

    {/* Annual Rainfall */}
    <div className="input-field">
      <label htmlFor="rainfall">Annual Rainfall (mm)</label>
      <input
        type="number"
        id="rainfall"
        value={formData.rainfall || ''}
        onChange={(e) =>
          handleInputChange('rainfall', parseFloat(e.target.value) || undefined)
        }
        placeholder="e.g., 800"
        min="0"
        max="12000"
      />
    </div>

    {/* Average Temperature */}
    <div className="input-field">
      <label htmlFor="temperature">Average Temperature (°C)</label>
      <input
        type="number"
        id="temperature"
        value={formData.temperature || ''}
        onChange={(e) =>
          handleInputChange('temperature', parseFloat(e.target.value) || undefined)
        }
        placeholder="e.g., 25"
        min="0"
        max="60"
        step="any"
      />
    </div>

    {/* Multi Crop + Irrigation Row */}
    <div
      className="input-group"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '40px',
      }}
    >
      {/* Multi Crop */}
      <div className="input-field" style={{ flex: 1 }}>
        <label htmlFor="multiCrop">Multi Crop</label>
        <select
          id="multiCrop"
          value={formData.multiCrop || ''}
          onChange={(e) => handleInputChange('multiCrop', e.target.value)}
          required
          style={{
            width: '100%',
            height: '40px',
            borderRadius: '6px',
          }}
        >
          {/* <option value="">Yes</option> */}
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      {/* Irrigation Available */}
      <div
        className="input-field checkbox-field"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          marginTop: '16px',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={formData.irrigationAvailable || false}
            onChange={(e) =>
              handleInputChange('irrigationAvailable', e.target.checked)
            }
          />
          Irrigation Available
        </label>
      </div>
    </div>
  </div>
</div>


          {/* Submit Button */}
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              <span className="material-symbols-outlined">agriculture</span>
              {isSubmitting ? 'Getting Recommendations...' : 'Get Crop Recommendations'}
            </button>
            {error && (
              <p className="error-message">
                {error}
              </p>
            )}
          </div>
        </form>
      </div>
  );
}


