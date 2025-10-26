// /**
//  * @license
//  * SPDX-License-Identifier: Apache-2.0
// */
// /**
//  * Copyright 2024 Google LLC
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

// import React, { useState, FormEvent } from 'react';
// import { AgriculturalParameters, fetchAgriculturalRecommendations } from '@/lib/maps-grounding';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
// import './AgriculturalForm.css';

// interface AgriculturalFormProps {
//   onSubmit?: (params: AgriculturalParameters) => void;
// }

// export default function AgriculturalForm({ onSubmit }: AgriculturalFormProps) {
//   const [formData, setFormData] = useState<AgriculturalParameters>({
//     latitude: 0,
//     longitude: 0,
//     soilType: 'loamy',
//     climate: 'temperate',
//     season: 'spring',
//     rainfall: undefined,
//     temperature: undefined,
//     irrigationAvailable: undefined,
//     farmSize: undefined,
//     multiCrop: undefined,
//   });

//   const [showOptional, setShowOptional] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [response, setResponse] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const handleInputChange = (field: keyof AgriculturalParameters, value: any) => {
//     setFormData(prev => ({
//       ...prev,
//       [field]: value,
//     }));
//   };

//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();

//     // Validate required fields
//     if (!formData.latitude || !formData.longitude) {
//       setError('Please enter valid latitude and longitude coordinates');
//       return;
//     }

//     if (formData.latitude < -90 || formData.latitude > 90) {
//       setError('Latitude must be between -90 and 90 degrees');
//       return;
//     }

//     if (formData.longitude < -180 || formData.longitude > 180) {
//       setError('Longitude must be between -180 and 180 degrees');
//       return;
//     }

//     setIsSubmitting(true);
//     setError(null);
//     setResponse(null);

//     try {
//       // Call the agricultural recommendation API directly
//       const result = await fetchAgriculturalRecommendations(formData);

//       // Extract the text response from the API result
//       const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No recommendations available';
//       setResponse(responseText);

//       // Call the optional onSubmit callback
//       if (onSubmit) {
//         onSubmit(formData);
//       }
//     } catch (error) {
//       console.error('Error submitting agricultural form:', error);
//       setError('Error getting recommendations. Please try again.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <>
//     {/* 🌾 Full-Width AgriConnect Intro Section */}
//     <section className="agriconnect-hero">
//       <div className="agriconnect-hero-content">
//         <h1 className="agriconnect-title">AgriConnect</h1>
//         <p className="agriconnect-subtitle">Smart Crop Recommendations</p>

//         <div className="agriconnect-description">
//           <h2>About AgriConnect Platform</h2>
//           <p>
//             AgriConnect uses advanced AI algorithms and environmental data to provide personalized crop
//             recommendations for your farm. Our system analyzes your location, soil type, climate
//             conditions, and seasonal patterns to suggest the most suitable crops for optimal yield.
//             <br /><br />
//             Sign in to get started and unlock data-driven insights that will help you make smarter
//             farming decisions.
//           </p>
//         </div>

//         <div className="agriconnect-feature-cards">
//           <div className="feature-card">
//             <div className="feature-icon">🌿</div>
//             <h3>Smart Analysis</h3>
//             <p>Data-driven insights for better farming decisions based on real-time environmental factors.</p>
//           </div>

//           <div className="feature-card">
//             <div className="feature-icon">📈</div>
//             <h3>Maximize Yield</h3>
//             <p>Optimize your harvest with tailored recommendations that suit your specific farm conditions.</p>
//           </div>

//           <div className="feature-card">
//             <div className="feature-icon">🌦️</div>
//             <h3>Climate Aware</h3>
//             <p>Recommendations based on local weather patterns and seasonal climate variations.</p>
//           </div>
//         </div>
//       </div>
//     </section>

//     {/* Existing Left Form (stays left beside map) */}
//     <div className="agricultural-form">
//       {/* Existing header */}
//       <div className="form-header">
//         <h2>🌱 Agricultural Crop Recommendations</h2>
//         <p>Get AI-powered crop recommendations based on your farm location and conditions.</p>
//       </div>

