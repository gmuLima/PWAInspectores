# Resumen: Cambio en Registro de Asistencia

## Fecha: 2026-01-23

## Cambio Solicitado

**Antes:** La asistencia se registraba después de un login exitoso.

**Ahora:** La asistencia se registra cuando una asignación programada se activa automáticamente.

## Implementación

### 1. Modificaciones en `assignmentService.ts`

El método `processAutoStatusChanges()` ahora:
- Acepta un callback opcional `onAssignmentActivated`
- Retorna un objeto `{ hasChanges, activatedAssignment }` en lugar de solo un boolean
- Ejecuta el callback cuando se activa automáticamente una asignación

```typescript
async processAutoStatusChanges(
  assignments: AssignmentItem[],
  onAssignmentActivated?: (assignment: AssignmentItem) => Promise<void>
): Promise<{ hasChanges: boolean; activatedAssignment?: AssignmentItem }>
```

### 2. Modificaciones en `App.tsx`

**Agregado:**
- Función `registerAttendanceForActivatedAssignment()` que:
  - Obtiene ubicación GPS actual
  - Obtiene `inspector_id` del cache
  - Usa el `assignment_id` de la asignación activada
  - Llama a `attendanceService.checkIn()`

**Actualizado:**
- `handleLogin()`: Removido el registro de asistencia
- `loadInspectorData()`: Pasa el callback a `processAutoStatusChanges()`
- Polling de asignaciones: Pasa el callback a `processAutoStatusChanges()`
- Todas las referencias a `hasAutoChanges` cambiadas a `result.hasChanges`

### 3. Sin cambios en `attendanceService.ts`

El servicio de asistencia permanece igual, solo cambia cuándo se llama.

## Flujo Actualizado

```
1. Inspector hace login
   ↓
2. Sistema monitorea asignaciones cada 30 segundos
   ↓
3. Detecta asignación programada que debe activarse
   ↓
4. Cambia estado: 'scheduled' → 'active'
   ↓
5. Ejecuta callback: registerAttendanceForActivatedAssignment()
   ↓
6. Obtiene GPS y datos del inspector
   ↓
7. POST /api/apk/attendance/checkin
   ↓
8. Asistencia registrada ✅
```

## Casos de Uso

### Caso 1: Inspector llega a tiempo
```
- Inspector hace login a las 05:50
- Tiene asignación programada para las 06:00
- A las 06:00, el sistema activa la asignación automáticamente
- Se registra asistencia con hora 06:00
```

### Caso 2: Inspector llega tarde
```
- Inspector hace login a las 06:15
- Tenía asignación programada para las 06:00
- Al cargar datos, detecta que debió iniciarse
- Activa la asignación inmediatamente
- Registra asistencia con hora 06:15 (tarde)
```

### Caso 3: Asignación activada manualmente
```
- Inspector activa manualmente una asignación
- NO se registra asistencia automáticamente
- Solo se registra cuando el sistema la activa automáticamente
```

## Ventajas del Nuevo Flujo

1. **Precisión temporal**: La asistencia se registra exactamente cuando inicia la asignación
2. **Vinculación correcta**: Siempre hay un `assignment_id` válido (nunca null)
3. **Control de puntualidad**: Se puede detectar si el inspector llegó tarde
4. **Separación de responsabilidades**: Login y asistencia son procesos independientes

## Archivos Modificados

- ✅ `src/services/assignmentService.ts`
- ✅ `src/App.tsx`
- ✅ `FLUJO_ASISTENCIA.md`
- ✅ `CAMBIOS_API_DATOS.md`

## Archivos Sin Cambios

- `src/services/attendanceService.ts` (sin cambios)
- `src/config/api.ts` (sin cambios)

## Testing

Para probar el nuevo flujo:

1. Hacer login con un inspector que tenga una asignación programada
2. Esperar a que llegue la hora de inicio de la asignación
3. Verificar en consola:
   ```
   ⏰ Iniciando asignación automáticamente: [Zona]
   📋 Registrando asistencia para asignación activada automáticamente...
   ✅ Asistencia registrada exitosamente para asignación: [Zona]
   ```
4. Verificar que se guardó en localStorage:
   - `attendance_id`
   - `check_in_time`
   - `attendance_date`

## Notas Importantes

- ⚠️ La asistencia ya NO se registra en el login
- ✅ Solo se registra cuando se activa automáticamente una asignación
- ✅ El `assignment_id` siempre tiene un valor válido
- ✅ Si falla el registro, no bloquea la activación de la asignación
