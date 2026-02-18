/**
 * Servicio de tracking GPS
 * Envía ubicación a servicio externo
 */

import httpClient from './httpClient';
import { API_CONFIG } from '../config/api';
import inspectorService from './inspectorService';

export interface GPSPosition {
  id: string; // inspector_id
  name: string; // solo nombres del inspector
  last_name: string; // apellidos del inspector
  descripcion: string | null; // Descripción del inspector (campo futuro del backend, null si no existe)
  id_zone: string;
  name_zone: string;
  inspector_type: string; // 'punto_fijo', 'motorizado', 'bicicleta', 'operaciones', 'supervisor', 'general'
  assignment_id: string | null; // ID de la asignación actual (puede ser null)
  batery: string; // porcentaje 0-100
  velocidad: string; // en km/h
  is_out_zone: boolean;
  is_logout: boolean; // true cuando se envía antes de logout, false en envíos normales
  schedule_id: string; // ID del turno/horario
  schedule_name: string; // Nombre del turno/horario
  type_os: string; // 'windows', 'ios', 'android', 'macos', 'linux', 'unknown'
  latitude: number;
  longitude: number;
  timestamp: string; // ISO-8601
}

class GPSService {
  private trackingInterval: number | null = null;
  private lastPosition: GPSPosition | null = null;

  /**
   * Detectar sistema operativo del dispositivo
   */
  private detectOS(): string {
    const userAgent = navigator.userAgent;
    const platform = (navigator.platform || '').toLowerCase();

    console.log('🔍 Detectando OS - UserAgent:', userAgent);
    console.log('🔍 Detectando OS - Platform:', platform);

    // Detectar iOS (iPhone, iPad, iPod) - PRIMERO para dispositivos móviles
    // Incluir detección moderna para iPad en iOS 13+
    if (/iPad|iPhone|iPod/.test(userAgent) || 
        (platform === 'macintel' && navigator.maxTouchPoints > 1)) {
      console.log('✅ OS detectado: ios');
      return 'ios';
    }

    // Detectar Android
    if (/Android/.test(userAgent)) {
      console.log('✅ OS detectado: android');
      return 'android';
    }

    // Detectar Windows
    if (/win/.test(platform) || /Windows/.test(userAgent)) {
      console.log('✅ OS detectado: windows');
      return 'windows';
    }

    // Detectar macOS (escritorio)
    if (/mac/.test(platform) && navigator.maxTouchPoints <= 1) {
      console.log('✅ OS detectado: macos');
      return 'macos';
    }

    // Detectar Linux
    if (/linux/.test(platform) || /Linux/.test(userAgent)) {
      console.log('✅ OS detectado: linux');
      return 'linux';
    }

    console.log('⚠️ OS no detectado, usando: unknown');
    return 'unknown';
  }

  /**
   * Obtener nivel de batería del dispositivo
   * Nota: Safari/iOS no soporta Battery API por privacidad
   */
  private async getBatteryLevel(): Promise<string> {
    try {
      // Battery API no disponible en Safari/iOS
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        const level = Math.round(battery.level * 100);
        console.log('🔋 Nivel de batería detectado:', level + '%');
        return level.toString();
      } else {
        console.warn('🔋 Battery API no disponible (Safari/iOS)');
      }
    } catch (error) {
      console.warn('🔋 Error obteniendo batería:', error);
    }
    
    // Valor por defecto cuando no está disponible
    console.log('🔋 Usando valor por defecto: 100%');
    return '100';
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
    assignmentDetails: any, // AssignmentDetails (opcional)
    isLogout: boolean = false // true cuando se envía antes de logout
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
        last_name: inspector.last_name || 'Sin apellido',
        descripcion: inspector.descripcion || null, // Campo futuro del backend, null si no existe
        id_zone: assignmentDetails?.zone?.id || 'sin-asignacion',
        name_zone: assignmentDetails?.zone?.name || 'Sin asignación',
        inspector_type: inspector.type || 'punto_fijo', // Enviar tal cual viene del backend
        assignment_id: assignmentDetails?.assignment?.id || null,
        batery: await this.getBatteryLevel(),
        velocidad: this.calculateSpeed(),
        is_out_zone: isOutZone,
        is_logout: isLogout,
        schedule_id: assignmentDetails?.schedule?.id || null,
        schedule_name: assignmentDetails?.schedule?.name || null,
        type_os: this.detectOS(),
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
