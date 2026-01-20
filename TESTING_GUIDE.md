# Guía de Pruebas - REST API Integration

## 🧪 Pruebas de Compilación

### ✅ Build Exitoso
```bash
npm run build
# Sin errores TypeScript
# 124 módulos transformados
# PWA Service Worker generado
```

## 🔑 Credenciales de Prueba

### Token Demo
```
demo-token-12345
```

Use este token para probar el login en la pantalla inicial.

## 📱 Flujo de Prueba Manual

### 1. **Pantalla de Login**
- [ ] Navega a la aplicación
- [ ] Verás pantalla azul con input de token
- [ ] Ingresa: `demo-token-12345`
- [ ] Haz clic en "Ingresar"

### 2. **Permisos de Geolocalización**
- [ ] iOS: Se abre popup de permiso automáticamente
- [ ] Android: Se abre popup de permiso automáticamente
- [ ] Acepta el permiso para continuar
- [ ] **Importante:** Sin permiso de GPS, el app no funcionará

### 3. **Pantalla Principal**
- [ ] Se carga Header flotante con nombre del inspector
- [ ] Mapa centra en Lima (-12.046374, -77.042793)
- [ ] Se muestra icono de ubicación actual (azul)
- [ ] Botones flotantes en esquina inferior derecha

### 4. **Rastreo GPS**
- [ ] Haz clic en botón "📍 Rastreo" para iniciar
- [ ] Espera 30 segundos para primer envío
- [ ] Verás ubicación actualizada en tiempo real
- [ ] Header mostrará "Ubicación activa"

### 5. **Zona de Asignación**
- [ ] Si hay asignación activa, verás polígono en mapa
- [ ] Polígono verde = dentro de zona
- [ ] Polígono rojo = fuera de zona
- [ ] Indicador rojo en header si estás fuera

### 6. **Batería Baja**
- [ ] Si batería < 15%, verás indicador amarillo
- [ ] Mensaje: "🔋 Batería baja (X%)"

### 7. **Walkie-Talkie**
- [ ] Haz clic en botón "🎙️ Grabar"
- [ ] Comienza grabación (cuenta hacia arriba)
- [ ] Haz clic nuevamente para detener
- [ ] Se envía audio por Socket.IO
- [ ] Suena beep al iniciar y finalizar

### 8. **Cerrar Sesión**
- [ ] Haz clic en botón "🚪" en header
- [ ] Se limpia localStorage
- [ ] Se regresa a pantalla de login
- [ ] Todas las conexiones se cierran

## 🌐 Pruebas de Red

### Headers Automáticos
Verifica en DevTools > Network:

```
X-Inspector-Token: demo-token-12345
X-Device-ID: <uuid-generado>
Content-Type: application/json
```

### Endpoints que se deben llamar

1. **POST /apk/auth/login**
   - Request: `{ token: "demo-token-12345" }`
   - Response: Inspector data

2. **GET /apk/me**
   - Headers: Token + Device-ID
   - Response: Inspector profile

3. **GET /apk/assignment/current**
   - Headers: Token + Device-ID
   - Response: Array de asignaciones

4. **GET /apk/assignment/{id}/details**
   - Headers: Token + Device-ID
   - Response: Detalles con WKT POLYGON

5. **POST /api/v1/gps/position** (GPS_SERVICE)
   - Headers: Token + Device-ID
   - Body: Ubicación con zona
   - Cada 30 segundos

6. **POST /apk/alerts**
   - Headers: Token + Device-ID
   - Body: Tipo de alerta, severidad, mensaje

## 🔍 Verificar en DevTools

### Console Tab
- [ ] Sin errores rojo (excepto 404 si backend no responde)
- [ ] Ver logs: "✅ Alerta enviada"
- [ ] Ver logs de GPS: "Posición enviada"

### Network Tab
- [ ] `/apk/auth/login` - POST exitoso
- [ ] `/apk/me` - GET exitoso
- [ ] `/apk/assignment/current` - GET exitoso
- [ ] `/apk/assignment/*/details` - GET exitoso
- [ ] `/api/v1/gps/position` - POST cada 30 seg

