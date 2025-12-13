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
import React, {useCallback, useState, useEffect, useRef} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

import ErrorScreen from './components/ErrorScreen';
import Sidebar from './components/Sidebar';
import AgriculturalForm from './components/AgriculturalForm';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Map3D, Map3DCameraProps} from './components/map-3d';
import { useMapStore, useAgriculturalStore } from './lib/state';
import { MapController } from './lib/map-controller';
import { SoilAnalyzerPage } from './components/SoilAnalyzerPage';
import { NewsPage } from './components/NewsPage';
import { FeaturesPage } from './components/FeaturesPage';
import { fetchWeatherData, WeatherData } from './lib/weather-api';

const ApiKeyWarning = ({ currentApiKey }: { currentApiKey: string }) => {
  const [isVisible, setIsVisible] = useState(true);
  const DEFAULT_API_KEY = 'AIzaSyCYTvt7YMcKjSNTnBa42djlndCeDvZHkr0';


  if (currentApiKey !== DEFAULT_API_KEY || !isVisible) {
    return null;
  }


  return (
    <div className="api-key-warning">
      <p>
        <strong>Note:</strong> This demo is using a shared API key with limited quotas. For a stable experience, please use your own Google Maps Platform API key. See the README for instructions.
      </p>
      <button onClick={() => setIsVisible(false)} aria-label="Dismiss API key warning">&times;</button>
    </div>
  );
};



const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
if (typeof GEMINI_API_KEY !== 'string') {
  throw new Error(
    'Missing required environment variable: GEMINI_API_KEY'
  );
}
// Use environment variable for Maps API key, fallback to demo key
const MAPS_API_KEY = process.env.MAPS_API_KEY || 'AIzaSyCYTvt7YMcKjSNTnBa42djlndCeDvZHkr0';
// Clerk publishable key from environment variable
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const INITIAL_VIEW_PROPS = {
  center: {
    lat: 41.8739368,
    lng: -87.6372648,
    altitude: 1000
  },
  range: 3000,
  heading: 0,
  tilt: 30,
  roll: 0
};


// Helper component to format and display recommendations
function FormattedRecommendations({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
    return <PrettyJson data={parsed} isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />;
  }

  // fallback: render markdown/raw text with read more functionality
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const firstParagraph = paragraphs[0] || text;
  const hasMore = paragraphs.length > 1;

  return (
    <div className="markdown-recommendations">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{firstParagraph}</ReactMarkdown>
      {hasMore && !isExpanded && (
        <button 
          className="read-more-btn" 
          onClick={() => setIsExpanded(true)}
          type="button"
        >
          <span>Read More</span>
          <span className="material-symbols-outlined">expand_more</span>
        </button>
      )}
      {hasMore && isExpanded && (
        <>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{paragraphs.slice(1).join('\n\n')}</ReactMarkdown>
          <button 
            className="read-more-btn" 
            onClick={() => setIsExpanded(false)}
            type="button"
          >
            <span>Read Less</span>
            <span className="material-symbols-outlined">expand_less</span>
          </button>
        </>
      )}
    </div>
  );
}

