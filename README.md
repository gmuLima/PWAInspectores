# PWA Inspector - Sistema Municipal de Inspectores de Tránsito

> Progressive Web App para inspectores de tránsito con rastreo GPS en tiempo real, validación de zonas, sistema de alertas e integración REST API.

## ✨ Características Principales

### 🗺️ Mapa en Tiempo Real
- Visualización de zona de asignación con polígono (WKT POLYGON)
- Posición actual del inspector en tiempo real
- Indicador visual: ✅ dentro de zona (verde) | ⚠️ fuera de zona (rojo)
- Centrado automático en ubicación actual

### 📍 Rastreo GPS Avanzado
- Reportes automáticos cada 30 segundos al servidor GPS
- Validación inteligente de punto-en-polígono (ray casting)
- Persistencia offline en IndexedDB para auditoría
- Extracción automática de nivel de batería
- Cálculo de velocidad desde datos GPS

### 🔔 Sistema de Alertas Inteligentes
- **Salida de zona** - Notificación inmediata
- **Batería baja** - Alerta cuando < 15%
- **GPS desactivado** - Detección automática
- **Botón pánico** - Para emergencias
- **Cola de reintentos** - Alertas fallidas se guardan y reintenta

### 🎙️ Walkie-Talkie Profesional
- Grabación y envío de audio en tiempo real
- Beep de inicio/fin de grabación
- Comunicación entre inspectores
- Reproducción automática de audio recibido

### 🔐 Autenticación Segura REST API
- Login con token único
- Device ID generado automáticamente (único por dispositivo)
- Sesión persistente en localStorage
- Detección y manejo de INVALID_TOKEN
- Headers automáticos en todos los requests

### 📱 PWA (Progressive Web App)
- Instalable en iOS 13.4+ y Android 5+
- Funciona completamente offline
- Service Worker con Workbox
- Sincronización en background
- Tamaño optimizado: 128 KB gzip

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- npm o yarn
- Navegador moderno

### Instalación
```bash
cd pwa-inspector
npm install
```

### Desarrollo
```bash
npm run dev
# Abre http://localhost:5173
```

### Compilación
```bash
npm run build
# Genera carpeta dist/ lista para producción
```

## 📚 Documentación Completa

| Documento | Propósito |
|-----------|----------|
| [**API_INTEGRATION.md**](./API_INTEGRATION.md) | Detalles completos de servicios REST |
| [**IMPLEMENTATION_SUMMARY.md**](./IMPLEMENTATION_SUMMARY.md) | Resumen técnico de cambios realizados |
| [**TESTING_GUIDE.md**](./TESTING_GUIDE.md) | Guía paso a paso para testing |
| [**DEPLOYMENT_GUIDE.md**](./DEPLOYMENT_GUIDE.md) | Instrucciones para llevar a producción |
| [**CHANGELOG.md**](./CHANGELOG.md) | Historial completo de cambios |

## 🏗️ Arquitectura

### Stack Tecnológico
```
Frontend:        React 19 + TypeScript 5.9 + SWC
Build:           Vite 7.2.4
Maps:            Leaflet 1.9.4 + OpenStreetMap
HTTP Client:     Fetch API + Custom Interceptors
Real-time:       Socket.IO 4.8.3 (walkie-talkie)
Storage:         localStorage + IndexedDB
PWA:             vite-plugin-pwa 1.2.0 + Workbox
Audio:           MediaRecorder API
Geolocation:     Browser Geolocation API
```

### Nuevos Servicios REST (v1.0.0)

| Servicio | Archivo | Líneas | Responsabilidad |
|----------|---------|--------|-----------------|
| HTTP Client | `httpClient.ts` | ~180 | Cliente HTTP con interceptores |
| Auth | `authService.ts` | ~100 | Autenticación + device_id |
| Inspector | `inspectorService.ts` | ~80 | Perfil del inspector con cache |
| Assignments | `assignmentService.ts` | ~120 | Asignaciones y zona geometry |
| GPS | `gpsService.ts` | ~180 | Rastreo GPS + IndexedDB |
| Alerts | `alertService.ts` | ~160 | Sistema de alertas |
| WKT Parser | `wktParser.ts` | ~130 | Geometría WKT + validación |

## 🔑 Credenciales de Prueba

```
Token Demo: demo-token-12345
```

## 🌐 Endpoints API Integrados

| Endpoint | Método | Servicio | Status |
|----------|--------|----------|--------|
| `/apk/auth/login` | POST | authService | ✅ |
| `/apk/me` | GET | inspectorService | ✅ |
| `/apk/assignment/current` | GET | assignmentService | ✅ |
| `/apk/assignment/{id}/details` | GET | assignmentService | ✅ |
| `/apk/alerts` | POST | alertService | ✅ |
| `/api/v1/gps/position` | POST | gpsService | ✅ |

