import type { LocationData } from '../types';

class GeolocationService {
  private watchId: number | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  // Solicitar permiso explícitamente (importante para iOS)
  async requestPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      console.error('❌ Geolocalización no disponible en este navegador');
      return false;
    }

    console.log('🔐 Solicitando permiso de geolocalización...');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Permiso otorgado. Ubicación:', position.coords.latitude, position.coords.longitude);
          resolve(true);
        },
        (error) => {
          console.error('❌ Permiso denegado o error:', error.code, error.message);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000, // 30 segundos (antes era 10)
          maximumAge: 0,
        }
      );
    });
  }

  startTracking(onLocation: (location: LocationData) => void, onError: (error: string) => void) {
    if (!navigator.geolocation) {
      onError('Geolocalización no disponible en este dispositivo');
      return;
    }

    // Opciones diferentes para iOS vs otros dispositivos
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const options = {
      enableHighAccuracy: true,
      timeout: isIOS ? 30000 : 15000, // Timeout más largo para GPS lento
      maximumAge: isIOS ? 1000 : 0, // iOS puede cachear un poco
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const locationData = {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: Date.now(),
        };
        console.log('📍 Ubicación obtenida:', locationData);
        onLocation(locationData);
        this.emit('locationUpdated', { lat: latitude, lng: longitude });
      },
      (error) => {
        let errorMsg = 'Error de geolocalización desconocido';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = isIOS 
            ? 'Permiso denegado. Ve a Configuración > Privacidad > Ubicación y habilita para esta app.'
            : 'Permiso de geolocalización denegado. Habilita en configuración.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Ubicación no disponible en este momento.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Timeout al obtener la ubicación. Intenta en un lugar abierto.';
        }
        console.error('Error Geolocalización:', errorMsg, error);
        onError(errorMsg);
        this.emit('locationError', errorMsg);
      },
      options
    );
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  isSupported(): boolean {
    return !!navigator.geolocation;
  }
}

export default new GeolocationService();
