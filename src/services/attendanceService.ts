/**
 * Servicio de asistencia
 * Maneja check-in y check-out de inspectores
 */

import httpClient from './httpClient';
import { API_CONFIG } from '../config/api';

export interface CheckInRequest {
  inspector_id: string;
  latitude: number;
  longitude: number;
  check_in_time: string; // Formato: "YYYY-MM-DD HH:mm:ss"
  assignment_id: string | null; // Puede ser null si no hay asignación activa
  schedule_id: string | null; // Puede ser null
}

export interface AttendanceData {
  id: string;
  inspector_id: string;
  assignment_id: string | null;
  latitude: number;
  longitude: number;
  check_in_time: string;
  check_out_time: string | null;
  attendance_date: string; // Formato: "YYYY-MM-DD"
  status: 'present' | 'absent' | 'late';
  is_verified: boolean;
  verified_by: string | null;
  working_hours: number | null;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  data: AttendanceData;
}

class AttendanceService {
  /**
   * Registrar check-in (asistencia de entrada)
   */
  async checkIn(
    inspectorId: string,
    latitude: number,
    longitude: number,
    assignmentId: string | null = null,
    scheduleId: string | null = null
  ): Promise<AttendanceData> {
    try {
      // Formatear fecha y hora actual en formato requerido
      const now = new Date();
      const checkInTime = this.formatDateTime(now);

      const request: CheckInRequest = {
        inspector_id: inspectorId,
        latitude,
        longitude,
        check_in_time: checkInTime,
        assignment_id: assignmentId,
        schedule_id: scheduleId,
      };

      console.log('📋 Registrando asistencia (check-in):', request);

      const response = await httpClient.post<AttendanceData>(
        API_CONFIG.ENDPOINTS.ATTENDANCE_CHECKIN,
        request,
        API_CONFIG.MAIN_API
      );

      console.log('✅ Asistencia registrada:', response);

      // Guardar en localStorage para referencia
      // httpClient.post ya retorna solo data, no el objeto completo
      localStorage.setItem('attendance_id', response.id);
      localStorage.setItem('check_in_time', checkInTime);
      localStorage.setItem('attendance_date', response.attendance_date);

      return response;
    } catch (error) {
      console.error('❌ Error registrando asistencia:', error);
      throw error;
    }
  }

  /**
   * Formatear fecha y hora en formato "YYYY-MM-DD HH:mm:ss"
   */
  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Obtener ID de asistencia actual desde localStorage
   */
  getCurrentAttendanceId(): string | null {
    return localStorage.getItem('attendance_id');
  }

  /**
   * Verificar si ya se registró asistencia hoy
   */
  hasCheckedInToday(): boolean {
    const attendanceDate = localStorage.getItem('attendance_date');
    if (!attendanceDate) return false;

    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    return attendanceDate === today;
  }

  /**
   * Limpiar datos de asistencia (al hacer logout)
   */
  clearAttendanceData() {
    localStorage.removeItem('attendance_id');
    localStorage.removeItem('check_in_time');
    localStorage.removeItem('attendance_date');
    console.log('✅ Datos de asistencia limpiados');
  }
}

export default new AttendanceService();
