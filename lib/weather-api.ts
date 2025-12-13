/**
 * Weather API integration using OpenWeatherMap
 * Note: Google doesn't have a dedicated Weather API, so we use OpenWeatherMap
 * which provides free weather data with an API key.
 */

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  uvIndex?: number;
  cloudCover: number;
  description: string;
  icon: string;
  location: string;
  timestamp: string;
}

/**
 * Fetch current weather data for a given latitude and longitude
 * Uses OpenWeatherMap API (free tier available at https://openweathermap.org/api)
 */
export async function fetchWeatherData(
  lat: number,
  lng: number,
  apiKey?: string,
): Promise<WeatherData | null> {
  // Use environment variable or fallback to a demo key (you should replace this with your own)
  const WEATHER_API_KEY = apiKey || process.env.MAPS_API_KEY || 'your_openweathermap_api_key';
  
  // If no API key is set, return mock data for development
  if (!WEATHER_API_KEY || WEATHER_API_KEY === 'your_openweathermap_api_key') {
    console.warn('Weather API key not set. Using mock data. Please set WEATHER_API_KEY environment variable.');
    return getMockWeatherData(lat, lng);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${WEATHER_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Weather API error:', response.status, response.statusText);
      // Fallback to mock data if API fails
      return getMockWeatherData(lat, lng);
    }

    const data = await response.json();
    
    // Also fetch UV index if available (requires separate API call)
    let uvIndex: number | undefined;
    try {
      const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}`;
      const uvResponse = await fetch(uvUrl);
      if (uvResponse.ok) {
        const uvData = await uvResponse.json();
        uvIndex = uvData.value;
      }
    } catch (uvError) {
      // UV index is optional, continue without it
      console.warn('Could not fetch UV index:', uvError);
    }

    const weatherData: WeatherData = {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: Math.round(data.wind?.speed * 3.6 || 0), // Convert m/s to km/h
      windDirection: data.wind?.deg || 0,
      visibility: data.visibility ? Math.round(data.visibility / 1000) : 10, // Convert m to km
      uvIndex,
      cloudCover: data.clouds?.all || 0,
      description: data.weather[0]?.description || 'Unknown',
      icon: data.weather[0]?.icon || '01d',
      location: data.name || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      timestamp: new Date().toISOString(),
    };

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    // Return mock data as fallback
    return getMockWeatherData(lat, lng);
  }
}

/**
 * Generate mock weather data for development/testing
 */
function getMockWeatherData(lat: number, lng: number): WeatherData {
  // Generate semi-realistic mock data based on latitude
  const isTropical = Math.abs(lat) < 23.5;
  const baseTemp = isTropical ? 28 : 20;
  const variation = Math.sin(Date.now() / 1000000) * 5;
  
  return {
    temperature: Math.round(baseTemp + variation),
    feelsLike: Math.round(baseTemp + variation + 2),
    humidity: Math.round(60 + Math.sin(Date.now() / 2000000) * 20),
    pressure: 1013,
    windSpeed: Math.round(10 + Math.random() * 10),
    windDirection: Math.round(Math.random() * 360),
    visibility: 10,
    uvIndex: Math.round(5 + Math.random() * 5),
    cloudCover: Math.round(Math.random() * 50),
    description: 'Partly cloudy',
    icon: '02d',
    location: `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    timestamp: new Date().toISOString(),
  };
}

