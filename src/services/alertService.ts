/**
 * Servicio de alertas
 * Envía alertas al backend
 */

import httpClient from './httpClient';
import { API_CONFIG } from '../config/api';

export type AlertType = 'out_of_zone' | 'low_battery' | 'gps_disabled' | 'app_closed' | 'panic';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRequest {
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  latitude: number;
  longitude: number;
}

export interface AlertResponse {
  id: string;
  created_at: string;
  status: string;
}

class AlertService {
  /**
   * Enviar alerta al backend
   */
  async sendAlert(alert: AlertRequest): Promise<AlertResponse> {
    try {
      const response = await httpClient.post<AlertResponse>(
        API_CONFIG.ENDPOINTS.ALERTS,
        alert,
        API_CONFIG.MAIN_API
      );

      console.log(`✅ Alerta ${alert.alert_type} enviada`);
      return response;
    } catch (error) {
      console.error('Error enviando alerta:', error);
      // Guardar en IndexedDB para reintentar después
      await this.queueAlert(alert);
      throw error;
    }
  }

  /**
   * Alerta de salida de zona
   */
  async alertOutOfZone(latitude: number, longitude: number): Promise<void> {
    await this.sendAlert({
      alert_type: 'out_of_zone',
      severity: 'high',
      message: 'Inspector fuera de su zona asignada',
      latitude,
      longitude,
    });
  }

  /**
   * Alerta de batería baja
   */
  async alertLowBattery(latitude: number, longitude: number): Promise<void> {
    await this.sendAlert({
      alert_type: 'low_battery',
      severity: 'medium',
      message: 'Batería del dispositivo por debajo del 15%',
      latitude,
      longitude,
    });
  }

  /**
   * Alerta de GPS desactivado
   */
  async alertGpsDisabled(latitude: number, longitude: number): Promise<void> {
    await this.sendAlert({
      alert_type: 'gps_disabled',
      severity: 'high',
      message: 'Servicio de GPS desactivado',
      latitude,
      longitude,
    });
  }

  /**
   * Alerta de pánico (botón de emergencia)
   */
  async alertPanic(latitude: number, longitude: number): Promise<void> {
    await this.sendAlert({
      alert_type: 'panic',
      severity: 'critical',
      message: 'Inspector activó botón de pánico',
      latitude,
      longitude,
    });
  }

  /**
   * Alerta de app cerrada
   */
  async alertAppClosed(latitude: number, longitude: number): Promise<void> {
    await this.sendAlert({
      alert_type: 'app_closed',
      severity: 'medium',
      message: 'Aplicación fue cerrada',
      latitude,
      longitude,
    });
  }

  /**
   * Guardar alerta en cola para reintentar
   */
  private async queueAlert(alert: AlertRequest): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const tx = db.transaction(['alert_queue'], 'readwrite');
      const store = tx.objectStore('alert_queue');
      await store.add({
        ...alert,
        created_at: new Date().toISOString(),
        retries: 0,
      });
    } catch (error) {
      console.warn('Error guardando alerta en cola:', error);
    }
  }

  /**
   * Reintentar alertas pendientes
   */
  async retryPendingAlerts(): Promise<void> {
    try {
      const db = await this.openIndexedDB();
      const tx = db.transaction(['alert_queue'], 'readonly');
      const store = tx.objectStore('alert_queue');
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = async () => {
          const pendingAlerts = request.result;
          for (const alertRecord of pendingAlerts) {
            try {
              await this.sendAlert(alertRecord);
              // Eliminar de la cola
              const txDel = db.transaction(['alert_queue'], 'readwrite');
              await txDel.objectStore('alert_queue').delete(alertRecord.id);
            } catch (error) {
              console.warn('Error reintentando alerta:', error);
            }
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Error reintentando alertas pendientes:', error);
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
        if (!db.objectStoreNames.contains('alert_queue')) {
          db.createObjectStore('alert_queue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }
}

export default new AlertService();
