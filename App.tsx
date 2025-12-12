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

import ControlTray from './components/ControlTray';
import ErrorScreen from './components/ErrorScreen';
import Sidebar from './components/Sidebar';
import AgriculturalForm from './components/AgriculturalForm';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
// FIX: Correctly import APIProvider as a named export.
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Map3D, Map3DCameraProps} from './components/map-3d';
import { useMapStore } from './lib/state';
import { MapController } from './lib/map-controller';

import { SoilAnalyzerButton } from './components/SoilAnalyzerButton';
import { SoilAnalyzerPage } from './components/SoilAnalyzerPage';

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


function AppComponent() {
  const [map, setMap] = useState<google.maps.maps3d.Map3DElement | null>(null);
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [viewProps, setViewProps] = useState(INITIAL_VIEW_PROPS);
  const { markers, rectangularOverlays, cameraTarget, setCameraTarget, preventAutoFrame } = useMapStore();
  const mapController = useRef<MapController | null>(null);
  const maps3dLib = useMapsLibrary('maps3d');
  const elevationLib = useMapsLibrary('elevation');
  const consolePanelRef = useRef<HTMLDivElement>(null);
  const controlTrayRef = useRef<HTMLElement>(null);
  const [padding, setPadding] = useState<[number, number, number, number]>([0.05, 0.05, 0.05, 0.05]);
  /** ---------------- Login state ---------------- **/
  const [showSignIn, setShowSignIn] = useState(false);
  const [farmer, setFarmer] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'map' | 'soil-analyzer'>('map');
  
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

  const handleCameraChange = useCallback(
    (props: Map3DCameraProps) => setViewProps(oldProps => ({ ...oldProps, ...props })),
    []
  );

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
          <h2 className="header-title">CropYield Pro</h2>
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
            className="nav-link" 
            href="/news.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            News
          </a>
          <a 
            className={`nav-link ${currentPage !== 'map' ? 'active' : ''}`}
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
          <div className="user-avatar" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB-rO6cA-OSMD-zVG9BlKQw2WMGotPDu-nf1txIwxxFyN3imDO_gITMJvxHYD4KCmF81lOHbCHtn14bgHheGsYWrf4QNxlwWp1qZEFM8W3ZpAzkyw3QaxweHlgUPiO4PDC1b6alLddRKIZwaVwjGX-JZ5V5ZzbF1VNnscl7T5S6uC-abkkuE0uK7YRcfvBkcBswh0tzsPd8k1k3sgc9Nmt3VHn_26OTojvvO8OBUR3ET_9MH_FaHn8xlgrTXzJZElEIx-bn9Qi56qjb")'}}></div>
        </div>
      </header>

      {currentPage === 'soil-analyzer' && (
        <SoilAnalyzerPage 
          onBack={() => setCurrentPage('map')} 
        />
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
            <input className="sidebar-toggle" type="checkbox" id="filters-toggle" />
            <label className="sidebar-toggle-label" htmlFor="filters-toggle">
              <span className="material-symbols-outlined">menu_open</span>
            </label>
            <label className="sidebar-overlay" htmlFor="filters-toggle"></label>

            {/* Left Sidebar - Input Farm Details */}
            <aside className="left-sidebar">
              <div className="sidebar-header-mobile">
                <h1 className="sidebar-title">Input Farm Details</h1>
                <label className="sidebar-close" htmlFor="filters-toggle">
                  <span className="material-symbols-outlined">close</span>
                </label>
              </div>
              <AgriculturalForm />
            </aside>

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

            {/* Right Sidebar - Prediction Summary */}
            <aside className="right-sidebar">
              <div className="prediction-summary">
                <h1 className="summary-title">
                  <span className="material-symbols-outlined">analytics</span>
                  Prediction Summary
                </h1>
                
                <div className="summary-cards">
                  <div className="summary-card">
                    <p className="card-label">Recommended Crop</p>
                    <p className="card-value">Wheat</p>
                    <div className="card-badge high-yield">High Yield</div>
                  </div>
                  
                  <div className="summary-card">
                    <p className="card-label">Est. Yield</p>
                    <p className="card-value">4.2 <span className="card-unit">tons/ha</span></p>
                    <div className="card-badge positive">+12% vs Avg</div>
                  </div>
                  
                  <div className="summary-card confidence-card">
                    <p className="card-label">Confidence Score</p>
                    <div className="confidence-content">
                      <p className="confidence-value">94%</p>
                      <span className="material-symbols-outlined confidence-icon">verified</span>
                    </div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{width: '94%'}}></div>
                    </div>
                  </div>
                </div>

                <div className="soil-data-section">
                  <div className="soil-data-header">
                    <h2>Regional Soil Data</h2>
                    <button className="view-report-btn">View Full Report</button>
                  </div>
                  
                  <div className="soil-data-table">
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
                          <td>Nitrogen (N)</td>
                          <td>140 mg/kg</td>
                          <td><span className="status-badge optimal">OPTIMAL</span></td>
                        </tr>
                        <tr>
                          <td>Phosphorus (P)</td>
                          <td>22 mg/kg</td>
                          <td><span className="status-badge low">LOW</span></td>
                        </tr>
                        <tr>
                          <td>Potassium (K)</td>
                          <td>180 mg/kg</td>
                          <td><span className="status-badge good">GOOD</span></td>
                        </tr>
                        <tr>
                          <td>pH Level</td>
                          <td>6.5</td>
                          <td><span className="status-badge neutral">NEUTRAL</span></td>
                        </tr>
                        <tr>
                          <td>Moisture</td>
                          <td>28%</td>
                          <td><span className="status-badge adequate">ADEQUATE</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
    <div className="App">
    <ApiKeyWarning currentApiKey={MAPS_API_KEY} />
    <APIProvider
                version={'alpha'}
                apiKey={MAPS_API_KEY}
                solutionChannel={"gmp_aistudio_itineraryapplet_v1.0.0"}>  
      <AppComponent />
    </APIProvider>


    </div>
  );
}


export default App;