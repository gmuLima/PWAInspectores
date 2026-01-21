# Cambios en GPS y Logout

## Resumen
Se agregaron 3 campos nuevos al envío de ubicación GPS y se modificó el flujo de logout para enviar una ubicación final antes de cerrar sesión.

## Cambios Realizados

### 1. Nuevos Campos en GPSPosition (`src/services/gpsService.ts`)

Se agregaron 3 campos nuevos a la interfaz `GPSPosition`:

```typescript
export interface GPSPosition {
  // ... campos existentes ...
  is_logout: boolean;      // true cuando se envía antes de logout, false en envíos normales
  schedule_id: string;     // ID del turno/horario de la asignación
  schedule_name: string;   // Nombre del turno/horario
}
```

**Origen de los datos:**
- `is_logout`: Se pasa como parámetro en `sendPosition()`
- `schedule_id`: Viene de `assignmentDetails.schedule.id`
- `schedule_name`: Viene de `assignmentDetails.schedule.name`

### 2. Modificación de sendPosition()

Se agregó un nuevo parámetro opcional `isLogout`:

```typescript
async sendPosition(
  latitude: number,
  longitude: number,
  isOutZone: boolean,
  assignmentDetails: any,
  isLogout: boolean = false  // ← NUEVO parámetro (por defecto false)
): Promise<void>
```

**Comportamiento:**
- En envíos normales (cada 30s): `isLogout = false` (valor por defecto)
- En logout: `isLogout = true` (se pasa explícitamente)

### 3. Nuevo Flujo de Logout (`src/App.tsx`)

Se modificó `handleLogout()` para seguir este orden:

```
1. Enviar ubicación final con is_logout=true
   ↓
2. Esperar confirmación del envío
   ↓
3. Detener rastreos GPS
   ↓
4. Hacer logout en authService
   ↓
5. Desconectar LiveKit
   ↓
6. Limpiar estado local
```

**Código:**
```typescript
const handleLogout = async () => {
  // 1. PRIMERO: Enviar ubicación final con is_logout=true
  if (location) {
    await gpsService.sendPosition(
      location.lat,
      location.lng,
      isOutOfZone,
      currentAssignment,
      true // ← is_logout = true
    );
  }
  
  // 2. LUEGO: Continuar con logout normal
  stopTracking();
  authService.logout();
  livekitService.disconnect();
  // ...
}
```

## Datos Enviados al Backend

### Envío Normal (cada 30 segundos)
```json
{
  "id": "inspector-123",
  "name": "Juan Pérez",
  "id_zone": "zone-456",
  "name_zone": "Zona Centro",
  "inspector_type": "fiscalizador",
  "assignment_id": "assign-789",
  "batery": "85",
  "velocidad": "0",
  "is_out_zone": false,
  "is_logout": false,           // ← false en envíos normales
  "schedule_id": "444",          // ← ID del turno
  "schedule_name": "Turno Mañana", // ← Nombre del turno
  "latitude": -12.0464,
  "longitude": -77.0428,
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

### Envío en Logout
```json
{
  // ... mismos campos ...
  "is_logout": true,  // ← true cuando es logout
  // ... resto de campos ...
}
```

## Validaciones

✅ Build compila sin errores TypeScript
✅ Parámetro `isLogout` tiene valor por defecto (no rompe código existente)
✅ Manejo de errores: si falla el envío en logout, continúa con el logout
✅ Logs informativos en cada paso del proceso

## Casos de Uso

### Caso 1: Envío Normal
- Usuario tiene la app abierta
- Cada 30 segundos se envía ubicación con `is_logout: false`
- Incluye `schedule_id` y `schedule_name` de la asignación activa

### Caso 2: Logout
- Usuario presiona botón de logout
- Se envía ubicación inmediatamente con `is_logout: true`
- Se espera confirmación del backend
- Luego se procede con el logout normal

### Caso 3: Sin Ubicación en Logout
- Usuario presiona logout pero no hay ubicación disponible
- Se muestra warning en consola
- Se continúa con logout normal (no bloquea el proceso)

## Notas Técnicas

- Los campos `schedule_id` y `schedule_name` vienen del objeto `assignmentDetails.schedule`
- Si no hay asignación activa, se envían como strings vacíos `""`
- El parámetro `isLogout` es opcional con valor por defecto `false`
- El proceso de logout es asíncrono y espera la confirmación del envío GPS
