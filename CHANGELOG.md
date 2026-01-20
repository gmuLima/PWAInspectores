# Changelog - REST API Integration

## [1.0.0] - 2025-01-14

### ✨ Nuevas Características

#### Servicios REST
- **httpClient.ts**: Cliente HTTP centralizado con interceptores automáticos
  - Inyecta headers X-Inspector-Token y X-Device-ID automáticamente
  - Detecta y maneja respuestas INVALID_TOKEN
  - Callbacks para invalidación de sesión

- **authService.ts**: Gestión de autenticación
  - login(token) - Autenticación con token
  - validateSession() - Validación de sesión
  - logout() - Limpieza de sesión
  - Auto-generación de device_id único por dispositivo
  - Almacenamiento seguro en localStorage

- **inspectorService.ts**: Datos del inspector
  - getMe() - Obtener perfil de inspector
  - getMeWithFallback() - Con soporte offline
  - Caching en localStorage

- **assignmentService.ts**: Gestión de asignaciones
  - getCurrent() - Asignaciones del día
  - getDetails() - Detalles con geometría WKT
  - getActiveAssignment() - Obtener asignación activa
  - Caching de asignación activa

- **gpsService.ts**: Rastreo GPS
  - sendPosition() - Envío de ubicaciones
  - startTracking() - Rastreo continuo cada 30s
  - Extracción automática de nivel de batería
  - Persistencia en IndexedDB para offline
  - Detección automática de salida de zona

- **alertService.ts**: Sistema de alertas
  - sendAlert() - Envío genérico de alertas
  - alertOutOfZone() - Alerta de zona
  - alertLowBattery() - Alerta de batería
  - alertGpsDisabled() - Alerta de GPS
  - alertPanic() - Botón de pánico
  - alertAppClosed() - App cerrada
  - Cola de reintentos en IndexedDB

#### Utilidades
- **wktParser.ts**: Procesamiento de geometría
  - parseWKTPolygon() - Parsea POLYGON WKT
  - isPointInsidePolygon() - Ray casting algorithm
  - calculateDistance() - Haversine formula
  - getClosestPointOnPolygon() - Punto más cercano
  - getDistanceToPolygon() - Distancia a polígono

#### UI Improvements
- Nueva pantalla de login con input de token
- Indicador visual de zona (verde=dentro, rojo=fuera)
- Indicador de batería baja
- Renderizado de polígono de zona en mapa
- Visualización de coordenadas en tiempo real

### 🔄 Cambios

#### Removido
- Socket.IO para autenticación (mantenido para walkie-talkie)
- Autenticación hardcodeada usuario/contraseña
- URL de servidor Socket.IO editable

#### Modificado
- **App.tsx**
  - Nueva lógica de autenticación con REST API
  - Carga de perfil e inspector automática
  - Rastreo GPS mediante gpsService
  - Monitoreo de alertas en tiempo real
  - Limpieza adecuada en logout

- **MapComponent.tsx**
  - Props nuevos: zonePolygon, isOutOfZone
  - Renderizado de Polygon con Leaflet
  - Color dinámico según estado de zona

- **Header.tsx**
  - Eliminar prop onShowSettings
  - Mejorada descripción de estado

#### Creados
- `src/config/api.ts` - Configuración centralizada
- `src/services/httpClient.ts` - Cliente HTTP
- `src/services/authService.ts` - Autenticación
- `src/services/inspectorService.ts` - Inspector data
- `src/services/assignmentService.ts` - Asignaciones
- `src/services/gpsService.ts` - GPS tracking
- `src/services/alertService.ts` - Sistema de alertas
- `src/utils/wktParser.ts` - Parsing de geometría

#### Documentación
- `API_INTEGRATION.md` - Guía completa de servicios
- `IMPLEMENTATION_SUMMARY.md` - Resumen de cambios

### 🔐 Seguridad

- [x] Tokens almacenados en localStorage (considera sessionStorage para más seguridad)
- [x] Device ID único por dispositivo
- [x] Headers automáticos en todos los requests
- [x] Manejo de sesión inválida
- [x] Persistencia segura offline

### 🧪 Testing

- [x] Build compila sin errores TypeScript
- [x] PWA Service Worker generado correctamente
- [x] Todos los servicios funcionales
- [x] Offline persistence verificada
- [x] GPS tracking integrado

### 📊 Métricas

- **Líneas nuevas:** ~1000
- **Archivos nuevos:** 8
- **Archivos modificados:** 3
- **Build size:** 422 KB (128 KB gzip)
- **Módulos:** 124

### 🚀 Requisitos Previos para Producción

1. Token válido del backend
2. URLs correctas configuradas en `src/config/api.ts`
3. CORS configurado en backend
4. HTTPS en producción (requerido para PWA)
5. Permisos de geolocalización en dispositivo

### 📝 Notas Importantes

- El `device_id` se genera una sola vez por dispositivo
- Las alertas fallidas se reintentan automáticamente
- Las posiciones GPS se persisten en IndexedDB para auditoría
- El polígono de zona se valida cada vez que llega una posición
- Socket.IO sigue activo para comunicación de walkie-talkie

### 🔧 Configuración

Todas las URLs en `src/config/api.ts`:
```typescript
MAIN_API: 'https://api-back-gmu-lima.duckdns.org/api',
GPS_SERVICE: 'https://service-gps-post-position.duckdns.org',
```

### ✅ Checklist de Implementación

- [x] Cliente HTTP con interceptores
- [x] Servicio de autenticación
- [x] Carga de perfil de inspector
- [x] Obtención de asignaciones y zonas
- [x] Rastreo GPS con validación de zona
- [x] Sistema de alertas
- [x] Validación geográfica (point-in-polygon)
- [x] Persistencia offline (localStorage + IndexedDB)
- [x] UI actualizado con indicadores
- [x] Build exitoso sin errores
- [x] Documentación completa

---

**Version:** 1.0.0
**Date:** 2025-01-14
**Status:** ✅ Production Ready
