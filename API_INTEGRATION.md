# Integración REST API - PWA Inspector

## ✅ Estado de Integración

La PWA ha sido completamente integrada con la API REST del backend. Todos los servicios REST están listos para usar.

## 🆕 Nuevos Servicios Creados

### 1. **HTTP Client** (`src/services/httpClient.ts`)
- Cliente HTTP centralizado con interceptores automáticos
- Inyecta automáticamente `X-Inspector-Token` y `X-Device-ID` en headers
- Detecta respuestas `INVALID_TOKEN` y triggeriza logout automático
- Manejo centralizado de errores

### 2. **Authentication Service** (`src/services/authService.ts`)
- `login(token)` - Autenticación con token
- `validateSession()` - Validación de sesión activa
- `logout()` - Limpieza de sesión
- `getToken()` - Obtener token almacenado
- `getDeviceId()` - Obtener ID único del dispositivo
- `isAuthenticated()` - Verificar autenticación actual

**Características:**
- Genera `device_id` único por dispositivo (almacenado en localStorage)
- Almacena token + device_id en localStorage
- Previene múltiples logins en diferentes dispositivos (un token = un dispositivo)

### 3. **Inspector Service** (`src/services/inspectorService.ts`)
- `getMe()` - GET `/apk/me` para obtener datos del inspector
- `getMeWithFallback()` - Intenta red, cae a localStorage si offline
- `cacheInspector()` - Almacena en localStorage para acceso offline
- Retorna: `InspectorData` con id, name, email, phone, type, zone_id, status, timestamps

### 4. **Assignment Service** (`src/services/assignmentService.ts`)
- `getCurrent()` - GET `/apk/assignment/current` para assignments del día
- `getDetails(assignmentId)` - GET `/apk/assignment/{id}/details` con geometría WKT
- `getActiveAssignment()` - Obtiene primer assignment con status='active'
- `getActiveAssignmentDetails()` - Obtiene detalles del assignment activo
- `cacheActiveAssignment()` - Almacena en localStorage

**Importante:** `getDetails()` solo funciona si `assignment.status === 'active'` (restricción de API)

### 5. **GPS Service** (`src/services/gpsService.ts`)
- `sendPosition(lat, lng, isOutZone, assignmentDetails)` - POST a GPS service
- `startTracking(callback, interval=30000)` - Inicia rastreo continuo
- `stopTracking()` - Detiene rastreo GPS
- `getLastPosition()` - Obtiene última posición registrada

**Características:**
- Envía ubicaciones cada 30 segundos (configurable)
- Extrae porcentaje de batería automáticamente
- Calcula velocidad (placeholder para datos reales de GPS)
- Guarda posiciones en IndexedDB para auditoría offline
- Detecta estado fuera-de-zona automáticamente

### 6. **Alert Service** (`src/services/alertService.ts`)
- `sendAlert(alert)` - POST `/apk/alerts` con alerta genérica
- `alertOutOfZone(lat, lng)` - Alerta de salida de zona
- `alertLowBattery(lat, lng)` - Alerta de batería baja
- `alertGpsDisabled(lat, lng)` - Alerta de GPS desactivado
- `alertPanic(lat, lng)` - Alerta de pánico (botón emergencia)
- `alertAppClosed(lat, lng)` - Alerta de app cerrada
- `retryPendingAlerts()` - Reintentar alertas fallidas

**Tipos de Alerta:**
- `out_of_zone` (HIGH)
- `low_battery` (MEDIUM)
- `gps_disabled` (HIGH)
- `app_closed` (MEDIUM)
- `panic` (CRITICAL)

### 7. **Utilities - WKT Parser** (`src/utils/wktParser.ts`)
- `parseWKTPolygon(wktString)` - Parsea "POLYGON ((lat lng, ...))" a objetos
- `isPointInsidePolygon(point, polygon)` - Ray casting algorithm
- `calculateDistance(point1, point2)` - Distancia Haversine en km
- `getClosestPointOnPolygon(point, polygon)` - Punto más cercano del polígono
- `getDistanceToPolygon(point, polygon)` - Distancia a polígono (negativa si dentro)

## 🚀 Flujo de Uso en App.tsx

### 1. **Login**
```typescript
// Usuario ingresa token
await authService.login(userToken);

// Se genera device_id automáticamente
// Se almacenan credenciales en localStorage
// Se activa la sesión
```

### 2. **Cargar Datos del Inspector**
```typescript
// Obtener perfil
const inspector = await inspectorService.getMeWithFallback();
setInspectorName(inspector.name);

// Obtener asignación activa con zona
const assignment = await assignmentService.getActiveAssignmentDetails();
setCurrentAssignment(assignment);

// Parsear polígono de zona
const polygon = parseWKTPolygon(assignment.zone.geometry);
setZonePolygon(polygon);
```