//       <form onSubmit={handleSubmit} className="form-content">
//         {/* Location Section */}
//         <div className="form-section">
//           <h3>📍 Farm Location</h3>
//           <div className="input-group">
//             <div className="input-field">
//               <label htmlFor="latitude">Latitude *</label>
//               <input
//                 type="number"
//                 id="latitude"
//                 value={formData.latitude || ''}
//                 onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || 0)}
//                 placeholder="e.g., 40.7128"
//                 step="any"
//                 required
//               />
//             </div>
//             <div className="input-field">
//               <label htmlFor="longitude">Longitude *</label>
//               <input
//                 type="number"
//                 id="longitude"
//                 value={formData.longitude || ''}
//                 onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || 0)}
//                 placeholder="e.g., -74.0060"
//                 step="any"
//                 required
//               />
//             </div>
//           </div>
//         </div>

//         {/* Required Parameters */}
//         <div className="form-section">
//           <h3>🌍 Required Parameters</h3>
//           <div className="input-group">
//             <div className="input-field">
//               <label htmlFor="soilType">Soil Type *</label>
//               <select
//                 id="soilType"
//                 value={formData.soilType}
//                 onChange={(e) => handleInputChange('soilType', e.target.value)}
//                 required
//               >
//                 <option value="clay">Clay</option>
//                 <option value="sandy">Sandy</option>
//                 <option value="loamy">Loamy</option>
//                 <option value="silt">Silt</option>
//                 <option value="peat">Peat</option>
//               </select>
//             </div>
//             <div className="input-field">
//               <label htmlFor="climate">Climate Zone *</label>
//               <select
//                 id="climate"
//                 value={formData.climate}
//                 onChange={(e) => handleInputChange('climate', e.target.value)}
//                 required
//               >
//                 <option value="tropical">Tropical</option>
//                 <option value="arid">Arid</option>
//                 <option value="temperate">Temperate</option>
//                 <option value="continental">Continental</option>
//                 <option value="polar">Polar</option>
//               </select>
//             </div>
//             <div className="input-field">
//               <label htmlFor="season">Season *</label>
//               <select
//                 id="season"
//                 value={formData.season}
//                 onChange={(e) => handleInputChange('season', e.target.value)}
//                 required
//               >
//                 <option value="spring">Spring</option>
//                 <option value="summer">Summer</option>
//                 <option value="fall">Fall</option>
//                 <option value="winter">Winter</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Optional Parameters */}
//         <div className="form-section">
//           <button
//             type="button"
//             className="toggle-optional"
//             onClick={() => setShowOptional(!showOptional)}
//           >
//             {showOptional ? '▼' : '▶'} Optional Parameters
//           </button>

//           {showOptional && (
//             <div className="optional-params">
//               <div className="input-group">
//                 <div className="input-field">
//                   <label htmlFor="rainfall">Annual Rainfall (mm)</label>
//                   <input
//                     type="number"
//                     id="rainfall"
//                     value={formData.rainfall || ''}
//                     onChange={(e) => handleInputChange('rainfall', parseFloat(e.target.value) || undefined)}
//                     placeholder="e.g., 800"
//                     min="0"
//                   />
//                 </div>
//                 <div className="input-field">
//                   <label htmlFor="temperature">Average Temperature (°C)</label>
//                   <input
//                     type="number"
//                     id="temperature"
//                     value={formData.temperature || ''}
//                     onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || undefined)}
//                     placeholder="e.g., 25"
//                     step="any"
//                   />
//                 </div>
//                 <div className="input-field">
//                   <label htmlFor="farmSize">Farm Size (hectares)</label>
//                   <input
//                     type="number"
//                     id="farmSize"
//                     value={formData.farmSize || ''}
//                     onChange={(e) => handleInputChange('farmSize', parseFloat(e.target.value) || undefined)}
//                     placeholder="e.g., 10"
//                     min="0"
//                     step="any"
//                   />
//                 </div>
//               </div>
//               <div className="input-group">
//                 <div className="input-field checkbox-field">
//                   <label>
//                     <input
//                       type="checkbox"
//                       checked={formData.irrigationAvailable || false}
//                       onChange={(e) => handleInputChange('irrigationAvailable', e.target.checked)}
//                     />
//                     Irrigation Available
//                   </label>
//                 </div>
//                 <div className="input-field">
//                   <label htmlFor="multiCrop">Multi Crop</label>
//                   <input
//                     type="text"
//                     id="multiCrop"
//                     value={formData.multiCrop || ''}
//                     onChange={(e) => handleInputChange('multiCrop', e.target.value || undefined)}
//                     placeholder="e.g., Wheat, Corn, Rice"
//                   />
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Submit Button */}
//         <div className="form-actions">
//           <button
//             type="submit"
//             className="submit-button"
//             disabled={isSubmitting}
//           >
//             {isSubmitting ? 'Getting Recommendations...' : '🌾 Get Crop Recommendations'}
//           </button>
//           {error && (
//             <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>
//               {error}
//             </p>
//           )}
//         </div>
//       </form>

