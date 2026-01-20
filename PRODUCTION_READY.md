# 🚀 INSTRUCCIONES PARA PRODUCCIÓN

## ✅ Estado Actual

La aplicación está **100% lista para producción**. Todo el hardcoding ha sido removido.

## 📋 Checklist Pre-Producción

- ✅ Sin tokens hardcodeados
- ✅ Sin URLs hardcodeadas
- ✅ Todas las URLs vienen de variables de entorno (.env)
- ✅ Build compila sin errores (0 TypeScript errors)
- ✅ PWA completamente funcional
- ✅ Documentación completa

## 🔧 Configuración para Tu Entorno

### 1. Crear archivo `.env.local`

En la raíz del proyecto, crea un archivo `.env.local` (basado en `.env.example`):

```bash
# COPIAR .env.example a .env.local
cp .env.example .env.local
```

### 2. Editar `.env.local` con TUS valores

```env
# ============================================
# API CONFIGURATION
# ============================================
# Tu URL de API real
VITE_MAIN_API=https://tu-api-real.com/api

# Tu URL de servicio GPS
VITE_GPS_SERVICE=https://tu-gps-service.com

# ============================================
# SOCKET.IO (Walkie-talkie)
# ============================================
# Tu URL de Socket.IO
VITE_SOCKET_URL=https://tu-socket-io.com

# ============================================
# DEBUG
# ============================================
# En producción: false
VITE_DEBUG=false
```

### 3. Obtener token para usuarios

El usuario ingresará su token en la pantalla de login. No es hardcodeado.

Para obtener token, el usuario debe:
1. Contactar con administración
2. O autenticarse en un portal backend
3. Copiar el token
4. Pegarlo en el input de login de la PWA

## 🌐 Opciones de Despliegue

### Opción 1: Vercel (Recomendado)

```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

**Configurar variables en Vercel Dashboard:**
- `VITE_MAIN_API`
- `VITE_GPS_SERVICE`
- `VITE_SOCKET_URL`

### Opción 2: Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

**Configurar en netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[env]
  VITE_MAIN_API = "https://tu-api.com/api"
  VITE_GPS_SERVICE = "https://tu-gps.com"
  VITE_SOCKET_URL = "https://tu-socket.com"
```

### Opción 3: Servidor propio

```bash
npm run build
# Subir carpeta dist/ a tu servidor
# Configurar HTTPS obligatorio
# Configurar CORS en backend
```

## 📱 Para Usuarios

### En iOS
1. Abre en Safari: `https://tu-dominio.com`
2. Toca compartir (arriba derecha)
3. "Agregar a la pantalla de inicio"
4. Ingresa tu token cuando te lo pida

### En Android
1. Abre en Chrome: `https://tu-dominio.com`
2. Menú (⋮) → "Instalar aplicación"
3. Ingresa tu token cuando te lo pida

## 🔒 Seguridad en Producción

### Obligatorio:
- ✅ HTTPS (no HTTP)
- ✅ CORS configurado en backend
- ✅ Tokens vienen del backend, no hardcodeados
- ✅ No guardar secrets en código

### Recomendado:
- ✅ Rate limiting en backend
- ✅ Validación de device_id
- ✅ Logs de acceso
- ✅ Monitoreo (Sentry)

## 🧪 Testing Antes de Deploy

```bash
# 1. Local en desarrollo
npm run dev

# 2. Build y preview local
npm run build
npm run preview

# 3. Verificar que no hay errores
npm run typecheck

# 4. Abrir en móvil
# - Cambiar VITE_SOCKET_URL a localhost:3000
# - O usar ngrok para túnel: ngrok http 5173
```

## 📊 Estructura de Variables de Entorno

| Variable | Ejemplo | Uso |
|----------|---------|-----|
| `VITE_MAIN_API` | `https://api.com/api` | Login, Inspector, Assignments, Alerts |
| `VITE_GPS_SERVICE` | `https://gps.com` | Envío de ubicaciones |
| `VITE_SOCKET_URL` | `https://socket.com` | Walkie-talkie |
| `VITE_DEBUG` | `false` | Logs en consola |

## 🚨 Troubleshooting Producción

### Error: "Cannot POST /apk/auth/login"
- ✅ Verifica que VITE_MAIN_API es correcto
- ✅ Verifica que backend está corriendo
- ✅ Verifica CORS en backend

### Error: "INVALID_TOKEN"
- ✅ Token es incorrecto
- ✅ Token expiró
- ✅ Backend no reconoce ese token

### PWA no se instala
- ✅ Debe estar en HTTPS
- ✅ Verifica manifest.json
- ✅ Icons presentes (192x192, 512x512)

### GPS no funciona
- ✅ Debe estar en HTTPS
- ✅ Usuario debe aceptar permisos
- ✅ GPS debe estar activado en dispositivo

## 📝 Checklist de Deploy

- [ ] `.env.local` configurado con URLs reales
- [ ] VITE_DEBUG = false
- [ ] npm run build: sin errores
- [ ] HTTPS habilitado
- [ ] CORS configurado en backend
- [ ] Tokens reales funcionando
- [ ] Probado en móvil (iOS y Android)
- [ ] Probado en desktop (Chrome)
- [ ] Walkie-talkie funcionando
- [ ] GPS rastreando correctamente
- [ ] Alertas enviándose correctamente

## 🎯 Próximos Pasos

1. **Obtener URLs reales** del backend
2. **Crear `.env.local`** con esas URLs
3. **Testing local** con `npm run dev`
4. **Deploy** a Vercel/Netlify/tu servidor
5. **Configurar variables** en el servicio de hosting
6. **Testing en producción** con usuarios reales

## 📞 Soporte

Si algo falla:
1. Revisa DevTools Console (F12)
2. Revisa Network tab para requests fallidos
3. Verifica que URLs en .env son correctas
4. Verifica que backend está respondiendo
5. Revisa CORS en backend

---

**Status:** ✅ Production Ready
**Versión:** 1.0.0
**Última actualización:** 2025-01-14