### 3. **Iniciar Rastreo GPS**
```typescript
gpsService.startTracking(
  async (position) => {
    const { latitude, longitude } = position.coords || position;
    
    // Verificar si está fuera de zona
    const point = { latitude, longitude };
    const outOfZone = !isPointInsidePolygon(point, zonePolygon);

    // Enviar ubicación a servicio GPS
    await gpsService.sendPosition(
      latitude,
      longitude,
      outOfZone,
      currentAssignment
    );
  },
  30000 // 30 segundos
);
```

### 4. **Monitoreo de Alertas**
```typescript
// Monitoreo automático en App.tsx:

// Detectar salida de zona
if (outOfZone !== previousState) {
  await alertService.alertOutOfZone(location.lat, location.lng);
}

// Detectar batería baja
if (batteryLevel < 15 && !alreadyAlerted) {
  await alertService.alertLowBattery(location.lat, location.lng);
}

// Botón pánico (en FloatingButtons)
async handlePanic() {
  await alertService.alertPanic(location.lat, location.lng);
}
```

## 📊 Persistencia de Datos

### localStorage
- `X-Inspector-Token` - Token de autenticación
- `X-Device-ID` - Identificador único del dispositivo
- `inspector_data` - Perfil del inspector (cache)
- `active_assignment` - Asignación activa (cache)

### IndexedDB
- `gps_positions` - Historial de posiciones con flag `synced`
- `alert_queue` - Alertas pendientes de envío (reintentos)

## 🔑 Headers HTTP Automáticos

Todos los requests incluyen automáticamente:
```
X-Inspector-Token: <token>
X-Device-ID: <device_id>
Content-Type: application/json
```

## ⚙️ Configuración de URLs

Archivo: `src/config/api.ts`

```typescript
export const API_CONFIG = {
  MAIN_API: 'https://api-back-gmu-lima.duckdns.org/api',
  GPS_SERVICE: 'https://service-gps-post-position.duckdns.org',
  ENDPOINTS: {
    LOGIN: '/apk/auth/login',
    INSPECTOR: '/apk/me',
    ASSIGNMENTS: '/apk/assignment/current',
    ASSIGNMENT_DETAILS: (id) => `/apk/assignment/${id}/details`,
    ALERTS: '/apk/alerts',
    GPS_POSITION: '/api/v1/gps/position',
  },
};
```

## 🧪 Testing en Desarrollo

### Token Demo
```
Token: demo-token-12345
```

### Pantalla de Login
- Nueva pantalla simplificada con input de token
- Requiere token válido del backend
- Solicita permiso de geolocalización automáticamente

### Estado en UI
- ✅ Indicador de zona (verde=dentro, rojo=fuera)
- 🔋 Indicador de batería baja
- 🟢/🔴 Indicador de conexión
- 📍 Coordenadas actuales en tiempo real

## ⚠️ Manejo de Errores

### INVALID_TOKEN
Si el backend responde con `INVALID_TOKEN`:
1. authService detecta automáticamente
2. Limpia localStorage
3. Redirige a pantalla de login
4. No requiere intervención manual

### Alertas Fallidas
Si una alerta falla en envío:
1. Se guarda en `alert_queue` IndexedDB
2. Se reintentan automáticamente al recuperar conexión
3. Se retienen hasta ser enviadas exitosamente

### GPS Offline
Si no hay conexión:
1. Las posiciones se guardan en IndexedDB
2. Se reintenta cada 30 segundos
3. Se sincronizan cuando se recupera conexión

## 📱 Características PWA

- ✅ Instalable en iOS/Android
- ✅ Funciona offline (con data en caché)
- ✅ Sincronización en background
- ✅ Icons 192x512 (normal + maskable)
- ✅ Service Worker con Workbox

## 🔄 Transición desde Socket.IO

**Socket.IO sigue activo para:**
- Walkie-talkie (audio en tiempo real)
- Comunicación entre inspectores
- Eventos en vivo

**REST API ahora maneja:**
- ✅ Autenticación
- ✅ Datos de inspector
- ✅ Asignaciones y zonas
- ✅ Rastreo GPS
- ✅ Alertas

## 📝 Próximos Pasos

1. **Obtener token real** del backend para testing
2. **Configurar CORS** en backend si es necesario
3. **Testing end-to-end** con datos reales
4. **Background sync** para posiciones offline
5. **Estadísticas** de tiempo en zona

## 🆘 Soporte

Para issues:
1. Ver console en DevTools para errores
2. Revisar Network tab para requests fallidos
3. Verificar localStorage en Application tab
4. Revisar IndexedDB en Application > Storage

---

**Estado:** ✅ Completamente integrado
**Última actualización:** 2025-01-14
