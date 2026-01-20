/**
 * Servicio de tracking GPS
 * Envía ubicación a servicio externo
 */

import httpClient from './httpClient';
import { API_CONFIG } from '../config/api';
import inspectorService from './inspectorService';

export interface GPSPosition {
  id: string; // inspector_id
  name: string; // nombre del inspector
  id_zone: string;
  name_zone: string;
  inspector_type: string; // 'fixed' o 'motorized'
  assignment_id: string | null; // ID de la asignación actual (puede ser null)
  batery: string; // porcentaje 0-100
  velocidad: string; // en km/h
  is_out_zone: boolean;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO-8601
}

class GPSService {
  private trackingInterval: number | null = null;
  private lastPosition: GPSPosition | null = null;

  /**
   * Obtener nivel de batería del dispositivo
   */
  private async getBatteryLevel(): Promise<string> {
    try {
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        return Math.round(battery.level * 100).toString();
      }
    } catch (error) {
      console.warn('Battery API no disponible');
    }
    return '100'; // default
  }

  /**
   * Calcular velocidad basada en posiciones anteriores
   * (simplificado - en producción usar datos del GPS)
   */
  private calculateSpeed(): string {
    // Por ahora retornar 0, en producción calcular from position.speed
    return '0';
  }

  /**
   * Enviar posición GPS al servicio
   */
  async sendPosition(
    latitude: number,
    longitude: number,
    isOutZone: boolean,
    assignmentDetails: any // AssignmentDetails (opcional)
  ): Promise<void> {
    try {
      const inspector = inspectorService.getFromCache();
      if (!inspector) {
        console.error('No se encontró datos del inspector');
        return;
      }

      // Obtener ID correcto (puede ser inspector_id o id)
      const inspectorId = (inspector as any).inspector_id || (inspector as any).id;
      if (!inspectorId) {
        console.error('Inspector no tiene ID válido:', inspector);
        return;
      }

      // Usar datos de asignación si están disponibles, si no usar valores por defecto
      const position: GPSPosition = {
        id: inspectorId,
        name: inspector.name || 'Sin nombre',
        id_zone: assignmentDetails?.zone?.id || 'sin-asignacion',
        name_zone: assignmentDetails?.zone?.name || 'Sin asignación',
        inspector_type: inspector.type || 'punto_fijo', // Enviar tal cual viene del backend
        assignment_id: assignmentDetails?.assignment?.id || null,
        batery: await this.getBatteryLevel(),
        velocidad: this.calculateSpeed(),
        is_out_zone: isOutZone,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      };

      console.log('📡 Enviando posición GPS:', position);

      // Enviar al servicio de GPS
      await httpClient.post<{ success: boolean }>(
        API_CONFIG.ENDPOINTS.GPS_POSITION,
        position,
        API_CONFIG.GPS_SERVICE
      );

      this.lastPosition = position;
      console.log('✅ Posición GPS enviada correctamente');

      // Guardar en IndexedDB para auditoria offline
      await this.savePositionToIndexedDB(position);
    } catch (error) {
      console.error('Error enviando posición GPS:', error);
    }
  }

  /**
   * Iniciar rastreo continuo (cada X segundos)
   */
  startTracking(
    callback: (position: GPSPosition) => void,
    interval: number = 30000 // 30 segundos por defecto
  ) {
    if (!navigator.geolocation) {
      console.error('Geolocalización no disponible');
      return;
    }

    this.trackingInterval = window.setInterval(async () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const gpsPosition: Partial<GPSPosition> = {
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
          };
          callback(gpsPosition as GPSPosition);
        },
        (error) => {
          console.error('Error obteniendo posición:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }, interval);

    console.log('📍 Rastreo GPS iniciado (cada', interval / 1000, 'segundos)');
  }

  /**
   * Detener rastreo
   */
  stopTracking() {
    if (this.trackingInterval !== null) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      console.log('📍 Rastreo GPS detenido');
    }
  }

  /**
   * Obtener última posición conocida
   */
  getLastPosition(): GPSPosition | null {
    return this.lastPosition;
  }

  /**
   * Guardar posición en IndexedDB para auditoría offline
   */
  private async savePositionToIndexedDB(position: GPSPosition): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const tx = db.transaction(['gps_positions'], 'readwrite');
      const store = tx.objectStore('gps_positions');
      await store.add({
        ...position,
        synced: false,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Error guardando en IndexedDB:', error);
    }
  }

  /**
   * Abrir/crear IndexedDB
   */
  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('InspectorApp', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('gps_positions')) {
          db.createObjectStore('gps_positions', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }
}

export default new GPSService();
