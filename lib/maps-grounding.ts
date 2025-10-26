/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { useMapStore } from '@/lib/state';

// TODO - replace with appropriate key
// const API_KEY = process.env.GEMINI_API_KEY
const API_KEY = process.env.API_KEY as string;

// Agricultural parameters interface
export interface AgriculturalParameters {
  // Required parameters (5)
  latitude: number;
  longitude: number;
  soilType: 'clay' | 'sandy' | 'loamy' | 'silt' | 'peat';
  climate: 'tropical' | 'arid' | 'temperate' | 'continental' | 'polar';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  
  // Optional parameters (5)
  rainfall?: number; // Annual rainfall in mm
  temperature?: number; // Average temperature in °C
  irrigationAvailable?: boolean;
  farmSize?: number; // Farm size in hectares
  multiCrop?: string;
}
// import { AGRICULTURAL_AGENT_PROMPT } from './constants';
// const AGRICULTURAL_SYS_INSTRUCTIONS = AGRICULTURAL_AGENT_PROMPT
const AGRICULTURAL_SYS_INSTRUCTIONS = `You are an expert agricultural advisor AI. Based on the provided location coordinates and agricultural parameters (soil type, climate, season, rainfall, temperature, irrigation, farm size), provide detailed crop recommendations.

CRITICAL: You MUST respond with ONLY valid JSON. Do NOT include any markdown code fences, explanatory text, or any content outside the JSON object.

LOCATION VALIDATION: First check if the location is suitable for agriculture. If the location is ocean, city/urban area, or having tall buildings or desert (without irrigation), mountainous terrain, or otherwise unsuitable for farming, set "is_suitable_for_agriculture" to false and provide a clear reason in "unsuitability_reason".

Your response must be a single JSON object with exactly these fields:
{
  "is_suitable_for_agriculture": boolean,
  "unsuitability_reason": "string - only if is_suitable_for_agriculture is false, explain why (e.g., 'Location is in ocean', 'Urban area', 'Desert without irrigation')",
  "location_description": "string - one line description of the location and its key agricultural conditions",
  "recommended_crops": [
    {
      "crop_name": "string",
      "rationale": "string - why this crop is suitable",
      "intercropping_options": "string - if multiCrop is Yes, suggest intercropping options",
      "area_allocation": "string - percentage if multiCrop is Yes"
    }
  ],
  "expected_yield_estimates": {
    "crop_name": "string - yield estimate"
  },
  "soil_preparation_requirements": {
    "soil_testing_needed": "string - Yes/No with brief explanation",
    "general_preparation": "string - preparation steps"
  },
  "water_and_fertilizer_needs": {
    "irrigation_needed": "string - Yes/No with brief explanation",
    "fertilizer_needs": "string - fertilizer recommendations"
  },
  "potential_challenges_and_mitigation_strategies": [
    {
      "challenge": "string",
      "mitigation": "string"
    }
  ]
}

Rules:
- If multiCrop is "Yes", provide 3 recommended crops with intercropping options and area allocation percentages
- If multiCrop is "No" or not specified, provide only 1 recommended crop
- Keep all values concise and single-line
- Return ONLY the JSON object, nothing else
- Do NOT wrap the JSON in markdown code fences or backticks`;

/**
 * Helper function to automatically zoom the map to a specific location
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 */
function zoomToLocation(latitude: number, longitude: number): void {
  const { setCameraTarget, setPreventAutoFrame } = useMapStore.getState();
  
  // Set camera target for field-level view
  setCameraTarget({
    center: { 
      lat: latitude, 
      lng: longitude, 
      altitude: 750 // 750m altitude for good field detail
    },
    range: 2500, // 2.5km range for field-level view
    tilt: 50, // 50° tilt for better terrain view
    heading: 0,
    roll: 0,
  });
  
  // Prevent auto-framing to maintain our specific zoom level
  setPreventAutoFrame(true);
}

/**
* Calls the Gemini API with the googleSearch tool to get a grounded response.
* @param prompt The user's text prompt.
* @returns An object containing the model's text response and grounding sources.
*/
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
 if (!API_KEY) {
   throw new Error('Missing required environment variable: API_KEY');
 }


 try {
   const ai = new GoogleGenAI({apiKey: API_KEY});


   const request: any = {
     model: 'gemini-2.5-flash',
     contents: prompt,
     config: {
       tools: [{googleMaps: {}}],
       thinkingConfig: {
         thinkingBudget: 0,
       },
       systemInstruction: systemInstruction || AGRICULTURAL_SYS_INSTRUCTIONS,
     },
   };


   if (lat !== undefined && lng !== undefined) {
     request.toolConfig = {
       retrievalConfig: {
         latLng: {
           latitude: lat,
           longitude: lng,
         },
       },
     };
   }


   const response = await ai.models.generateContent(request);
   return (response);
 } catch (error) {
   console.error(`Error calling Google Search grounding: ${error}
   With prompt: ${prompt}`);
   // Re-throw the error to be handled by the caller
   throw error;
 }
}


