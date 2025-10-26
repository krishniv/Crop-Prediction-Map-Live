
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
  const [showReport, setShowReport] = useState(false);
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
  setShowReport(false);

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
            onGenerateReport={() => setShowReport(true)}
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
      {showReport && response && (
        <DetailedReport text={response} />
      )}
    </>
  );
}

// Small helper component: draggable & resizable overlay
function DraggableResizableOverlay({
  mapContainer,
  response,
  overlayClassName,
  onGenerateReport,
}: {
  mapContainer: HTMLElement;
  response: string;
  overlayClassName?: string;
  onGenerateReport?: () => void;
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
          <OverlaySummary text={response} />
        </div>
        <div style={{ flex: '0 0 auto', paddingTop: 8 }}>
          <button className="submit-button" onClick={() => onGenerateReport && onGenerateReport()}>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}

// Extract JSON and render a compact summary for the overlay
function OverlaySummary({ text }: { text: string }) {
  const parsed = parseAssistantJson(text);
  if (!parsed) return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
  
  // Check if location is suitable for agriculture
  if (parsed.is_suitable_for_agriculture === false) {
    return (
      <div style={{ color: '#d32f2f', padding: 8, background: '#ffebee', borderRadius: 6 }}>
        <strong>⚠️ Location Not Suitable for Agriculture</strong>
        <div style={{ marginTop: 8, fontSize: '0.95rem' }}>
          {parsed.unsuitability_reason || 'This location is not suitable for farming.'}
        </div>
      </div>
    );
  }
  
  const loc = parsed.location_description || parsed.location || parsed.locationOverview;
  const crops = parsed.recommended_crops || parsed.top_crops || parsed.recommendedCrops || parsed.cropRecommendations;
  const cropLine = Array.isArray(crops)
    ? crops.map((c: any) => c?.crop_name || c?.name || c?.crop || c?.cropName).filter(Boolean).join(', ')
    : typeof crops === 'string'
      ? crops
      : '';
  return (
    <div>
      {loc && <div><strong>Location:</strong> {loc}</div>}
      {cropLine && <div><strong>Recommended Crops:</strong> {cropLine}</div>}
      {!loc && !cropLine && <div>No structured summary available.</div>}
    </div>
  );
}

function FormattedJsonOrMarkdown({ text }: { text: string }) {
  const parsed = parseAssistantJson(text);
  if (parsed) return <PrettyJson data={parsed} />;
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
}

// Robust JSON extraction from assistant responses
function parseAssistantJson(text: string): any | null {
  if (!text || typeof text !== 'string') return null;

  const safeParse = (s: string): any | null => {
    try {
      return JSON.parse(s);
    } catch {
      try {
        const cleaned = s.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  };

  // 1) direct parse
  let parsed = safeParse(text);
  if (parsed) return parsed;

  // 2) fenced code blocks
  const fenceRegex = /```(?:json\s*\n)?([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(text)) !== null) {
    const candidate = m[1].trim();
    parsed = safeParse(candidate);
    if (parsed) return parsed;
  }

  // 3) balanced braces/brackets
  const findBalanced = (open: string, close: string) => {
    const out: string[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== open) continue;
      let depth = 0;
      for (let j = i; j < text.length; j++) {
        if (text[j] === open) depth++;
        else if (text[j] === close) depth--;
        if (depth === 0) { out.push(text.slice(i, j + 1)); break; }
      }
    }
    return out;
  };
  for (const c of findBalanced('{', '}')) { const v = safeParse(c); if (v) return v; }
  for (const c of findBalanced('[', ']')) { const v = safeParse(c); if (v) return v; }

  // 4) quoted JSON substrings
  const q = /(["'])(\{[\s\S]*\}|\[[\s\S]*\])\1/gm;
  while ((m = q.exec(text)) !== null) {
    const inner = m[2];
    parsed = safeParse(inner);
    if (parsed) return parsed;
  }
  return null;
}

function PrettyJson({ data }: { data: any }) {
  // Render top-level sections with tolerant field names
  const loc = data.location_description || data.location || data.locationOverview;
  const recommended = data.recommended_crops || data.top_crops || data.recommendedCrops || data.cropRecommendations;
  const yields = data.expected_yield_estimates || data.yield_estimates || data.expectedYields;
  const soil = data.soil_preparation_requirements || data.soilPreparation;
  const water = data.water_and_fertilizer_needs || data.waterAndFertilizer;
  const challenges = data.potential_challenges_and_mitigation_strategies || data.challenges;

  return (
    <div className="json-root">
      {loc && (
        <section className="json-section">
          <h4>Location Overview</h4>
          <p className="json-value">{loc}</p>
        </section>
      )}

      {Array.isArray(recommended) && (
        <section className="json-section">
          <h4>Recommended Crops</h4>
          <div className="crop-list">
            {recommended.map((c: any, idx: number) => {
              const name = c.crop_name || c.name || c.crop || c.cropName || `Crop ${idx + 1}`;
              const allocation = c.percentage_area_allocation || c.area_allocation;
              return (
                <article key={idx} className="crop-card">
                  <div className="crop-card-header">
                    <strong className="crop-name">{name}</strong>
                    {allocation && (
                      <span className="crop-alloc">{allocation}</span>
                    )}
                  </div>
                  {c.rationale && <p className="crop-rationale">{c.rationale}</p>}
                  <div className="kv-grid">
                    {(c.intercropping_options || c.intercropping) && (
                      <div className="kv-row">
                        <div className="kv-key">Intercropping</div>
                        <div className="kv-val">{c.intercropping_options || c.intercropping}</div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {yields && (
        <section className="json-section">
          <h4>Expected Yield Estimates</h4>
          {typeof yields === 'string' ? (
            <p className="json-value">{yields}</p>
          ) : Array.isArray(yields) ? (
            <ul className="kv-list">
              {yields.map((item: any, idx: number) => (
                <li key={idx}>
                  <span className="kv-val">{String(item)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="kv-list">
              {Object.entries(yields).map(([k, v]) => (
                <li key={k}>
                  <span className="kv-key">{k.replace(/_/g, ' ')}:</span>{' '}
                  <span className="kv-val">{String(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {soil && (
        <section className="json-section">
          <h4>Soil Preparation</h4>
          {typeof soil === 'string' ? (
            <p className="json-value">{soil}</p>
          ) : Array.isArray(soil) ? (
            <ul className="kv-list">
              {soil.map((item: any, idx: number) => (
                <li key={idx}>
                  {typeof item === 'object' ? (
                    <>
                      {Object.entries(item).map(([k, v]) => (
                        <div key={k} className="kv-row">
                          <div className="kv-key">{k.replace(/_/g, ' ')}:</div>
                          <div className="kv-val">{String(v)}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <span className="kv-val">{String(item)}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="kv-list">
              {Object.entries(soil).map(([k, v]) => (
                <div key={k} className="kv-row">
                  <div className="kv-key">{k.replace(/_/g, ' ')}:</div>
                  <div className="kv-val">{String(v)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {water && (
        <section className="json-section">
          <h4>Water & Fertilizer</h4>
          {typeof water === 'string' ? (
            <p className="json-value">{water}</p>
          ) : Array.isArray(water) ? (
            <ul className="kv-list">
              {water.map((item: any, idx: number) => (
                <li key={idx}><span className="kv-val">{String(item)}</span></li>
              ))}
            </ul>
          ) : (
            <div className="kv-list">
              {Object.entries(water).map(([k, v]) => (
                <div key={k} className="kv-row">
                  <div className="kv-key">{k.replace(/_/g, ' ')}:</div>
                  <div className="kv-val">
                    {v && typeof v === 'object' && !Array.isArray(v) ? (
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
          )}
        </section>
      )}

      {Array.isArray(challenges) && (
        <section className="json-section">
          <h4>Potential Challenges & Mitigation</h4>
          <ol className="challenge-list">
            {challenges.map((c: any, i: number) => (
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

// Detailed report container rendered below the split layout (left panel)
function DetailedReport({ text }: { text: string }) {
  const parsed = parseAssistantJson(text);
  if (!parsed) {
    return (
      <div style={{ background: '#fff', color: '#222', padding: 24, borderRadius: 12, margin: '24px 0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h2 style={{ marginTop: 0 }}>Full Crop Recommendation Report</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</pre>
      </div>
    );
  }
  
  // Check if location is unsuitable
  if (parsed.is_suitable_for_agriculture === false) {
    return (
      <div style={{ background: '#fff', color: '#222', padding: 24, borderRadius: 12, margin: '24px 0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h2 style={{ marginTop: 0, color: '#d32f2f' }}>⚠️ Location Assessment</h2>
        <div style={{ padding: 16, background: '#ffebee', borderRadius: 8, border: '2px solid #ef5350' }}>
          <h3 style={{ marginTop: 0, color: '#c62828' }}>Location Not Suitable for Agriculture</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
            {parsed.unsuitability_reason || 'This location is not suitable for farming. It may be an ocean, urban area, desert, or other non-agricultural terrain.'}
          </p>
          <p style={{ marginTop: 16, fontSize: '0.95rem', color: '#666' }}>
            <strong>Suggestion:</strong> Please check your coordinates and try a different location that has farmland or agricultural areas.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ background: '#fff', color: '#222', padding: 24, borderRadius: 12, margin: '24px 0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <h2 style={{ marginTop: 0 }}>Full Crop Recommendation Report</h2>
      <PrettyJson data={parsed} />
    </div>
  );
}