**URLs Base:**
```
Main API:    https://api-back-gmu-lima.duckdns.org/api
GPS Service: https://service-gps-post-position.duckdns.org
```

## 🎯 Flujo de Uso

```
1. AUTENTICACIÓN
   ↓ Usuario ingresa token
   ↓ Se genera device_id único
   ↓ Se obtiene perfil del inspector
   
2. CARGAR DATOS
   ↓ Obtiene asignación activa
   ↓ Parsea geometría WKT POLYGON de zona
   ↓ Renderiza zona en mapa
   
3. RASTREO GPS
   ↓ Solicita permisos de geolocalización
   ↓ Inicia watchPosition cada 30 segundos
   ↓ Valida si está dentro/fuera de zona
   ↓ Envía ubicación al servicio GPS
   
4. MONITOREO ALERTAS
   ↓ Batería < 15% → Alerta
   ↓ Sale de zona → Alerta crítica
   ↓ GPS desactivado → Alerta
   ↓ Botón pánico → Alerta crítica
   
5. ALMACENAMIENTO OFFLINE
   ↓ localStorage: token, device_id, perfil
   ↓ IndexedDB: historial GPS, cola alertas
```

## 💾 Persistencia de Datos

| Storage | Contenido |
|---------|----------|
| **localStorage** | Token, Device ID, Perfil inspector, Asignación activa |
| **IndexedDB** | Historial de posiciones GPS, Cola de alertas |

## 📦 Build Output

```
dist/
├── index.html              # SPA entry point
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service Worker (Workbox)
├── registerSW.js           # SW registration
├── assets/
│   ├── index-*.css        # CSS minificado (9.89 KB gzip)
│   └── index-*.js         # JS minificado (128 KB gzip)
└── icons/
    ├── icon-192.png       # PWA icon
    └── icon-512.png       # PWA maskable icon
```

**Tamaño:** 422 KB total | 128 KB gzip

## ⚙️ Configuración

Editar URLs de API en `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  MAIN_API: 'https://tu-api.com/api',
  GPS_SERVICE: 'https://tu-gps-service.com',
  ENDPOINTS: { /* ... */ },
  HEADERS: { /* ... */ }
}
```

## 🔐 Seguridad

- ✅ Token en localStorage (con auto-cleanup)
- ✅ Device ID único por dispositivo
- ✅ Headers X-Inspector-Token + X-Device-ID automáticos
- ✅ Detección de INVALID_TOKEN con logout automático
- ✅ HTTPS obligatorio en producción
- ✅ CORS configurado en backend

## 📊 Performance

- **Build time:** ~2.4 segundos
- **Total size:** 422 KB (128 KB gzip)
- **First contentful paint:** < 1 segundo
- **GPS interval:** 30 segundos (configurable)
- **Módulos:** 124 transformados

## 🧪 Testing

```bash
# Desarrollo
npm run dev

# Build y preview
npm run build
npm run preview

# Verificar tipos
npm run typecheck
```

Ver [TESTING_GUIDE.md](./TESTING_GUIDE.md) para pruebas completas.

## 📱 Instalación en Dispositivos

### iOS (Safari)
1. Abre en Safari: `https://tu-dominio.com`
2. Haz clic en compartir (arriba derecha)
3. "Agregar a la pantalla de inicio"
4. Pon nombre y agrega

### Android (Chrome)
1. Abre en Chrome: `https://tu-dominio.com`
2. Menú (⋮) → "Instalar aplicación"
3. Confirma instalación

## 🐛 Troubleshooting

**El app no compila:**
```bash
rm -rf node_modules package-lock.json
npm install && npm run build
```

**GPS no funciona:**
- Verifica que estés en HTTPS
- Acepta permisos de geolocalización
- Activa GPS en el dispositivo

**API retorna 401:**
- Verifica que el token es válido
- Revisa que Device ID se envía en headers
- Verifica CORS en backend

## 📝 Licencia

MIT License - Libre para usar y modificar

## 👥 Equipo

- Municipalidad de Lima
- Equipo de Desarrollo

## 🎉 Status

```
✅ Frontend completado
✅ REST API integrada (6 servicios)
✅ PWA funcional y offline-first
✅ GPS tracking con validación de zona
✅ Sistema de alertas inteligentes
✅ Build sin errores TypeScript
✅ Documentación completa
🟡 Testing en producción (próximo)
```

---

**Versión:** 1.0.0 - REST API Integration  
**Última actualización:** 2025-01-14  
**Build Status:** ✅ Production Ready  
**Licencia:** MIT
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
