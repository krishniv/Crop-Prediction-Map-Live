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
        {currentPage === 'soil-analyzer' && (
          <SoilAnalyzerPage 
            onBack={() => setCurrentPage('map')} 
          />
        )}

      {currentPage === 'map' && (
        <>
          {/* 🌾 AgriConnect Header with Sign In */}
          <header className="agriconnect-header">
            <div className="header-left">
              <h1 className="brand-title">🌾 AgriConnect</h1>
              <p className="brand-subtitle">Smart Crop Recommendations</p>
            </div>
            
            <div className="header-right">
              <button
                className="news-button"
                onClick={() =>
                  window.open(
                    'https://news.google.com/search?q=agriculture+farming+news&hl=en-US',
                    '_blank'
                  )
                }
              >
                🗞️ Farm-o-Buzz
              </button>

              <SoilAnalyzerButton onClick={() => setCurrentPage('soil-analyzer')} />

              {farmer ? (
                <div className="farmer-info">
                  <span className="farmer-icon">👨‍🌾</span>
                  <span className="farmer-name">
                    Welcome,&nbsp;
                    {farmer.charAt(0).toUpperCase() + farmer.slice(1)}
                  </span>
                  <button className="signout-btn" onClick={handleLogout}>
                    Log Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="signin-button"
                  onClick={() => setShowSignIn(true)}
                >
                  👨‍🌾 Sign In / Sign Up
                </button>
              )}
            </div>
          </header>
        </>
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

      {/* ✅ FULL-WIDTH INTRO MOVED ABOVE THE SPLIT LAYOUT */}
      <section className="agriconnect-hero">
        <div className="agriconnect-hero-content">
          {/* <h1 className="agriconnect-title">AgriConnect</h1>
          <p className="agriconnect-subtitle">Smart Crop Recommendations</p> */}

          <div className="agriconnect-description">
            <h2>About AgriConnect Platform</h2>
            <p>
              AgriConnect uses advanced AI algorithms and environmental data to provide personalized crop
              recommendations for your farm. Our system analyzes your location, soil type, climate
              conditions, and seasonal patterns to suggest the most suitable crops for optimal yield.
              <br /><br />
              {/* Sign in to get started and unlock data-driven insights that will help you make smarter
              farming decisions. */}
            </p>
          </div>

          <div className="agriconnect-feature-cards">
            <div className="feature-card">
              <div className="feature-icon">🌿</div>
              <h3>Smart Analysis</h3>
              <p>Data-driven insights for better farming decisions based on real-time environmental factors.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Maximize Yield</h3>
              <p>Optimize your harvest with tailored recommendations that suit your specific farm conditions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌦️</div>
              <h3>Climate Aware</h3>
              <p>Recommendations based on local weather patterns and seasonal climate variations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ ORIGINAL SPLIT LAYOUT BELOW */}
      <div className="app-layout">
        {currentPage === 'map' && (
          <div className="form-panel">
            <AgriculturalForm />
            {/* <div className="control-panel" ref={consolePanelRef}>
              <ControlTray trayRef={controlTrayRef} />
            </div> */}
          </div>
        )}

        {currentPage === 'map' && (
          <div className="map-panel">
            <Map3D
              ref={element => setMap(element ?? null)}
              onCameraChange={handleCameraChange}
              {...viewProps}
            />
          </div>
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