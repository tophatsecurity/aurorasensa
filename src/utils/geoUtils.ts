// Haversine distance in meters between two points
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate new coordinates given a starting point, bearing (degrees), and distance (meters)
export function destinationPoint(lat: number, lng: number, bearingDeg: number, distanceM: number): { lat: number; lng: number } {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const d = distanceM / R;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
  );
  
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return {
    lat: toDeg(lat2),
    lng: toDeg(lng2)
  };
}

// One mile in meters
export const ONE_MILE_METERS = 1609.34;

// Spread overlapping points by a minimum distance
// Returns new coordinates for each point that need to be spread
export interface SpreadablePoint {
  id: string;
  lat: number;
  lng: number;
}

export function spreadOverlappingPoints<T extends SpreadablePoint>(
  points: T[],
  minDistanceMeters: number = ONE_MILE_METERS
): Map<string, { lat: number; lng: number }> {
  const spreadPositions = new Map<string, { lat: number; lng: number }>();
  
  if (points.length < 2) return spreadPositions;
  
  // Group points by approximate location (within minDistance)
  const groups: T[][] = [];
  const assigned = new Set<string>();
  
  points.forEach(point => {
    if (assigned.has(point.id)) return;
    
    const group: T[] = [point];
    assigned.add(point.id);
    
    // Find all other points within minDistance
    points.forEach(other => {
      if (assigned.has(other.id)) return;
      
      const dist = haversineDistance(point.lat, point.lng, other.lat, other.lng);
      if (dist < minDistanceMeters) {
        group.push(other);
        assigned.add(other.id);
      }
    });
    
    if (group.length > 1) {
      groups.push(group);
    }
  });
  
  // Spread each group in a circular pattern around their centroid
  groups.forEach(group => {
    // Calculate centroid
    const centroidLat = group.reduce((sum, p) => sum + p.lat, 0) / group.length;
    const centroidLng = group.reduce((sum, p) => sum + p.lng, 0) / group.length;
    
    // Spread points evenly around the centroid
    const angleStep = 360 / group.length;
    
    group.forEach((point, index) => {
      const bearing = index * angleStep;
      const newPos = destinationPoint(centroidLat, centroidLng, bearing, minDistanceMeters / 2);
      spreadPositions.set(point.id, newPos);
    });
  });
  
  return spreadPositions;
}

// Coverage ranges in meters
export const COVERAGE_RANGES = {
  // WiFi typical indoor/outdoor ranges
  wifi: {
    indoor: 45,      // ~150 feet indoor
    outdoor: 100,    // ~300 feet outdoor with clear LOS
  },
  // Bluetooth ranges
  bluetooth: {
    classic: 10,     // Class 2 Bluetooth (~33 feet)
    ble: 30,         // Bluetooth Low Energy (~100 feet)
  },
  // Starlink dish typical coverage (WiFi from the router)
  starlinkWifi: 100,  // Router WiFi range
} as const;