//       {/* Response Section */}
//       {response && (
//         <div className="recommendations-section" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
//           <h3>🎯 Crop Recommendations</h3>
//           <div className="recommendation-content">
//             <ReactMarkdown remarkPlugins={[remarkGfm]}>
//               {response}
//             </ReactMarkdown>
//           </div>
//         </div>
//       )}
//     </div>
//     </>
//   );
// }

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
import React, { useState, FormEvent, useEffect } from 'react';
import { AgriculturalParameters, fetchAgriculturalRecommendations } from '@/lib/maps-grounding';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// import './AgriculturalForm.css';
// import './AgriculturalForm.css';
import './AgriculturalFormOverlay.css';
import { createPortal } from 'react-dom';
import { useMapStore } from '@/lib/state';
import { calculateRectangleCorners, calculateRectangleDimensions } from '@/lib/rectangle-utils';

interface AgriculturalFormProps {
  onSubmit?: (params: AgriculturalParameters) => void;
}

export default function AgriculturalForm({ onSubmit }: AgriculturalFormProps) {
  const { setRectangularOverlays, clearRectangularOverlays } = useMapStore();
  
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

  const [showOptional, setShowOptional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
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
    setResponse(null);

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
      setResponse(responseText);
      if (onSubmit) onSubmit(formData);
    } catch (error) {
      console.error('Error submitting agricultural form:', error);
      setError('Error getting recommendations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

    // Track the map container element so we can render the response overlay into it
  const [mapContainer, setMapContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Try to find the map panel in the page
    const el = document.querySelector('.map-panel') as HTMLElement | null;
    if (el) setMapContainer(el);
  }, []);

  // If the map panel wasn't present at mount (rare), re-check when response changes.
  useEffect(() => {
    if (!mapContainer && response) {
      const el = document.querySelector('.map-panel') as HTMLElement | null;
      if (el) setMapContainer(el);
    }
  }, [response, mapContainer]);

  const overlayPortal =
    response && mapContainer
      ? createPortal(
          <DraggableResizableOverlay
            mapContainer={mapContainer}
            response={response}
            overlayClassName="map-overlay-recommendations"
          />,
          mapContainer
        )
      : null;

  return (
    <>
      <div className="agricultural-form">
        <div className="form-header">
          <h2>🌱Farm Details Required</h2>
          <p>Please Input your farm details below.</p>
        </div>

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
                  step="any"
                  required
                />
              </div>
            </div>
            {/* ✅ Use Current Location Button */}
  <button
    type="button"
    className="use-location-btn"
    onClick={getCurrentLocation}
  >
    <br />
    Use Current Location
    <br />
  </button>
</div>
          {/* </div> */}

          {/* Required Parameters */}
          {/* <div className="form-section">
            <h3>🌍 Required Parameters</h3>
            <div className="input-group">
              <div className="input-field">
                <label htmlFor="soilType">Soil Type *</label>
                <select
                  id="soilType"
                  value={formData.soilType}
                  onChange={(e) => handleInputChange('soilType', e.target.value)}
                  required
                >
                  <option value="clay">Clay</option>
                  <option value="sandy">Sandy</option>
                  <option value="loamy">Loamy</option>
                  <option value="silt">Silt</option>
                  <option value="peat">Peat</option>
                </select>
              </div>
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
            </div>
          </div> */}

          {/* Optional Parameters */}
          {/* <div className="form-section">
            <button
              type="button"
              className="toggle-optional"
              onClick={() => setShowOptional(!showOptional)}
            >
              {showOptional ? '▼' : '▶'} Optional Parameters
            </button>

            {showOptional && (
              <div className="optional-params">
                <div className="input-group">
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
                    />
                  </div>
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
                      step="any"
                    />
                  </div> */}
                  {/* <div className="input-field">
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
                  </div> */}
                {/* <div
  className="input-group"
  style={{
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '40px',
  }}
> */}
  {/* Left: Multi Crop */}
  {/* <div className="input-field" style={{ flex: 1 }}>
    <label htmlFor="multiCrop">Multi Crop</label>
    <select
      id="multiCrop"
      value={formData.multiCrop || ''}
      onChange={(e) => handleInputChange('multiCrop', e.target.value)}
      required
      style={{
        width: '180%',
        height: '40px',
        borderRadius: '6px'
      }}
    >
      <option value="">Select</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>
  </div> */}

  {/* Right: Irrigation Available */}
  {/* <div
    className="input-field checkbox-field"
    style={{ flex: 1, display: 'flex', alignItems: 'right', marginTop: '16px' }}
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
            )}
          </div> */}
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
        <option value="clay">Clay</option>
        <option value="sandy">Sandy</option>
        <option value="loamy">Loamy</option>
        <option value="silt">Silt</option>
        <option value="peat">Peat</option>
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
          <option value="">Select</option>
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
              {isSubmitting ? 'Getting Recommendations...' : '🌾 Get Crop Recommendations'}
            </button>
            {error && (
              <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>
                {error}
              </p>
            )}
          </div>
        </form>

       </div>
      {overlayPortal}
    </>
  );
}

// Small helper component: draggable & resizable overlay
function DraggableResizableOverlay({
  mapContainer,
  response,
  overlayClassName,
}: {
  mapContainer: HTMLElement;
  response: string;
  overlayClassName?: string;
}) {
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  // position in pixels from the top-left of the mapContainer
  const [pos, setPos] = React.useState<{ left: number; top: number }>(() => ({ left: 20, top: 20 }));
  const [size, setSize] = React.useState<{ width: number; height: number }>(() => ({ width: 380, height: 320 }));
  const draggingRef = React.useRef(false);
  const dragOffsetRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // initialize to bottom-right corner if possible
  React.useEffect(() => {
    if (!mapContainer || !overlayRef.current) return;
    const containerRect = mapContainer.getBoundingClientRect();
    const initWidth = size.width;
    const initHeight = size.height;
    const left = Math.max(12, containerRect.width - initWidth - 20);
    const top = Math.max(12, containerRect.height - initHeight - 20);
    setPos({ left, top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer]);

  React.useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      e.preventDefault();
      const mapRect = mapContainer.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const left = clientX - mapRect.left - dragOffsetRef.current.x;
      const top = clientY - mapRect.top - dragOffsetRef.current.y;
      // clamp
      const clampedLeft = Math.min(Math.max(6, left), Math.max(6, mapRect.width - (overlayRef.current?.offsetWidth || size.width) - 6));
      const clampedTop = Math.min(Math.max(6, top), Math.max(6, mapRect.height - (overlayRef.current?.offsetHeight || size.height) - 6));
      setPos({ left: clampedLeft, top: clampedTop });
    }

    function onPointerUp() {
      if (draggingRef.current) draggingRef.current = false;
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [mapContainer, size.height, size.width]);

  function startDrag(e: React.PointerEvent) {
    if (!overlayRef.current) return;
    draggingRef.current = true;
    overlayRef.current.setPointerCapture(e.pointerId);
    const mapRect = mapContainer.getBoundingClientRect();
    const offsetX = e.clientX - mapRect.left - pos.left;
    const offsetY = e.clientY - mapRect.top - pos.top;
    dragOffsetRef.current = { x: offsetX, y: offsetY };
  }

  // After resize (CSS resize), update our state to reflect new width/height
  function onResizeEnd() {
    if (!overlayRef.current) return;
    setSize({ width: overlayRef.current.offsetWidth, height: overlayRef.current.offsetHeight });
  }

  return (
    <div
      ref={overlayRef}
      className={overlayClassName}
      role="dialog"
      aria-live="polite"
      style={{ position: 'absolute', left: pos.left, top: pos.top, width: size.width, height: size.height }}
    >
      <div className="overlay-inner" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          className="overlay-header"
          onPointerDown={startDrag}
          style={{ cursor: 'move', userSelect: 'none', flex: '0 0 auto', paddingBottom: 6 }}
        >
          <h3 style={{ margin: 0 }}>🎯 Crop Recommendations</h3>
        </div>

        <div className="recommendation-content" style={{ overflow: 'auto', flex: '1 1 auto' }} onPointerUp={onResizeEnd}>
          <FormattedJsonOrMarkdown text={response} />
        </div>
      </div>
    </div>
  );
}

function FormattedJsonOrMarkdown({ text }: { text: string }) {
  // Try multiple heuristics to recover JSON from the assistant response.
  const tryParse = (candidate: string) => {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      return null;
    }
  };

  // 1) direct parse
  let parsed = tryParse(text);
  if (!parsed) {
    // 2) strip code fences ```json ... ``` or ``` ... ```
    const fenceMatch = text.match(/```(?:json\n)?([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      parsed = tryParse(fenceMatch[1].trim());
    }
  }

  if (!parsed) {
    // 3) extract first {...} block
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      const sub = text.slice(firstOpen, lastClose + 1);
      parsed = tryParse(sub);
    }
  }

  if (!parsed) {
    // 4) Sometimes the assistant returns a JSON string (escaped) inside quotes
    const trimmed = text.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      try {
        const unquoted = JSON.parse(trimmed);
        parsed = tryParse(unquoted);
      } catch (e) {
        // ignore
      }
    }
  }

  if (parsed) {
    return <PrettyJson data={parsed} />;
  }

  // fallback: render markdown/raw text
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
}

function PrettyJson({ data }: { data: any }) {
  // Render top-level sections with nicer layout
  return (
    <div className="json-root">
      {data.location_description && (
        <section className="json-section">
          <h4>Location Overview</h4>
          <p className="json-value">{data.location_description}</p>
        </section>
      )}

      {Array.isArray(data.recommended_crops) && (
        <section className="json-section">
          <h4>Recommended Crops</h4>
          <div className="crop-list">
            {data.recommended_crops.map((c: any, idx: number) => (
              <article key={idx} className="crop-card">
                <div className="crop-card-header">
                  <strong className="crop-name">{c.crop_name}</strong>
                  {c.percentage_area_allocation && (
                    <span className="crop-alloc">{c.percentage_area_allocation}</span>
                  )}
                </div>
                {c.rationale && <p className="crop-rationale">{c.rationale}</p>}
                <div className="kv-grid">
                  {c.intercropping_options && (
                    <div className="kv-row">
                      <div className="kv-key">Intercropping</div>
                      <div className="kv-val">{c.intercropping_options}</div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {data.expected_yield_estimates && (
        <section className="json-section">
          <h4>Expected Yield Estimates</h4>
          <ul className="kv-list">
            {Object.entries(data.expected_yield_estimates).map(([k, v]) => (
              <li key={k}>
                <span className="kv-key">{k.replace(/_/g, ' ')}:</span>{' '}
                <span className="kv-val">{String(v)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.soil_preparation_requirements && (
        <section className="json-section">
          <h4>Soil Preparation</h4>
          <div className="kv-list">
            {Object.entries(data.soil_preparation_requirements).map(([k, v]) => (
              <div key={k} className="kv-row">
                <div className="kv-key">{k.replace(/_/g, ' ')}:</div>
                <div className="kv-val">{String(v)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.water_and_fertilizer_needs && (
        <section className="json-section">
          <h4>Water & Fertilizer</h4>
          <div className="kv-list">
            {Object.entries(data.water_and_fertilizer_needs).map(([k, v]) => (
              <div key={k} className="kv-row">
                <div className="kv-key">{k.replace(/_/g, ' ')}:</div>
                <div className="kv-val">
                  {typeof v === 'object' ? (
                    <div className="sub-kv">
                      {Object.entries(v).map(([kk, vv]) => (
                        <div key={kk} className="kv-row">
                          <div className="kv-key small">{kk}:</div>
                          <div className="kv-val small">{String(vv)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    String(v)
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(data.potential_challenges_and_mitigation_strategies) && (
        <section className="json-section">
          <h4>Potential Challenges & Mitigation</h4>
          <ol className="challenge-list">
            {data.potential_challenges_and_mitigation_strategies.map((c: any, i: number) => (
              <li key={i}>
                <strong>{c.challenge}</strong>
                <div className="kv-val">{c.mitigation}</div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

