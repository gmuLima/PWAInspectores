/**
 * Servicio de datos del inspector
 * Obtiene información del inspector autenticado
 */

import httpClient from './httpClient';
import { API_CONFIG } from '../config/api';

export interface InspectorData {
  id: string;
  name: string;
  last_name: string;
  dni?: string;
  email?: string;
  phone?: string;
  type: string; // 'punto_fijo', 'fiscalizador', 'motorizado', 'bicicleta' (mapeado desde inspector_type)
  zone_id?: string;
  zone_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface InspectorAPIResponse {
  inspector_id: string;
  name: string;
  last_name: string;
  dni?: string;
  inspector_type: string; // Campo real del API
  device_id?: string;
  session_valid?: boolean;
  authenticated_at?: string;
}

class InspectorService {
  /**
   * Obtener datos del inspector actual
   */
  async getMe(): Promise<InspectorData> {
    const response = await httpClient.get<InspectorAPIResponse>(
      API_CONFIG.ENDPOINTS.INSPECTOR_ME,
      API_CONFIG.MAIN_API
    );
    
    console.log('📋 Respuesta completa del /me:', JSON.stringify(response, null, 2));
    console.log('📋 Campo inspector_type:', response.inspector_type);
    
    // Mapear respuesta del API a InspectorData
    const inspectorData: InspectorData = {
      id: response.inspector_id,
      name: response.name,
      last_name: response.last_name,
      dni: response.dni,
      type: response.inspector_type, // Mapear inspector_type a type
      email: undefined,
      phone: undefined,
      zone_id: undefined,
      zone_name: undefined,
      created_at: response.authenticated_at,
      updated_at: response.authenticated_at,
    };
    
    console.log('📋 InspectorData mapeado:', inspectorData);
    
    return inspectorData;
  }

  /**
   * Obtener inspector desde cache local si está disponible
   */
  getFromCache(): InspectorData | null {
    const cached = localStorage.getItem('inspector_cache');
    if (!cached) return null;
    
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  /**
   * Guardar inspector en cache
   */
  private cacheInspector(inspector: InspectorData) {
    localStorage.setItem('inspector_cache', JSON.stringify(inspector));
    localStorage.setItem('inspector_cache_time', new Date().toISOString());
  }

  /**
   * Obtener inspector con fallback a cache
   */
  async getMeWithFallback(): Promise<InspectorData | null> {
    try {
      const inspector = await this.getMe();
      this.cacheInspector(inspector);
      return inspector;
    } catch (error) {
      console.warn('Error obteniendo datos del inspector, usando cache:', error);
      return this.getFromCache();
    }
  }
}

export default new InspectorService();
