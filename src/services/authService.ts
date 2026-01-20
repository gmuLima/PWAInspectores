/**
 * Servicio de autenticación
 * Maneja login, sesión y device_id
 */

import httpClient from './httpClient';
import { API_CONFIG } from '../config/api';

export interface LoginRequest {
  token: string;
  device_id: string;
}

export interface LoginResponse {
  authenticated: boolean;
  session_id: string;
  expires_at: string | null;
}

class AuthService {
  /**
   * Generar device_id único con UUID v4
   * Se guarda en localStorage para persista incluso si limpian datos
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      // Generar UUID v4 verdaderamente único (funciona Chrome 92+, Firefox 76+)
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
      console.log('✅ Device ID generado:', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Login del inspector
   */
  async login(token: string): Promise<LoginResponse> {
    const deviceId = this.generateDeviceId();

    const response = await httpClient.post<LoginResponse>(
      API_CONFIG.ENDPOINTS.AUTH_LOGIN,
      {
        token,
        device_id: deviceId,
      },
      API_CONFIG.MAIN_API
    );

    // Guardar credenciales en storage
    localStorage.setItem('token', token);
    localStorage.setItem('device_id', deviceId);
    localStorage.setItem('authenticated', 'true');
    localStorage.setItem('login_time', new Date().toISOString());

    console.log('✅ Login exitoso');
    return response;
  }

  /**
   * Validar sesión actual
   */
  async validateSession(): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      const authenticated = localStorage.getItem('authenticated');

      if (!token || authenticated !== 'true') {
        return false;
      }

      // Hacer request a /apk/me para validar
      await httpClient.get('/apk/me', API_CONFIG.MAIN_API);
      return true;
    } catch (error) {
      console.error('❌ Sesión inválida:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('device_id');
    localStorage.removeItem('authenticated');
    localStorage.removeItem('login_time');
    console.log('✅ Logout completado');
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return localStorage.getItem('authenticated') === 'true';
  }

  /**
   * Obtener token actual
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Obtener device_id actual
   */
  getDeviceId(): string {
    return localStorage.getItem('device_id') || this.generateDeviceId();
  }
}

export default new AuthService();
