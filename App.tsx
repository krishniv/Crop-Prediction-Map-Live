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
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Map3D, Map3DCameraProps} from './components/map-3d';
import { useMapStore } from './lib/state';
import { MapController } from './lib/map-controller';

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
  const { markers, cameraTarget, setCameraTarget, preventAutoFrame } = useMapStore();
  const mapController = useRef<MapController | null>(null);

  const maps3dLib = useMapsLibrary('maps3d');
  const elevationLib = useMapsLibrary('elevation');

  const consolePanelRef = useRef<HTMLDivElement>(null);
  const controlTrayRef = useRef<HTMLElement>(null);
  const [padding, setPadding] = useState<[number, number, number, number]>([0.05, 0.05, 0.05, 0.05]);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  useEffect(() => {
    if (geocodingLib) {
      setGeocoder(new geocodingLib.Geocoder());
    }
  }, [geocodingLib]);

  useEffect(() => {
    if (map && maps3dLib && elevationLib) {
      mapController.current = new MapController({
        map,
        maps3dLib,
        elevationLib,
      });
    }
    return () => {
      mapController.current = null;
    };
  }, [map, maps3dLib, elevationLib]);

  useEffect(() => {
    const calculatePadding = () => {
      const consoleEl = consolePanelRef.current;
      const trayEl = controlTrayRef.current;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      if (!consoleEl || !trayEl) return;

      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      
      const top = 0.05;
      const right = 0.05;
      let bottom = 0.05;
      let left = 0.05;

      if (!isMobile) {
        left = Math.max(left, (consoleEl.offsetWidth / vw) + 0.02);
      }
      
      setPadding([top, right, bottom, left]);
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
      if (banner) {
        banner.style.display = 'none';
      }
    }
  }, [map]);

  useEffect(() => {
    if (!mapController.current) return;

    const controller = mapController.current;
    controller.clearMap();

    if (markers.length > 0) {
      controller.addMarkers(markers);
    }
    
    const markerPositions = markers.map(m => m.position);
    const allEntities = [...markerPositions].map(p => ({ position: p }));

    if (allEntities.length > 0 && !preventAutoFrame) {
      controller.frameEntities(allEntities, padding);
    }
  }, [markers, padding, preventAutoFrame]);

  useEffect(() => {
    if (cameraTarget && mapController.current) {
      mapController.current.flyTo(cameraTarget);
      setCameraTarget(null);
      useMapStore.getState().setPreventAutoFrame(false);
    }
  }, [cameraTarget, setCameraTarget]);

  const handleCameraChange = useCallback((props: Map3DCameraProps) => {
    setViewProps(oldProps => ({...oldProps, ...props}));
  }, []);

  const handleCloseOverlay = () => setRecommendation(null);

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
      <div
        className="app-layout"
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100vh',
          width: '100vw',
          margin: 0,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body, html, #root, .App {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
          }
          
          @media (max-width: 900px) {
            .app-layout {
              flex-direction: column !important;
            }
            .form-panel {
              width: 100% !important;
              height: 50vh !important;
            }
            .map-panel {
              width: 100% !important;
              height: 50vh !important;
            }
          }
        `}</style>
        
        <div
          className="form-panel"
          style={{
            width: '420px',
            minWidth: '320px',
            maxWidth: '420px',
            background: '#181c1f',
            color: '#e0ffe0',
            padding: 0,
            margin: 0,
            boxSizing: 'border-box',
            overflowY: 'auto',
            overflowX: 'hidden',
            height: '100vh',
            borderRight: '1px solid #2a2a2a',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <AgriculturalForm onSubmit={(_params, responseText) => setRecommendation(responseText)} />

        </div>
        
        <div
          className="map-panel"
          style={{
            flex: 1,
            width: 'calc(100vw - 420px)',
            position: 'relative',
            height: '100vh',
            margin: 0,
            padding: 0,
            background: '#1a1a1a',
            overflow: 'hidden',
          }}
        >
          <Map3D
            ref={element => setMap(element ?? null)}
            onCameraChange={handleCameraChange}
            {...viewProps}
          />
          
          {recommendation && (
            <div
              className="recommendation-overlay"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                maxWidth: '400px',
                width: '90%',
                background: 'rgba(255,255,255,0.98)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                borderRadius: 12,
                zIndex: 1000,
                padding: '20px',
                border: '1px solid #e0e0e0',
              }}
            >
              <button
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#888',
                  fontWeight: 'bold',
                }}
                aria-label="Close recommendations"
                onClick={handleCloseOverlay}
              >&times;</button>
              <h3 style={{margin: '0 0 15px 0', fontSize: '1.3rem', color: '#2e7d32'}}>
                🎯 Crop Recommendations
              </h3>
              <div style={{maxHeight: '60vh', overflowY: 'auto', fontSize: '1rem', lineHeight: 1.6, color: '#333'}}>
                <span style={{whiteSpace: 'pre-line'}}>{recommendation}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </LiveAPIProvider>
  );
}

function App() {
  return (
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
  );
}

export default App;
