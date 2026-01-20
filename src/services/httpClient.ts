/**
 * Cliente HTTP centralizado con interceptores
 * Maneja autenticación, errores y headers automáticos
 */

import { API_CONFIG } from '../config/api';

export interface HttpError {
  code: string;
  message: string;
  status: number;
}

export interface HttpResponse<T> {
  success: boolean;
  data?: T;
  error?: HttpError;
}

class HttpClient {
  private sessionInvalidatedCallback: (() => void) | null = null;

  /**
   * Registra callback para cuando la sesión se invalida
   */
  onSessionInvalidated(callback: () => void) {
    this.sessionInvalidatedCallback = callback;
  }

  /**
   * Obtener token y device_id desde storage
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    const deviceId = localStorage.getItem('device_id');

    const headers: Record<string, string> = {};

    if (token) {
      headers[API_CONFIG.HEADERS.TOKEN] = token;
    }
    if (deviceId) {
      headers[API_CONFIG.HEADERS.DEVICE_ID] = deviceId;
    }

    return headers;
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    baseUrl: string = API_CONFIG.MAIN_API,
    options?: RequestInit
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body: any,
    baseUrl: string = API_CONFIG.MAIN_API,
    options?: RequestInit
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body: any,
    baseUrl: string = API_CONFIG.MAIN_API,
    options?: RequestInit
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    baseUrl: string = API_CONFIG.MAIN_API,
    options?: RequestInit
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      method: 'DELETE',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Manejo centralizado de respuestas
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    // Verificar INVALID_TOKEN
    if (data.code === 'INVALID_TOKEN' || response.status === 401) {
      console.error('❌ Token inválido - Sesión invalidada');
      localStorage.removeItem('token');
      localStorage.removeItem('device_id');
      localStorage.removeItem('authenticated');
      
      if (this.sessionInvalidatedCallback) {
        this.sessionInvalidatedCallback();
      }
      throw new Error('Sesión invalidada');
    }

    // Verificar errores
    if (!response.ok || !data.success) {
      const error = new Error(data.message || 'Error en la solicitud');
      (error as any).code = data.code;
      (error as any).status = response.status;
      throw error;
    }

    return data.data as T;
  }
}

export default new HttpClient();
