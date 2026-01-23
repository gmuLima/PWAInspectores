# Flujo de Registro de Asistencia

## Descripción General

El sistema registra automáticamente la asistencia del inspector cuando una asignación programada se activa automáticamente.

## Flujo Completo

### 1. Inspector Hace Login

```
Usuario ingresa token → Click en "Ingresar" → Login exitoso
```

**Nota:** Ya NO se registra asistencia en el login.

### 2. Sistema Monitorea Asignaciones

El sistema verifica cada 30 segundos si hay asignaciones programadas que deben activarse:

```typescript
// Cada 30 segundos
const assignments = await assignmentService.getCurrent();

// Verificar si alguna debe activarse automáticamente
const result = await assignmentService.processAutoStatusChanges(
  assignments,
  registerAttendanceForActivatedAssignment // Callback para registrar asistencia
);
```

### 3. Activación Automática de Asignación

Cuando la hora actual >= `schedule.start_time` de una asignación programada:

```typescript
// 1. Cambiar estado de 'scheduled' a 'active'
await assignmentService.updateStatus(assignment.id, 'active');

// 2. Mostrar alerta al inspector
alert(`🎉 Tu asignación en ${assignment.zone.name} ha iniciado automáticamente`);

// 3. Ejecutar callback para registrar asistencia
await registerAttendanceForActivatedAssignment(assignment);
```

### 4. Registro de Asistencia (Automático)

```typescript
// Obtener ubicación GPS actual
const position = await navigator.geolocation.getCurrentPosition(...);
const { latitude, longitude } = position.coords;

// Obtener datos necesarios
const inspector = inspectorService.getFromCache();
const inspectorId = inspector.inspector_id || inspector.id;

// Usar el assignment_id de la asignación que se acaba de activar
const assignmentId = assignment.assignment.id;

// Registrar check-in
await attendanceService.checkIn(inspectorId, latitude, longitude, assignmentId);
```

### 5. Respuesta del API

```json
{
  "success": true,
  "message": "Asistencia registrada exitosamente",
  "data": {
    "id": "91d8c2d5-d153-494e-bd7f-41e7c9a9713a",
    "inspector_id": "bad5876b-7a1d-471e-bca1-cc06f6ca3e22",
    "assignment_id": "3d448ed2-0488-42ea-9320-7e1c0146976d",
    "latitude": -12.0474,
    "longitude": -77.0458,
    "check_in_time": "2026-01-23 10:41:34",
    "check_out_time": null,
    "attendance_date": "2026-01-23",
    "status": "present",
    "is_verified": false,
    "verified_by": null,
    "working_hours": null
  }
}
```

### 6. Datos Guardados en localStorage

```javascript
localStorage.setItem('attendance_id', '91d8c2d5-d153-494e-bd7f-41e7c9a9713a');
localStorage.setItem('check_in_time', '2026-01-23 10:41:34');
localStorage.setItem('attendance_date', '2026-01-23');
```

## Casos Especiales

### Asignación Activada Manualmente

Si una asignación se activa manualmente (no automáticamente), NO se registra asistencia automáticamente. Solo se registra cuando el sistema la activa automáticamente al llegar la hora programada.

### Inspector Inicia Sesión Tarde

Si el inspector hace login después de la hora de inicio de su asignación:

```
1. Login exitoso
2. loadInspectorData() se ejecuta
3. processAutoStatusChanges() detecta que la asignación debió iniciarse
4. Activa la asignación automáticamente
5. Registra la asistencia con la hora actual (tarde)
```

### Sin Ubicación GPS

Si no se puede obtener la ubicación GPS al momento de activarse la asignación:

```
⚠️ Error registrando asistencia (no crítico): GeolocationPositionError
→ La asignación se activa normalmente
→ No se registra asistencia
→ El inspector puede trabajar sin problemas
```

### Error en API de Asistencia

Si el API de asistencia falla:

```
⚠️ Error registrando asistencia (no crítico): HTTP 500
→ La asignación se activa normalmente
→ Se muestra warning en consola
→ El inspector puede trabajar sin problemas
```

## Logout

Al hacer logout, se limpian los datos de asistencia:

```typescript
// En handleLogout()
attendanceService.clearAttendanceData();

// Se eliminan de localStorage:
// - attendance_id
// - check_in_time
// - attendance_date
```

## Verificación de Asistencia

Para verificar si ya se registró asistencia hoy:

```typescript
const hasCheckedIn = attendanceService.hasCheckedInToday();

if (hasCheckedIn) {
  console.log('Ya se registró asistencia hoy');
}
```

## Formato de Fecha/Hora

El servicio formatea automáticamente la fecha y hora:

```typescript
// Entrada: new Date()
// Salida: "2026-01-23 10:41:34"

// Formato: YYYY-MM-DD HH:mm:ss
```

## Logs de Consola

Durante el proceso se muestran los siguientes logs:

**Cuando se activa automáticamente una asignación:**
```
⏰ Iniciando asignación automáticamente: Zona Centro
📋 Registrando asistencia para asignación activada automáticamente...
📋 Registrando asistencia (check-in): { inspector_id: "...", ... }
✅ Asistencia registrada: { success: true, ... }
✅ Asistencia registrada exitosamente para asignación: Zona Centro
```

En caso de error:

```
⚠️ Error registrando asistencia (no crítico): Error message
```

## Endpoint del API

```
POST https://api-back-gmu-lima.duckdns.org/api/apk/attendance/checkin

Headers:
  X-Inspector-Token: <token>
  X-Device-ID: <device_id>
  Content-Type: application/json

Body:
{
  "inspector_id": "bad5876b-7a1d-471e-bca1-cc06f6ca3e22",
  "latitude": -12.0464,
  "longitude": -77.0428,
  "check_in_time": "2026-01-23 10:21:34",
  "assignment_id": "3d448ed2-0488-42ea-9320-7e1c0146976d"
}
```

## Notas Importantes

1. **No se registra en login**: La asistencia ya NO se registra al hacer login, solo cuando se activa automáticamente una asignación
2. **Solo activación automática**: La asistencia se registra únicamente cuando el sistema activa automáticamente una asignación programada
3. **Ubicación requerida**: Se necesita permiso de geolocalización para registrar asistencia
4. **Una vez por asignación**: Se registra asistencia una sola vez cuando la asignación se activa
5. **Limpieza automática**: Los datos se limpian al hacer logout
6. **Assignment siempre presente**: El `assignment_id` siempre tiene un valor (nunca es null) porque se registra cuando se activa la asignación
7. **Monitoreo cada 30 segundos**: El sistema verifica cada 30 segundos si hay asignaciones que deben activarse
