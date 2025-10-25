/**
 * Utility functions for calculating rectangular farm boundaries
 */

/**
 * Calculate the 4 corner points of a rectangle from center point and farm size
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude  
 * @param farmSizeHectares - Farm size in hectares
 * @returns Object containing the 4 corner points
 */
export function calculateRectangleCorners(
  centerLat: number,
  centerLng: number,
  farmSizeHectares: number
) {
  // Convert hectares to square meters
  const farmSizeSquareMeters = farmSizeHectares * 10000;
  
  // Calculate the side length of a square with this area
  const sideLengthMeters = Math.sqrt(farmSizeSquareMeters);
  
  // Convert meters to degrees (approximate)
  // 1 degree latitude ≈ 111,000 meters
  // 1 degree longitude ≈ 111,000 * cos(latitude) meters
  const latOffset = sideLengthMeters / (2 * 111000);
  const lngOffset = sideLengthMeters / (2 * 111000 * Math.cos(centerLat * Math.PI / 180));
  
  return {
    northEast: {
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      altitude: 0
    },
    northWest: {
      lat: centerLat + latOffset,
      lng: centerLng - lngOffset,
      altitude: 0
    },
    southEast: {
      lat: centerLat - latOffset,
      lng: centerLng + lngOffset,
      altitude: 0
    },
    southWest: {
      lat: centerLat - latOffset,
      lng: centerLng - lngOffset,
      altitude: 0
    }
  };
}

/**
 * Calculate rectangle dimensions from farm size
 * @param farmSizeHectares - Farm size in hectares
 * @returns Object with width and height in meters
 */
export function calculateRectangleDimensions(farmSizeHectares: number) {
  const farmSizeSquareMeters = farmSizeHectares * 10000;
  const sideLengthMeters = Math.sqrt(farmSizeSquareMeters);
  
  return {
    width: sideLengthMeters,
    height: sideLengthMeters
  };
}
