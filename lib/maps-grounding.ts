/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { useMapStore } from '@/lib/state';
import { AGRICULTURAL_AGENT_PROMPT } from './constants.ts';

// ----------------------
// API Key
// ----------------------
const API_KEY = process.env.API_KEY as string;

const MAP_KEY = process.env.MAPS_API_KEY as string;
// ----------------------
// Interface Definitions
// ----------------------

export interface AgriculturalParameters {
  latitude: number;
  longitude: number;
  soilType: 'clay' | 'sandy' | 'loamy' | 'silt' | 'peat';
  climate: 'tropical' | 'arid' | 'temperate' | 'continental' | 'polar';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  rainfall?: number;
  temperature?: number;
  irrigationAvailable?: boolean;
  farmSize?: number;
  multiCrop?: string;
}

const AGRICULTURAL_SYS_INSTRUCTIONS = AGRICULTURAL_AGENT_PROMPT;

// ----------------------
// Map Zoom Helper
// ----------------------

function zoomToLocation(latitude: number, longitude: number): void {
  const { setCameraTarget, setPreventAutoFrame } = useMapStore.getState();

  setCameraTarget({
    center: { lat: latitude, lng: longitude, altitude: 750 },
    range: 2500,
    tilt: 50,
    heading: 0,
    roll: 0,
  });

  setPreventAutoFrame(true);
}

// ----------------------
// SDK-based Call
// ----------------------

export async function fetchMapsGroundedResponseSDK({
  prompt,
  enableWidget = true,
  lat,
  lng,
  systemInstruction,
}: {
  prompt: string;
  enableWidget?: boolean;
  lat?: number;
  lng?: number;
  systemInstruction?: string;
}): Promise<GenerateContentResponse> {
  if (!API_KEY) throw new Error('Missing required environment variable: API_KEY');

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const request: any = {
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: systemInstruction || AGRICULTURAL_SYS_INSTRUCTIONS,
      },
    };

    if (lat !== undefined && lng !== undefined) {
      request.toolConfig = {
        retrievalConfig: { latLng: { latitude: lat, longitude: lng } },
      };
    }

    const response = await ai.models.generateContent(request);
    return response;
  } catch (error) {
    console.error(`Error calling Google Search grounding: ${error}\nWith prompt: ${prompt}`);
    throw error;
  }
}

// ----------------------
// REST-based Call
// ----------------------

export async function fetchMapsGroundedResponseREST({
  prompt,
  enableWidget = true,
  lat,
  lng,
  systemInstruction,
}: {
  prompt: string;
  enableWidget?: boolean;
  lat?: number;
  lng?: number;
  systemInstruction?: string;
}): Promise<GenerateContentResponse> {
  if (!API_KEY) throw new Error('Missing required environment variable: API_KEY');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  const requestBody: any = {
    contents: [{ parts: [{ text: prompt }] }],
    system_instruction: {
      parts: [{ text: systemInstruction || AGRICULTURAL_SYS_INSTRUCTIONS }],
    },
    tools: [{ google_maps: { enable_widget: enableWidget } }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  };

  if (lat !== undefined && lng !== undefined) {
    requestBody.toolConfig = {
      retrievalConfig: { latLng: { latitude: lat, longitude: lng } },
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error from Generative Language API:', errorBody);
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data as GenerateContentResponse;
  } catch (error) {
    console.error(`Error calling Maps grounding REST API: ${error}`);
    throw error;
  }
}

// ----------------------
// Agricultural API Call
// ----------------------

export async function fetchAgriculturalRecommendations(
  params: AgriculturalParameters,
): Promise<GenerateContentResponse> {
  if (!API_KEY) throw new Error('Missing required environment variable: API_KEY');

  // ------------------------
  // Validate coordinates using Maps API
  // ------------------------
  const invalidMsg = await isInvalidAgriculturalLocation(params.latitude, params.longitude, MAP_KEY);
  if (invalidMsg) {
    return {
      candidates: [
        {
          content: {
            parts: [{ text: invalidMsg }],
          },
        },
      ],
    } as GenerateContentResponse;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  // Build prompt text
  const agriculturalPrompt = `Location: ${params.latitude}, ${params.longitude}
Soil Type: ${params.soilType}
Climate: ${params.climate}
Season: ${params.season}
${params.rainfall ? `Annual Rainfall: ${params.rainfall}mm` : ''}
${params.temperature ? `Average Temperature: ${params.temperature}°C` : ''}
${params.irrigationAvailable !== undefined ? `Irrigation Available: ${params.irrigationAvailable ? 'Yes' : 'No'}` : ''}
${params.farmSize ? `Farm Size: ${params.farmSize} hectares` : ''}
${params.multiCrop ? `Multi Crop: ${params.multiCrop}` : ''}`;

  const requestBody: any = {
    contents: [{ parts: [{ text: agriculturalPrompt }] }],
    system_instruction: { parts: [{ text: AGRICULTURAL_SYS_INSTRUCTIONS }] },
    tools: [{ google_maps: { enable_widget: true } }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
    toolConfig: {
      retrievalConfig: {
        latLng: { latitude: params.latitude, longitude: params.longitude },
      },
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Agricultural Recommendations API call req:', requestBody);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error from Generative Language API:', errorBody);
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    zoomToLocation(params.latitude, params.longitude);
    console.log('Agricultural Recommendations Response:', data);

    return data as GenerateContentResponse;
  } catch (error) {
    console.error(`Error calling Agricultural Recommendations API: ${error}`);
    throw error;
  }
}

// ----------------------
// Validation Helper
// ----------------------

/**
 * Validate if coordinates are in a plausible agricultural region
 * using Google Maps Geocoding + Elevation API.
 */
export async function isInvalidAgriculturalLocation(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string | null> {
  if (lat > 90 || lat < -90 || lng > 180 || lng < -180) {
    return 'Invalid coordinates. Please provide a valid latitude/longitude.';
  }

  try {
    // 1️⃣ Reverse Geocode
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const geoResp = await axios.get(geoUrl);
    const geoData = geoResp.data;
    if (!geoData.results || geoData.results.length === 0) {
      return 'The coordinates appear to be in a remote or non-land area';
    }

    const result = geoData.results[0];
    const types = result.types || [];

    // 2️⃣ Non-agricultural surface check
    if (types.includes('natural_feature') || types.includes('establishment')) {
      return 'The coordinates correspond to a non-agricultural feature or built-up area.';
    }

    // 3️⃣ Country-level exclusion
    const countryComponent = result.address_components.find((c: any) =>
      c.types.includes('country'),
    );
    const country = countryComponent?.long_name;
    const nonAgriculturalCountries = ['Greenland', 'Antarctica'];
    if (country && nonAgriculturalCountries.includes(country)) {
      return `${country} has limited agricultural land. Please verify the coordinates.`;
    }

    // ✅ All checks passed
    return null;
  } catch (error) {
    console.error('Error validating coordinates:', error);
    return 'Unable to verify the coordinates at this time.';
  }
}