function PrettyJson({ data, isExpanded, onToggle }: { data: any; isExpanded?: boolean; onToggle?: () => void }) {
  // Extract first paragraph/section for preview
  // Priority: location_description > first recommended crop > first available section
  const firstSection = data.location_description ? (
    <section className="json-section">
      <h4>Location Overview</h4>
      <p className="json-value">{data.location_description}</p>
    </section>
  ) : (Array.isArray(data.recommended_crops) && data.recommended_crops.length > 0) ? (
    <section className="json-section">
      <h4>Recommended Crops</h4>
      <div className="crop-list">
        <article className="crop-card">
          <div className="crop-card-header">
            <strong className="crop-name">{data.recommended_crops[0].crop_name}</strong>
            {data.recommended_crops[0].percentage_area_allocation && (
              <span className="crop-alloc">{data.recommended_crops[0].percentage_area_allocation}</span>
            )}
          </div>
          {data.recommended_crops[0].rationale && <p className="crop-rationale">{data.recommended_crops[0].rationale}</p>}
        </article>
      </div>
    </section>
  ) : null;

  const hasMoreContent = !!(data.recommended_crops?.length > 1 || 
    data.expected_yield_estimates || 
    data.soil_preparation_requirements || 
    data.water_and_fertilizer_needs || 
    data.potential_challenges_and_mitigation_strategies?.length ||
    (data.location_description && (data.recommended_crops?.length || 
      data.expected_yield_estimates || 
      data.soil_preparation_requirements || 
      data.water_and_fertilizer_needs || 
      data.potential_challenges_and_mitigation_strategies?.length)));

  return (
    <div className="json-root">
      {firstSection}
      
      {isExpanded && (
        <>

          {Array.isArray(data.recommended_crops) && data.recommended_crops.length > 0 && (
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
        </>
      )}
      
      {hasMoreContent && (
        <button 
          className="read-more-btn" 
          onClick={onToggle}
          type="button"
        >
          {isExpanded ? (
            <>
              <span>Read Less</span>
              <span className="material-symbols-outlined">expand_less</span>
            </>
          ) : (
            <>
              <span>Read More</span>
              <span className="material-symbols-outlined">expand_more</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

function AppComponent() {
  const [map, setMap] = useState<google.maps.maps3d.Map3DElement | null>(null);
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [viewProps, setViewProps] = useState(INITIAL_VIEW_PROPS);
  const { markers, rectangularOverlays, cameraTarget, setCameraTarget, preventAutoFrame } = useMapStore();
  const { recommendations } = useAgriculturalStore();
  const mapController = useRef<MapController | null>(null);
  const maps3dLib = useMapsLibrary('maps3d');
  const elevationLib = useMapsLibrary('elevation');
  const consolePanelRef = useRef<HTMLDivElement>(null);
  const controlTrayRef = useRef<HTMLElement>(null);
  const [padding, setPadding] = useState<[number, number, number, number]>([0.05, 0.05, 0.05, 0.05]);
  /** ---------------- Login state ---------------- **/
  const [showSignIn, setShowSignIn] = useState(false);
  const [farmer, setFarmer] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'map' | 'soil-analyzer' | 'news' | 'features'>('map');
  /** ---------------- Weather data state ---------------- **/
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  /** ---------------- Panel resize state ---------------- **/
  const [leftPanelWidth, setLeftPanelWidth] = useState(384);
  const [rightPanelWidth, setRightPanelWidth] = useState(384);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const name = email.split("@")[0];
      setFarmer(name);
      setShowSignIn(false);
    };
  
  const handleLogout = () => setFarmer(null);
  
  /** persist login **/
  useEffect(() => {
      const saved = localStorage.getItem("farmer");
      if (saved) setFarmer(saved);
  }, []);
    useEffect(() => {
      if (farmer) localStorage.setItem("farmer", farmer);
      else localStorage.removeItem("farmer");
    }, [farmer]);
  
  /** ---------------- Map logic ---------------- **/
  useEffect(() => {
    if (geocodingLib) setGeocoder(new geocodingLib.Geocoder());
  }, [geocodingLib]);

  useEffect(() => {
    if (map && maps3dLib && elevationLib) {
      mapController.current = new MapController({ map, maps3dLib, elevationLib });
    }
    return () => {
      mapController.current = null;
    };
  }, [map, maps3dLib, elevationLib]);

  useEffect(() => {
    const calculatePadding = () => {
      const consoleEl = consolePanelRef.current;
      const trayEl = controlTrayRef.current;
      const vw = window.innerWidth;
      if (!consoleEl || !trayEl) return;
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      let left = 0.05;
      if (!isMobile) left = Math.max(left, (consoleEl.offsetWidth / vw) + 0.02);
      setPadding([0.05, 0.05, 0.05, left]);
    };
    const observer = new ResizeObserver(calculatePadding);
    if (consolePanelRef.current) observer.observe(consolePanelRef.current);
    if (controlTrayRef.current) observer.observe(controlTrayRef.current);
    window.addEventListener('resize', calculatePadding);
    const timeoutId = setTimeout(calculatePadding, 100);
    return () => {
      window.removeEventListener('resize', calculatePadding);
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (map) {
      const banner = document.querySelector('.vAygCK-api-load-alpha-banner') as HTMLElement;
      if (banner) banner.style.display = 'none';
    }
  }, [map]);

  useEffect(() => {
    if (!mapController.current) return;
    const controller = mapController.current;
    controller.clearMap();
    if (markers.length > 0) controller.addMarkers(markers);
    if (rectangularOverlays.length > 0) controller.addRectangularOverlays(rectangularOverlays);
    
    // Combine all points from markers and overlays for framing
    const markerPositions = markers.map(m => m.position);
    const overlayPositions = rectangularOverlays.map(o => o.center);
    const overlayCorners = rectangularOverlays.flatMap(o => [
      o.corners.northEast,
      o.corners.northWest,
      o.corners.southEast,
      o.corners.southWest
    ]);
    const allEntities = [...markerPositions, ...overlayPositions, ...overlayCorners].map(p => ({ position: p }));
    
    if (allEntities.length > 0 && !preventAutoFrame) {
      controller.frameEntities(allEntities, padding);
    }
  }, [markers, rectangularOverlays, padding, preventAutoFrame]);

  useEffect(() => {
    if (cameraTarget && mapController.current) {
      mapController.current.flyTo(cameraTarget);
      setCameraTarget(null);
      useMapStore.getState().setPreventAutoFrame(false);
    }
  }, [cameraTarget, setCameraTarget]);

  /** ---------------- Weather data fetching ---------------- **/
  // Fetch weather data when markers or overlays change, or use initial location
  useEffect(() => {
    const fetchWeatherForLocation = async () => {
      // Priority: rectangular overlays > markers > initial location
      let targetLat: number | null = null;
      let targetLng: number | null = null;

      if (rectangularOverlays.length > 0) {
        const overlay = rectangularOverlays[0];
        targetLat = overlay.center.lat;
        targetLng = overlay.center.lng;
      } else if (markers.length > 0) {
        const marker = markers[0];
        targetLat = marker.position.lat;
        targetLng = marker.position.lng;
      } else {
        // Use initial location if no markers/overlays
        targetLat = INITIAL_VIEW_PROPS.center.lat;
        targetLng = INITIAL_VIEW_PROPS.center.lng;
      }

      if (targetLat !== null && targetLng !== null) {
        setIsLoadingWeather(true);
        
        // Fetch weather data
        const weather = await fetchWeatherData(targetLat, targetLng);
        setWeatherData(weather);
        
        // Fetch location name using reverse geocoding
        if (geocoder) {
          try {
            const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
              geocoder.geocode(
                { location: { lat: targetLat!, lng: targetLng! } },
                (results, status) => {
                  if (status === 'OK' && results) {
                    resolve(results);
                  } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                  }
                }
              );
            });
            
            if (results && results.length > 0) {
              // Extract a readable location name
              const result = results[0];
              // Try to get a formatted address or locality
              const locationName = result.formatted_address || 
                                   (result.address_components && result.address_components
                                     .find(comp => comp.types.includes('locality'))?.long_name) ||
                                   (result.address_components && result.address_components
                                     .find(comp => comp.types.includes('administrative_area_level_1'))?.long_name) ||
                                   `${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}`;
              setLocationName(locationName);
            } else {
              setLocationName(`${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}`);
            }
          } catch (error) {
            console.warn('Error fetching location name:', error);
            // Fallback to coordinates or weather data location
            setLocationName(weather?.location || `${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}`);
          }
        } else {
          // If geocoder not available, use weather data location or coordinates
          setLocationName(weather?.location || `${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}`);
        }
        
        setIsLoadingWeather(false);
      }
    };

    fetchWeatherForLocation();
  }, [markers, rectangularOverlays, geocoder]);

  const handleCameraChange = useCallback(
    (props: Map3DCameraProps) => setViewProps(oldProps => ({ ...oldProps, ...props })),
    []
  );

  /** ---------------- Panel resize handlers ---------------- **/
  const handleMouseDownLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const handleMouseDownRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(250, Math.min(600, e.clientX));
        setLeftPanelWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(250, Math.min(600, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingLeft, isResizingRight]);

  /** ---------------- UI ---------------- **/
  return (
    <LiveAPIProvider
      apiKey={GEMINI_API_KEY}
      map={map}
      placesLib={placesLib}
      elevationLib={elevationLib}
      geocoder={geocoder}
      padding={padding}
    >
      <ErrorScreen />
      <Sidebar />
      
      {/* CropYield Pro Header - Always visible */}
      <header className="cropyield-header">
        <div className="header-left">
          <div className="header-logo">
            <svg className="logo-icon" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_6_319)">
                <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor"></path>
              </g>
              <defs>
                <clipPath id="clip0_6_319"><rect fill="white" height="48" width="48"></rect></clipPath>
              </defs>
            </svg>
          </div>
          <div className="header-title-group">
            <h2 
              className="header-title clickable-title"
              onClick={() => setCurrentPage('features')}
              style={{ cursor: 'pointer' }}
            >
              AgriConnect
            </h2>
            <h4 className="header-subtitle">AI powered Crop Recommendations</h4>
          </div>
        </div>
        
        <div className="header-nav">
          <a 
            className={`nav-link ${currentPage === 'map' ? 'active' : ''}`} 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage('map');
            }}
          >
            Dashboard
          </a>
          <a 
            className={`nav-link ${currentPage === 'news' ? 'active' : ''}`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage('news');
            }}
          >
            News
          </a>
          <a 
            className={`nav-link ${currentPage === 'soil-analyzer' ? 'active' : ''}`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage('soil-analyzer');
            }}
          >
            Soil Analyzer
          </a>
        </div>

        <div className="header-right">
          <button className="header-icon-btn">
            <span className="material-symbols-outlined">notifications</span>
            <span className="notification-badge"></span>
          </button>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="header-signin-btn">Sign In</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "user-avatar-clerk"
                }
              }}
            />
          </SignedIn>
        </div>
      </header>

      {currentPage === 'soil-analyzer' && (
        <SoilAnalyzerPage />
      )}

      {currentPage === 'news' && (
        <NewsPage />
      )}

      {currentPage === 'features' && (
        <FeaturesPage onBack={() => setCurrentPage('map')} />
      )}

      {/* 🔐 Modal */}
      {showSignIn && (
        <div className="signin-modal" onClick={() => setShowSignIn(false)}>
          <div
            className="signin-card"
            onClick={e => e.stopPropagation()}
          >
            <h2>👨‍🌾 Farmer Login</h2>
            <form onSubmit={handleLogin}>
              <label>Email</label>
              <input name="email" type="email" placeholder="farmer@email.com" required />
              <label>Password</label>
              <input name="password" type="password" placeholder="Enter password" required />
              <button type="submit" className="login-btn">Sign In</button>
              <p className="register-text">
                New user? <a href="#">Create Account</a>
              </p>
            </form>
            <button className="close-modal" onClick={() => setShowSignIn(false)}>✕</button>
          </div>
        </div>
      )}

     

      {/* 3-Column Layout */}
      <div className="app-layout-three-col">
        {currentPage === 'map' && (
          <>
            {/* Mobile Toggle for Sidebar */}

            {/* Left Sidebar - Input Farm Details */}
            <aside className="left-sidebar" style={{ width: `${leftPanelWidth}px`, maxWidth: 'none' }}>
              <div className="sidebar-header-mobile">
                <label className="sidebar-close" htmlFor="filters-toggle">
                  <span className="material-symbols-outlined">close</span>
                </label>
              </div>
              <h1 className="sidebar-title">Input Farm Details</h1>
              <AgriculturalForm />
            </aside>

            {/* Left Resize Handle */}
            <div 
              className="resize-handle resize-handle-left"
              onMouseDown={handleMouseDownLeft}
            >
              <div className="resize-handle-line"></div>
            </div>

            {/* Center - Map */}
            <main className="map-container">
              <div className="map-panel">
                <Map3D
                  ref={element => setMap(element ?? null)}
                  onCameraChange={handleCameraChange}
                  {...viewProps}
                />
                {/* Map Controls */}
                <div className="map-controls">
                  <button className="map-control-btn">
                    <span className="material-symbols-outlined">add</span>
                  </button>
                  <button className="map-control-btn">
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <button className="map-control-btn">
                    <span className="material-symbols-outlined">layers</span>
                  </button>
                </div>
                {/* Analysis Status Overlay */}
             
              </div>
            </main>

            {/* Right Resize Handle */}
            <div 
              className="resize-handle resize-handle-right"
              onMouseDown={handleMouseDownRight}
            >
              <div className="resize-handle-line"></div>
            </div>

            {/* Right Sidebar - Prediction Summary */}
            <aside className="right-sidebar" style={{ width: `${rightPanelWidth}px`, maxWidth: 'none' }}>
              <div className="prediction-summary">
                <h1 className="summary-title">
                  <span className="material-symbols-outlined">analytics</span>
                  Prediction Summary
                </h1>
                
                <div className="recommendations-section">
                  {recommendations ? (
                    <div className="recommendations-details">
                      <FormattedRecommendations text={recommendations} />
                    </div>
                  ) : (
                    <div className="no-recommendations">
                      <p>No recommendations available. Submit the form to get crop recommendations.</p>
                    </div>
                  )}
                </div>

                <div className="soil-data-section">
                  <div className="soil-data-header">
                    <h2>Weather Data</h2>
                    <button className="view-report-btn">View Full Report</button>
                  </div>
                  
                  {isLoadingWeather ? (
                    <div className="weather-loading">
                      <p>Loading weather data...</p>
                    </div>
                  ) : weatherData ? (
                    <div className="soil-data-table">
                      <div className="weather-location">
                        <span className="material-symbols-outlined">location_on</span>
                        <span>{locationName || weatherData.location}</span>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Temperature</td>
                            <td>{weatherData.temperature}°C</td>
                            <td>
                              <span className={`status-badge ${
                                weatherData.temperature >= 20 && weatherData.temperature <= 30 
                                  ? 'optimal' 
                                  : weatherData.temperature < 10 || weatherData.temperature > 35 
                                  ? 'low' 
                                  : 'good'
                              }`}>
                                {weatherData.temperature >= 20 && weatherData.temperature <= 30 
                                  ? 'OPTIMAL' 
                                  : weatherData.temperature < 10 || weatherData.temperature > 35 
                                  ? 'EXTREME' 
                                  : 'GOOD'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Feels Like</td>
                            <td>{weatherData.feelsLike}°C</td>
                            <td><span className="status-badge neutral">-</span></td>
                          </tr>
                          <tr>
                            <td>Humidity</td>
                            <td>{weatherData.humidity}%</td>
                            <td>
                              <span className={`status-badge ${
                                weatherData.humidity >= 40 && weatherData.humidity <= 70 
                                  ? 'optimal' 
                                  : weatherData.humidity < 30 || weatherData.humidity > 80 
                                  ? 'low' 
                                  : 'good'
                              }`}>
                                {weatherData.humidity >= 40 && weatherData.humidity <= 70 
                                  ? 'OPTIMAL' 
                                  : weatherData.humidity < 30 || weatherData.humidity > 80 
                                  ? 'EXTREME' 
                                  : 'GOOD'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Wind Speed</td>
                            <td>{weatherData.windSpeed} km/h</td>
                            <td>
                              <span className={`status-badge ${
                                weatherData.windSpeed < 30 
                                  ? 'good' 
                                  : weatherData.windSpeed > 60 
                                  ? 'low' 
                                  : 'neutral'
                              }`}>
                                {weatherData.windSpeed < 30 
                                  ? 'NORMAL' 
                                  : weatherData.windSpeed > 60 
                                  ? 'HIGH' 
                                  : 'MODERATE'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Pressure</td>
                            <td>{weatherData.pressure} hPa</td>
                            <td>
                              <span className={`status-badge ${
                                weatherData.pressure >= 1010 && weatherData.pressure <= 1020 
                                  ? 'optimal' 
                                  : 'neutral'
                              }`}>
                                {weatherData.pressure >= 1010 && weatherData.pressure <= 1020 
                                  ? 'NORMAL' 
                                  : 'CHECK'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Visibility</td>
                            <td>{weatherData.visibility} km</td>
                            <td>
                              <span className={`status-badge ${
                                weatherData.visibility >= 10 
                                  ? 'good' 
                                  : weatherData.visibility < 5 
                                  ? 'low' 
                                  : 'neutral'
                              }`}>
                                {weatherData.visibility >= 10 
                                  ? 'CLEAR' 
                                  : weatherData.visibility < 5 
                                  ? 'POOR' 
                                  : 'MODERATE'}
                              </span>
                            </td>
                          </tr>
                          {weatherData.uvIndex !== undefined && (
                            <tr>
                              <td>UV Index</td>
                              <td>{weatherData.uvIndex}</td>
                              <td>
                                <span className={`status-badge ${
                                  weatherData.uvIndex <= 5 
                                    ? 'good' 
                                    : weatherData.uvIndex > 8 
                                    ? 'low' 
                                    : 'neutral'
                                }`}>
                                  {weatherData.uvIndex <= 5 
                                    ? 'SAFE' 
                                    : weatherData.uvIndex > 8 
                                    ? 'HIGH' 
                                    : 'MODERATE'}
                                </span>
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td>Cloud Cover</td>
                            <td>{weatherData.cloudCover}%</td>
                            <td>
                              <span className={`status-badge ${
                                weatherData.cloudCover < 30 
                                  ? 'good' 
                                  : weatherData.cloudCover > 70 
                                  ? 'neutral' 
                                  : 'optimal'
                              }`}>
                                {weatherData.cloudCover < 30 
                                  ? 'CLEAR' 
                                  : weatherData.cloudCover > 70 
                                  ? 'CLOUDY' 
                                  : 'PARTLY CLOUDY'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Condition</td>
                            <td>{weatherData.description}</td>
                            <td><span className="status-badge neutral">-</span></td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="weather-timestamp">
                        <small>Last updated: {new Date(weatherData.timestamp).toLocaleString()}</small>
                      </div>
                    </div>
                  ) : (
                    <div className="no-weather-data">
                      <p>No weather data available. Please select a location.</p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </LiveAPIProvider>
  );
}


/**
 * Main application component that provides a streaming interface for Live API.
 * Manages video streaming state and provides controls for webcam/screen capture.
 */
function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <div className="App">
        <ApiKeyWarning currentApiKey={MAPS_API_KEY} />
        <APIProvider
          version={'alpha'}
          apiKey={MAPS_API_KEY}
          solutionChannel={"gmp_aistudio_itineraryapplet_v1.0.0"}
        >
          <AppComponent />
        </APIProvider>
      </div>
    </ClerkProvider>
  );
}


export default App;