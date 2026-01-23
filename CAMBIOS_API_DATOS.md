# Cambios en Estructura de Datos del API

## Fecha: 2026-01-23

## Resumen de Cambios

Se actualizaron las interfaces y servicios para reflejar los nuevos campos que retorna el API, y se agregó el sistema de registro de asistencia.

### 1. API `/me` - Datos del Inspector

**Cambios:**
- El campo `name` ahora contiene solo los **nombres** del inspector
- Se agregó el campo `last_name` para los **apellidos** del inspector

**Archivos modificados:**
- `src/services/inspectorService.ts`:
  - Actualizada interfaz `InspectorData` con campo `last_name`
  - Actualizada interfaz `InspectorAPIResponse` con campo `last_name`
  - Actualizado mapeo en método `getMe()` para incluir `last_name`

- `src/App.tsx`:
  - Actualizado `loadInspectorData()` para mostrar nombre completo: `${name} ${last_name}`

### 2. API GPS - Envío de Ubicación

**Cambios:**
- El campo `name` ahora envía solo los **nombres** del inspector
- Se agregó el campo `last_name` para enviar los **apellidos** del inspector

**Archivos modificados:**
- `src/services/gpsService.ts`:
  - Actualizada interfaz `GPSPosition` con campo `last_name`
  - Actualizado método `sendPosition()` para incluir `inspector.last_name`

### 3. API `/api/apk/assignment/current` - Asignaciones

**Cambios:**
- Se agregó el campo `start_date` en el objeto `assignment`
- Formato: `YYYY-MM-DD` (ejemplo: "2026-01-25")
- Representa la fecha de inicio de la asignación

**Archivos modificados:**
- `src/services/assignmentService.ts`:
  - Actualizada interfaz `Assignment` con campo `start_date: string`

- `src/components/AssignmentsModal.tsx`:
  - Actualizada interfaz local `AssignmentItem` con campo `start_date`
  - Agregada visualización de fecha en asignaciones activas
  - Agregada visualización de fecha en asignaciones programadas
  - Formato de fecha: "23 de enero de 2026" (usando `toLocaleDateString`)

## Estructura de Datos Actualizada

### InspectorData
```typescript
{
  id: string;
  name: string;           // Solo nombres
  last_name: string;      // Apellidos (NUEVO)
  dni?: string;
  type: string;
  // ... otros campos
}
```

### GPSPosition
```typescript
{
  id: string;
  name: string;           // Solo nombres
  last_name: string;      // Apellidos (NUEVO)
  id_zone: string;
  name_zone: string;
  // ... otros campos
}
```

### Assignment
```typescript
{
  id: string;
  status: 'active' | 'scheduled' | 'completed' | 'cancelled';
  start_date: string;     // Fecha de asignación (NUEVO)
}
```

## Visualización en UI

### Pantalla de Asignaciones
- Se muestra la fecha de asignación en formato legible
- Aparece como primer campo en los detalles de cada asignación
- Formato: "📅 Fecha: 23 de enero de 2026"

### Header
- El nombre del inspector ahora muestra: "Nombres Apellidos"
- Se concatenan automáticamente los campos `name` y `last_name`

## Compatibilidad

Todos los cambios son compatibles con el nuevo formato del API. Si el API no envía `last_name`, se usará un valor por defecto vacío para evitar errores.


### 4. API POST `/api/apk/attendance/checkin` - Registro de Asistencia

**Nuevo endpoint agregado:**
- Se llama automáticamente cuando una asignación programada se activa automáticamente
- Registra la asistencia (check-in) del inspector con su ubicación GPS
- **NO se llama durante el login**

**Request:**
```typescript
{
  inspector_id: string;
  latitude: number;
  longitude: number;
  check_in_time: string; // Formato: "YYYY-MM-DD HH:mm:ss"
  assignment_id: string | null; // ID de asignación activa o null
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: string; // ID del registro de asistencia
    inspector_id: string;
    assignment_id: string | null;
    latitude: number;
    longitude: number;
    check_in_time: string;
    check_out_time: string | null;
    attendance_date: string; // "YYYY-MM-DD"
    status: "present" | "absent" | "late";
    is_verified: boolean;
    verified_by: string | null;
    working_hours: number | null;
  }
}
```

**Archivos creados:**
- `src/services/attendanceService.ts`: Nuevo servicio para manejo de asistencia
  - Método `checkIn()`: Registra asistencia con ubicación GPS
  - Método `hasCheckedInToday()`: Verifica si ya se registró asistencia hoy
  - Método `clearAttendanceData()`: Limpia datos al hacer logout
  - Formateo automático de fecha/hora en formato requerido

**Archivos modificados:**
- `src/config/api.ts`:
  - Agregado endpoint `ATTENDANCE_CHECKIN: '/apk/attendance/checkin'`

- `src/services/assignmentService.ts`:
  - Actualizado método `processAutoStatusChanges()` para aceptar callback
  - Retorna objeto con `{ hasChanges, activatedAssignment }` en lugar de solo boolean
  - Ejecuta callback cuando se activa automáticamente una asignación

- `src/App.tsx`:
  - Importado `attendanceService`
  - Creada función `registerAttendanceForActivatedAssignment()` para registrar asistencia
  - Actualizado `loadInspectorData()` para pasar callback a `processAutoStatusChanges()`
  - Actualizado polling de asignaciones para pasar callback a `processAutoStatusChanges()`
  - Actualizado `handleLogout()` para limpiar datos de asistencia
  - **Removido** registro de asistencia del `handleLogin()`

**Flujo de registro:**
1. Sistema monitorea asignaciones cada 30 segundos
2. Detecta que una asignación programada debe activarse (hora actual >= start_time)
3. Cambia estado de 'scheduled' a 'active'
4. Ejecuta callback para registrar asistencia
5. Obtiene ubicación GPS actual
6. Obtiene `inspector_id` del cache
7. Usa `assignment_id` de la asignación que se acaba de activar
8. Llama a `/apk/attendance/checkin` con los datos
9. Guarda el `attendance_id` en localStorage para referencia

**Datos guardados en localStorage:**
- `attendance_id`: ID del registro de asistencia
- `check_in_time`: Hora de entrada
- `attendance_date`: Fecha de asistencia (YYYY-MM-DD)

**Manejo de errores:**
- Si falla el registro de asistencia, se muestra un warning en consola
- La activación de la asignación continúa normalmente (no es un error crítico)
- Si no hay ubicación GPS disponible, se registra el error pero no bloquea

## Compatibilidad

Todos los cambios son compatibles con el nuevo formato del API. Si el API no envía `last_name`, se usará un valor por defecto vacío para evitar errores. El sistema de asistencia es opcional y no bloquea el flujo principal de activación de asignaciones.
