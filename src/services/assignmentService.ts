/**
 * Servicio de asignaciones
 * Obtiene asignaciones del inspector
 */

import httpClient from './httpClient';
import { API_CONFIG } from '../config/api';

export interface Zone {
  id: string;
  name: string;
  type: string; // 'poligono' es el tipo general
  geometry?: string; // WKT POLYGON (solo en details)
}

export interface Schedule {
  id: string;
  name: string;
  shift_type: 'morning' | 'afternoon' | 'night';
  total_hours: number;
  start_time: string; // HH:mm format (e.g. "06:00")
  end_time: string;   // HH:mm format (e.g. "14:00")
}

export interface Assignment {
  id: string;
  status: 'active' | 'scheduled' | 'completed' | 'cancelled';
}

export interface AssignmentItem {
  assignment: Assignment;
  inspector: {
    id: string;
    name: string;
  };
  zone: Zone;
  schedule: Schedule;
}

export interface AssignmentDetails {
  assignment: Assignment;
  inspector: {
    id: string;
    name: string;
  };
  zone: Zone & {
    geometry: string; // geometry solo viene en details
  };
  schedule: Schedule;
}

class AssignmentService {
  /**
   * Obtener asignaciones del día actual
   */
  async getCurrent(): Promise<AssignmentItem[]> {
    try {
      console.log('📋 Solicitando asignaciones...');
      const response = await httpClient.get<{ success: boolean; data: AssignmentItem[] }>(
        API_CONFIG.ENDPOINTS.ASSIGNMENT_CURRENT,
        API_CONFIG.MAIN_API
      );
      console.log('📋 Respuesta de asignaciones:', response);
      
      // Verificar si la respuesta tiene el formato esperado
      if (Array.isArray(response)) {
        console.log('📋 Respuesta es array directo:', response.length, 'asignaciones');
        return response;
      }
      
      if (response?.data && Array.isArray(response.data)) {
        console.log('📋 Respuesta tiene .data:', response.data.length, 'asignaciones');
        return response.data;
      }
      
      console.warn('⚠️ Formato de respuesta inesperado:', response);
      return [];
    } catch (error) {
      console.error('❌ Error obteniendo asignaciones:', error);
      return [];
    }
  }

  /**
   * Obtener detalles de una asignación específica
   * Solo funciona si la asignación está activa
   */
  async getDetails(assignmentId: string): Promise<AssignmentDetails> {
    try {
      console.log('📋 Solicitando detalles de asignación:', assignmentId);
      const response = await httpClient.get<{ success: boolean; data: AssignmentDetails }>(
        API_CONFIG.ENDPOINTS.ASSIGNMENT_DETAILS(assignmentId),
        API_CONFIG.MAIN_API
      );
      console.log('📋 Respuesta detalles:', response);
      
      // Verificar formato de respuesta
      if (response?.data) {
        return response.data;
      }
      
      // Si la respuesta es directa
      return response as any;
    } catch (error) {
      console.error('❌ Error obteniendo detalles de asignación:', error);
      throw error;
    }
  }

  /**
   * Obtener asignación activa (la primera con status === 'active')
   */
  async getActiveAssignment(): Promise<AssignmentItem | null> {
    try {
      const assignments = await this.getCurrent();
      return assignments.find((item) => item.assignment.status === 'active') || null;
    } catch (error) {
      console.error('Error obteniendo asignación activa:', error);
      return null;
    }
  }

  /**
   * Obtener detalles de la asignación activa
   */
  async getActiveAssignmentDetails(): Promise<AssignmentDetails | null> {
    try {
      console.log('📋 Buscando asignación activa con detalles...');
      const active = await this.getActiveAssignment();
      if (!active) {
        console.log('📋 No hay asignación activa');
        return null;
      }
      console.log('📋 Asignación activa encontrada:', active.assignment.id);
      return await this.getDetails(active.assignment.id);
    } catch (error) {
      console.error('❌ Error obteniendo detalles de asignación activa:', error);
      return null;
    }
  }

  /**
   * Cachear asignación activa
   */
  cacheActiveAssignment(assignment: AssignmentDetails) {
    localStorage.setItem('active_assignment', JSON.stringify(assignment));
    localStorage.setItem('assignment_cache_time', new Date().toISOString());
  }

  /**
   * Obtener asignación activa desde cache
   */
  getActiveAssignmentFromCache(): AssignmentDetails | null {
    const cached = localStorage.getItem('active_assignment');
    if (!cached) return null;
    
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    localStorage.removeItem('active_assignment');
    localStorage.removeItem('assignment_cache_time');
  }

  /**
   * Cambiar estado de una asignación
   */
  async updateStatus(assignmentId: string, status: 'active' | 'finished'): Promise<boolean> {
    try {
      console.log(`📋 Cambiando estado de asignación ${assignmentId} a ${status}...`);
      const response = await httpClient.patch<{ success: boolean; message?: string }>(
        `/apk/assignment/${assignmentId}/status`,
        { status },
        API_CONFIG.MAIN_API
      );
      
      if (response.success) {
        console.log(`✅ Estado cambiado a ${status} exitosamente`);
        return true;
      } else {
        console.error('❌ Error cambiando estado:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en updateStatus:', error);
      return false;
    }
  }

  /**
   * Verificar si una asignación debe iniciarse automáticamente
   * Retorna true si la hora actual >= start_time
   */
  shouldStartAssignment(assignment: AssignmentItem): boolean {
    if (assignment.assignment.status !== 'scheduled') return false;

    const now = new Date();
    const [hours, minutes] = assignment.schedule.start_time.split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);

    return now >= startTime;
  }

  /**
   * Verificar si una asignación debe finalizarse automáticamente
   * Retorna true si la hora actual >= end_time
   */
  shouldFinishAssignment(assignment: AssignmentItem): boolean {
    if (assignment.assignment.status !== 'active') return false;

    const now = new Date();
    const [hours, minutes] = assignment.schedule.end_time.split(':').map(Number);
    
    const endTime = new Date();
    endTime.setHours(hours, minutes, 0, 0);

    return now >= endTime;
  }

  /**
   * Procesar inicio/fin automático de asignaciones
   * Retorna true si hubo algún cambio
   */
  async processAutoStatusChanges(assignments: AssignmentItem[]): Promise<boolean> {
    let hasChanges = false;

    for (const assignment of assignments) {
      // Verificar si debe iniciarse
      if (this.shouldStartAssignment(assignment)) {
        console.log(`⏰ Iniciando asignación automáticamente: ${assignment.zone.name}`);
        const success = await this.updateStatus(assignment.assignment.id, 'active');
        if (success) {
          hasChanges = true;
          // Mostrar alerta aquí para evitar duplicados
          alert(`🎉 Tu asignación en ${assignment.zone.name} ha iniciado automáticamente`);
        }
      }

      // Verificar si debe finalizarse
      if (this.shouldFinishAssignment(assignment)) {
        console.log(`⏰ Finalizando asignación automáticamente: ${assignment.zone.name}`);
        const success = await this.updateStatus(assignment.assignment.id, 'finished');
        if (success) {
          hasChanges = true;
          // Mostrar alerta aquí para evitar duplicados
          alert(`⏹️ Tu asignación en ${assignment.zone.name} ha finalizado automáticamente`);
        }
      }
    }

    return hasChanges;
  }
}

export default new AssignmentService();
