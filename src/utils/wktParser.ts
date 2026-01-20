/**
 * Utilidades para parsing de WKT POLYGON y validación de coordenadas
 */

/**
 * Representa un punto en coordenadas geográficas
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Representa un polígono con coordenadas
 */
export interface Polygon {
  coordinates: GeoPoint[];
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

/**
 * Parsea una cadena WKT POLYGON a un objeto Polygon
 * Ej: POLYGON ((10.1 20.2, 10.3 20.4, 10.5 20.2, 10.1 20.2))
 */
export function parseWKTPolygon(wktString: string): Polygon {
  try {
    console.log('🔍 Parseando WKT:', wktString);
    
    // Remover "POLYGON" y todos los paréntesis externos
    let cleaned = wktString.trim();
    
    // Remover "POLYGON" (con o sin espacio después)
    cleaned = cleaned.replace(/^POLYGON\s*\(/i, '');
    
    // Remover paréntesis de cierre al final
    cleaned = cleaned.replace(/\)$/, '');
    
    // Si aún tiene paréntesis al inicio y final (formato doble), removerlos
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }

    console.log('🔍 WKT limpio:', cleaned);

    // Parsear coordenadas
    const coordPairs = cleaned.split(',').map((pair) => {
      const [lng, lat] = pair.trim().split(/\s+/);
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      // Validar que sean números válidos
      if (isNaN(latitude) || isNaN(longitude)) {
        console.error('❌ Coordenada inválida:', { lng, lat, pair });
        throw new Error(`Coordenada inválida: lng=${lng}, lat=${lat}`);
      }
      
      return {
        latitude,
        longitude,
      };
    });

    console.log('✅ Coordenadas parseadas:', coordPairs.length);

    // Calcular bounding box
    const lats = coordPairs.map((p) => p.latitude);
    const lngs = coordPairs.map((p) => p.longitude);
    const bounds = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };

    return {
      coordinates: coordPairs,
      bounds,
    };
  } catch (error) {
    console.error('❌ Error parseando WKT POLYGON:', error, wktString);
    throw new Error(`Invalid WKT POLYGON: ${wktString}`);
  }
}

/**
 * Validar si un punto está dentro de un polígono usando el algoritmo Ray Casting
 * https://en.wikipedia.org/wiki/Point_in_polygon
 */
export function isPointInsidePolygon(point: GeoPoint, polygon: Polygon): boolean {
  const { latitude: x, longitude: y } = point;
  const vertices = polygon.coordinates;

  // Quick check usando bounding box
  if (polygon.bounds) {
    if (x < polygon.bounds.minLat || x > polygon.bounds.maxLat || y < polygon.bounds.minLng || y > polygon.bounds.maxLng) {
      return false;
    }
  }

  // Ray casting algorithm
  let inside = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].latitude;
    const yi = vertices[i].longitude;
    const xj = vertices[j].latitude;
    const yj = vertices[j].longitude;

    // Verificar si el rayo cruza la línea del vértice
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calcular la distancia entre dos puntos en kilómetros (Haversine formula)
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const dLng = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.latitude * Math.PI) / 180) *
      Math.cos((point2.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Obtener el punto más cercano del polígono a un punto dado
 */
export function getClosestPointOnPolygon(point: GeoPoint, polygon: Polygon): GeoPoint {
  let closest = polygon.coordinates[0];
  let minDistance = calculateDistance(point, closest);

  for (let i = 1; i < polygon.coordinates.length; i++) {
    const distance = calculateDistance(point, polygon.coordinates[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closest = polygon.coordinates[i];
    }
  }

  return closest;
}

/**
 * Calcular la distancia desde un punto al polígono más cercano
 * Retorna distancia negativa si está dentro, positiva si está fuera
 */
export function getDistanceToPolygon(point: GeoPoint, polygon: Polygon): number {
  const isInside = isPointInsidePolygon(point, polygon);
  const closestPoint = getClosestPointOnPolygon(point, polygon);
  const distance = calculateDistance(point, closestPoint);

  return isInside ? -distance : distance;
}