/**
* Calls the Google AI Platform REST API to get a Maps-grounded response.
* @param options The request parameters.
* @returns A promise that resolves to the API's GenerateContentResponse.
*/
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
 if (!API_KEY) {
   throw new Error('Missing required environment variable: API_KEY');
 }
 const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

const requestBody: any = {
   contents: [
     {
       parts: [
         {
           text: prompt,
         },
       ],
     },
   ],
   system_instruction: {
       parts: [ { text: systemInstruction || AGRICULTURAL_SYS_INSTRUCTIONS } ]
   },
   tools: [
     {
       google_maps: {
        enable_widget: enableWidget
       },
     },
   ],
   generationConfig: {
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
 };


 if (lat !== undefined && lng !== undefined) {
   requestBody.toolConfig = {
     retrievalConfig: {
       latLng: {
         latitude: lat,
         longitude: lng,
       },
     },
   };
 }


 try {
  //  console.log(`endpoint: ${endpoint}\nbody: ${JSON.stringify(requestBody, null, 2)}`)
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
     throw new Error(
       `API request failed with status ${response.status}: ${errorBody}`,
     );
   }


   const data = await response.json();
   return data as GenerateContentResponse;
 } catch (error) {
   console.error(`Error calling Maps grounding REST API: ${error}`);
   throw error;
 }
}

/**
* Calls the Google AI Platform REST API to get agricultural recommendations.
* @param params The agricultural parameters and location data.
* @returns A promise that resolves to the API's GenerateContentResponse.
*/
export async function fetchAgriculturalRecommendations(
 params: AgriculturalParameters
): Promise<GenerateContentResponse> {
 if (!API_KEY) {
   throw new Error('Missing required environment variable: API_KEY');
 }
 const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

 // Construct agricultural prompt with all parameters
const agriculturalPrompt = `Location: ${params.latitude}, ${params.longitude}
Soil Type: ${params.soilType}
Climate: ${params.climate}
Season: ${params.season}
${params.rainfall ? `Annual Rainfall: ${params.rainfall}mm` : ''}
${params.temperature ? `Average Temperature: ${params.temperature}°C` : ''}
${params.irrigationAvailable !== undefined ? `Irrigation Available: ${params.irrigationAvailable ? 'Yes' : 'No'}` : ''}
${params.farmSize ? `Farm Size: ${params.farmSize} hectares` : ''}
${params.multiCrop ? `Multi Crop: ${params.multiCrop}` : ''}

Provide detailed crop recommendations for this agricultural location ONLY IF there is no housing on the given location and is suitable for agriculture. Return ONLY the JSON object (no markdown, no code fences, no explanatory text. Just the raw JSON.) as specified in the system instructions. IF THE LOCATION IS NOT SUITABLE FOR AGRICULTURE, STATE REASON CLEARLY IN THE RESPONSE. CITY AREA, OCEAN, DESERT, MOUNTAINOUS AREAS ARE NOT SUITABLE FOR AGRICULTURE.`;

const requestBody: any = {
   contents: [
     {
       parts: [
         {
           text: agriculturalPrompt,
         },
       ],
     },
   ],
   system_instruction: {
       parts: [ { text: AGRICULTURAL_SYS_INSTRUCTIONS } ]
   },
   tools: [
     {
       google_maps: {
        enable_widget: true
       },
     },
   ],
   generationConfig: {
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
 };


 // Add location context for Maps grounding
requestBody.toolConfig = {
   retrievalConfig: {
     latLng: {
       latitude: params.latitude,
       longitude: params.longitude,
     },
   },
 };


 try {
  //  console.log(`endpoint: ${endpoint}\nbody: ${JSON.stringify(requestBody, null, 2)}`)
   const response = await fetch(endpoint, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-goog-api-key': API_KEY,
     },
     
     body: JSON.stringify(requestBody),
   });

   console.log('Agricultural Recommendations API call req :', requestBody);


   if (!response.ok) {
     const errorBody = await response.text();
     console.error('Error from Generative Language API:', errorBody);
     throw new Error(
       `API request failed with status ${response.status}: ${errorBody}`,
     );
   }
   else{
    console.log('Agricultural Recommendations API call successful.',response);
   }


   const data = await response.json();

   // Automatically zoom to the location after getting the response
   zoomToLocation(params.latitude, params.longitude);
  console.log('Agricultural Recommendations Response:', data); 
   return data as GenerateContentResponse;
 } catch (error) {
   console.error(`Error calling Agricultural Recommendations API: ${error}`);
   throw error;
 }
}