/**
 * Configuración centralizada de API
 * Las URLs vienen de variables de entorno (.env)
 */

const MAIN_API = import.meta.env.VITE_MAIN_API || 'https://api-back-gmu-lima.duckdns.org/api';
const GPS_SERVICE = import.meta.env.VITE_GPS_SERVICE || 'https://service-gps-post-position.duckdns.org';

export const API_CONFIG = {
  MAIN_API,
  GPS_SERVICE,
  
  // Endpoints
  ENDPOINTS: {
    // Autenticación
    AUTH_LOGIN: '/apk/auth/login',
    
    // Inspector
    INSPECTOR_ME: '/apk/me',
    
    // Asignaciones
    ASSIGNMENT_CURRENT: '/apk/assignment/current',
    ASSIGNMENT_DETAILS: (id: string) => `/apk/assignment/${id}/details`,
    
    // Alertas
    ALERTS: '/apk/alerts',
    
    // GPS (servicio externo)
    GPS_POSITION: '/api/v1/gps/position',
  },

  // Headers personalizados
  HEADERS: {
    TOKEN: 'X-Inspector-Token',
    DEVICE_ID: 'X-Device-ID',
  },
};