### Storage Tab (localStorage)
- [ ] `X-Inspector-Token` - Contiene token
- [ ] `X-Device-ID` - UUID único
- [ ] `inspector_data` - JSON con perfil
- [ ] `active_assignment` - JSON con asignación

### Storage Tab (IndexedDB)
- [ ] `InspectorApp` database
- [ ] `gps_positions` store - Historial de posiciones
- [ ] `alert_queue` store - Alertas pendientes

## ⚠️ Casos de Error

### Error: "INVALID_TOKEN"
- [ ] App detecta automáticamente
- [ ] Limpia localStorage
- [ ] Redirige a login
- [ ] Requiere nuevo token

### Error: GPS no disponible
- [ ] Verifica permisos en Configuración
- [ ] iOS: Settings > Privacy > Location
- [ ] Android: Settings > Permissions > Location

### Error: No se conecta a API
- [ ] Verifica URLs en `src/config/api.ts`
- [ ] Verifica CORS en backend
- [ ] Verifica conexión a internet
- [ ] Verifica que backend está corriendo

### Error: Polígono no se renderiza
- [ ] Verifica que WKT es válido: "POLYGON ((...))"
- [ ] Verifica formato de coordenadas: lat lng
- [ ] Abre Console para ver error de parsing

## 🔐 Pruebas de Seguridad

### Tokens
- [ ] Token no aparece en URLs
- [ ] Token se almacena en localStorage (considera https)
- [ ] Device ID es único por dispositivo

### Session Hijacking
- [ ] Device ID previene duplicados
- [ ] Un token = un dispositivo
- [ ] Logout limpia todo

### Offline
- [ ] Sin conexión: App sigue funcionando
- [ ] Datos se guardan en IndexedDB
- [ ] Se sincronizan al reconectar

## 📊 Pruebas de Performance

### Build Size
```
Total: 422 KB (128 KB gzip)
CSS: 30.38 KB (9.89 KB gzip)
JS: 422 KB (128 KB gzip)
```

### Build Time
```
TypeScript: < 1 segundo
Vite: ~ 2.5 segundos
PWA: ~ 0.5 segundos
```

### Carga GPS
- Cada 30 segundos
- ~1-2 KB por request
- Async (no bloquea UI)

## 📱 Pruebas en Dispositivo

### iOS
```bash
npm run build
# Abrir en Safari o instalar PWA
# Settings > Privacy > Location > Allow
# Espera notificación de geolocalización
```

### Android
```bash
npm run build
# Abrir en Chrome o instalar PWA
# Permissions > Location > Allow
# Espera notificación de geolocalización
```

### Desktop (Chrome)
```bash
npm run build
# Abre DevTools
# Settings > Privacy > Location > Allow
# Verifica Network tab para requests
```

## ✅ Checklist de Verificación Final

- [ ] Build compila sin errores
- [ ] Login con token funciona
- [ ] Geolocalización se solicita
- [ ] GPS tracking inicia automáticamente
- [ ] Ubicación se actualiza cada 30s
- [ ] Zona se renderiza en mapa
- [ ] Salida de zona genera alerta
- [ ] Batería baja genera alerta
- [ ] Headers X-Inspector-Token en requests
- [ ] Device-ID único por dispositivo
- [ ] Logout limpia todo
- [ ] localStorage contiene datos esperados
- [ ] IndexedDB almacena posiciones
- [ ] Sin errores en console
- [ ] PWA instalable

## 🐛 Reportar Bugs

Si encuentras un error:

1. Abre DevTools (F12)
2. Ve a Console tab
3. Copia error completo
4. Anota pasos para reproducir
5. Verifica Network tab para requests fallidos
6. Revisa Storage para datos almacenados

Incluye:
- [ ] Mensaje de error exacto
- [ ] Pasos para reproducir
- [ ] Browser y versión
- [ ] Dispositivo (iOS/Android/Desktop)
- [ ] Captura de pantalla

---

**Última actualización:** 2025-01-14
**Status:** ✅ Ready for Testing
