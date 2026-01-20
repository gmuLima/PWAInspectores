import { forwardRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Inspector } from '../types';
import type { Polygon as PolygonType } from '../utils/wktParser';
import './MapComponent.css';

interface MapComponentProps {
  inspectors: Inspector[];
  currentLocation: { lat: number; lng: number; accuracy: number; timestamp?: number } | null;
  inspectorName: string;
  zonePolygon?: PolygonType | null;
  isOutOfZone?: boolean;
  zoneName?: string; // Nombre de la zona
  isScheduled?: boolean; // Si es una zona programada (no activa)
}

// Iconos personalizados para Leaflet
const createIcon = (color: string, isCurrentUser: boolean = false) => {
  if (isCurrentUser) {
    // Usar imagen personalizada para el usuario actual
    return L.icon({
      iconUrl: '/ic_launcher-playstore.png',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
      className: 'custom-marker current-user',
    });
  }
  
  // Emoji para otros inspectores
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      ">
        👮
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

export const MapComponent = forwardRef<any, MapComponentProps>(
  ({ inspectors, currentLocation, inspectorName, zonePolygon, isOutOfZone, zoneName, isScheduled = false }, ref) => {
    const defaultCenter: [number, number] = currentLocation
      ? [currentLocation.lat, currentLocation.lng]
      : [-12.046374, -77.042793]; // Lima, Perú

    // Convertir coordenadas del polígono a formato Leaflet [lat, lng]
    const polygonCoordinates = zonePolygon
      ? (zonePolygon.coordinates.map((point) => [
          point.latitude,
          point.longitude,
        ]) as [number, number][])
      : [];

    // Color del polígono según estado
    let polygonColor = '#10B981'; // Verde por defecto (activa dentro de zona)
    let polygonLabel = 'Zona Activa';
    
    if (isScheduled) {
      polygonColor = '#3B82F6'; // Azul para programada
      polygonLabel = 'Próxima Zona';
    } else if (isOutOfZone) {
      polygonColor = '#EF4444'; // Rojo si está fuera
      polygonLabel = 'Zona Activa';
    }

    return (
      <div className="map-container">
        <MapContainer
          ref={ref}
          center={defaultCenter as [number, number]}
          zoom={15}
          className="map"
          zoomControl={false}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* Renderizar polígono de zona si existe */}
          {polygonCoordinates.length > 0 && (
            <Polygon
              positions={polygonCoordinates}
              pathOptions={{
                color: polygonColor,
                weight: 3,
                opacity: 0.7,
                fill: true,
                fillColor: polygonColor,
                fillOpacity: isScheduled ? 0.05 : 0.1,
              }}
            >
              <Popup>
                <div className="popup">
                  <strong>📍 {zoneName || polygonLabel}</strong>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    {isScheduled 
                      ? '🔵 Próxima asignación' 
                      : isOutOfZone 
                        ? '🚫 Fuera de zona' 
                        : '✅ Dentro de zona'
                    }
                  </p>
                </div>
              </Popup>
            </Polygon>
          )}

        {/* Marcador de ubicación actual */}
        {currentLocation && (
          <Marker
            position={[currentLocation.lat, currentLocation.lng]}
            icon={createIcon('#3B82F6', true) as any}
          >
            <Popup>
              <div className="popup">
                <strong>{inspectorName}</strong>
                <p style={{ margin: '4px 0', fontSize: '12px' }}>📍 Tu ubicación</p>
                <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                  Lat: {currentLocation.lat.toFixed(6)}<br />
                  Lng: {currentLocation.lng.toFixed(6)}<br />
                  {currentLocation.timestamp && (
                    <>
                      {new Date(currentLocation.timestamp).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}{' '}
                      {new Date(currentLocation.timestamp).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })}
                    </>
                  )}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcadores de otros inspectores */}
        {inspectors.map((inspector) => (
          <Marker
            key={inspector.id}
            position={[inspector.lat, inspector.lng]}
            icon={createIcon('#10B981') as any}
          >
            <Popup>
              <div className="popup">
                <strong>{inspector.name}</strong>
                <p style={{ margin: '4px 0', fontSize: '12px' }}>
                  {inspector.isOnline ? '🟢 En línea' : '🔴 Desconectado'}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
        </MapContainer>
      </div>
    );
  }
);
