# Guía de Despliegue - PWA Inspector REST API

## 🚀 Despliegue a Producción

### Requisitos Previos
- Node.js 18+
- npm o yarn
- HTTPS configurado (obligatorio para PWA)
- Token válido del backend
- CORS habilitado en backend

## 📦 Paso 1: Preparar para Producción

### Verificar build sin errores
```bash
npm run build
```

Debe mostrar:
- ✅ 0 errores TypeScript
- ✅ ~422 KB JS + CSS
- ✅ Service Worker generado
- ✅ manifest.json procesado

### Actualizar configuración de API

Editar `src/config/api.ts`:
```typescript
export const API_CONFIG = {
  MAIN_API: 'https://tu-api-prod.com/api',
  GPS_SERVICE: 'https://tu-gps-service.com',
  // ...
}
```

### Configurar variables de entorno

Crear `.env.production`:
```env
VITE_API_URL=https://tu-api-prod.com/api
VITE_GPS_URL=https://tu-gps-service.com
```

## 🌐 Paso 2: Opciones de Hosting

### Opción A: Vercel (Recomendado para PWA)

```bash
npm install -g vercel
vercel login
vercel deploy
```

**Ventajas:**
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Redirecciones automáticas
- ✅ Build automático

**Configurar vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@vite_api_url",
    "VITE_GPS_URL": "@vite_gps_url"
  }
}
```

### Opción B: GitHub Pages

```bash
# Editar vite.config.ts
export default {
  base: '/pwa-inspector/',
  // ...
}

npm run build
# Subir dist/ a gh-pages branch
```

### Opción C: Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Opción D: Servidor propio (Node/Express)

```javascript
import express from 'express';
import compression from 'compression';

const app = express();
app.use(compression());
app.use(express.static('dist'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile('dist/index.html');
});

app.listen(3000, () => {
  console.log('PWA Inspector running on https://localhost:3000');
});
```

## 🔒 Paso 3: Configurar CORS en Backend

El backend DEBE permitir requests del frontend:

```javascript
// Express CORS
const cors = require('cors');

app.use(cors({
  origin: [
    'https://tu-frontend.com',
    'https://tu-frontend.com:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'X-Inspector-Token',
    'X-Device-ID',
  ],
}));
```

## 📱 Paso 4: Configurar PWA

Editar `public/manifest.json`:
```json
{
  "name": "PWA Inspector Tránsito Lima",
  "short_name": "Inspector",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

## 🛡️ Paso 5: Seguridad en Producción

### Headers Recomendados

```javascript
// Express middleware
app.use((req, res, next) => {
  // HTTPS redirect
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(301, `https://${req.header('host')}${req.url}`);
  }

  // Seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' https: data:;
    font-src 'self';
    connect-src 'self' https://api-back-gmu-lima.duckdns.org https://service-gps-post-position.duckdns.org https://tile.openstreetmap.org;
    media-src 'self';
  `.replace(/\n/g, ' '));

  next();
});
```

### Almacenamiento Seguro de Tokens

Considerar cambiar de localStorage a sessionStorage:

```typescript
// En authService.ts
// localStorage → sessionStorage (menos persistente, más seguro)
sessionStorage.setItem('X-Inspector-Token', token);
sessionStorage.setItem('X-Device-ID', deviceId);
```

**Nota:** Con sessionStorage se pierde la sesión al cerrar el navegador (más seguro).

## 🔄 Paso 6: CI/CD Pipeline

### GitHub Actions Ejemplo

```yaml
name: Deploy PWA

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      
      - run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 📊 Paso 7: Monitoreo

### Sentry (Error Tracking)

```bash
npm install @sentry/react
```

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://tu-sentry-dsn@sentry.io/xxx",
  environment: "production",
  tracesSampleRate: 0.1,
});

export default Sentry.withProfiler(App);
```

### Analytics

```typescript
// Google Analytics
import ReactGA from 'react-ga4';

ReactGA.initialize('G-XXXXXXXXXXXX');
ReactGA.send({ hitType: 'pageview' });
```

## 📝 Paso 8: Documentación

### Publicar documentación

```bash
# Generar docs
npm run docs

# Subir a GitHub Pages
git subtree push --prefix docs origin gh-pages
```

## ✅ Checklist Pre-Despliegue

- [ ] Build compila sin errores
- [ ] APIs configuradas para producción
- [ ] HTTPS habilitado
- [ ] CORS configurado en backend
- [ ] Tokens secretos en variables de entorno
- [ ] Service Worker generado
- [ ] manifest.json válido
- [ ] Icons de PWA presentes (192, 512, maskable)
- [ ] HTTPS redirect activo
- [ ] Headers de seguridad configurados
- [ ] Rate limiting en backend
- [ ] Logs de acceso configurados
- [ ] Backups configurados
- [ ] Monitoreo activado
- [ ] Pruebas finales en producción

## 🚨 Troubleshooting Despliegue

### PWA no se instala
- [ ] Verificar manifest.json válido
- [ ] HTTPS obligatorio
- [ ] Icons presentes (192x192 mínimo)
- [ ] start_url correcto

### API responses 401
- [ ] Token válido
- [ ] Device ID consistente
- [ ] Headers correctos en requests

### Service Worker offline
- [ ] SW está cacheando archivos
- [ ] IndexedDB funciona (prueba en DevTools)
- [ ] Sin CORS errors en console

### Geolocalización no funciona
- [ ] HTTPS es requisito
- [ ] Usuario debe aceptar permisos
- [ ] GPS debe estar activado en dispositivo

## 📞 Soporte

Para issues post-despliegue:
1. Revisar logs en servidor
2. Verificar DevTools Console en cliente
3. Revisar Network tab para requests fallidos
4. Verificar Storage (localStorage, IndexedDB)
5. Contactar con soporte del backend

---

**Última actualización:** 2025-01-14
**Status:** ✅ Ready for Production
