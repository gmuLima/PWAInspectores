# Mejoras en Reconexión de LiveKit

## Resumen
Se implementaron múltiples mecanismos para detectar y manejar desconexiones de LiveKit, con reconexión automática y manual.

## Funcionalidades Implementadas

### 1. Verificación al Volver del Background

**Ubicación:** `src/App.tsx` - useEffect de `visibilitychange`

Cuando la app vuelve a estar visible después de estar minimizada:

```typescript
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (!document.hidden) {
      // App volvió a estar visible
      const isStillConnected = livekitService.getIsConnected();
      
      if (!isStillConnected) {
        // Detectó desconexión
        setIsLiveKitConnected(false);
        setLivekitConnectionError('Conexión perdida. Toca el micrófono para reconectar');
      } else {
        // Sigue conectado, actualizar contador
        setParticipantCount(livekitService.getParticipantCount());
      }
    }
  };
  // ...
}, [isLoggedIn, inspectorData]);
```

**Comportamiento:**
- ✅ Detecta si LiveKit se desconectó mientras estaba minimizada
- ✅ Muestra mensaje de error en el botón de micrófono
- ✅ Actualiza contador de participantes si sigue conectado

### 2. Chequeo Periódico de Conexión

**Ubicación:** `src/App.tsx` - nuevo useEffect

Verifica el estado de conexión cada 10 segundos:

```typescript
useEffect(() => {
  const connectionCheckInterval = setInterval(() => {
    const isStillConnected = livekitService.getIsConnected();
    
    if (isLiveKitConnected && !isStillConnected) {
      // Desconexión detectada
      setIsLiveKitConnected(false);
      setLivekitConnectionError('Conexión perdida. Toca el micrófono para reconectar');
    } else if (!isLiveKitConnected && isStillConnected) {
      // Reconexión detectada
      setIsLiveKitConnected(true);
      setLivekitConnectionError(null);
    }
  }, 10000); // Cada 10 segundos
  // ...
}, [isLoggedIn, inspectorData, isLiveKitConnected]);
```

**Comportamiento:**
- ✅ Detecta desconexiones automáticamente cada 10 segundos
- ✅ Detecta reconexiones automáticas
- ✅ Actualiza UI automáticamente

### 3. Función de Reconexión Manual

**Ubicación:** `src/App.tsx` - `handleRetryConnection()`

Nueva función dedicada para reconectar manualmente:

```typescript
const handleRetryConnection = async () => {
  console.log('🔄 Intentando reconectar a LiveKit...');
  setLivekitConnectionError(null);
  setIsLiveKitConnected(false);

  try {
    // Desconectar primero si hay conexión residual
    await livekitService.disconnect();

    // Intentar reconectar
    const inspectorId = inspectorData.inspector_id || inspectorData.id;
    const connected = await livekitService.connect(inspectorId);
    
    setIsLiveKitConnected(connected);
    
    if (connected) {
      console.log('✅ Reconexión exitosa');
      setParticipantCount(livekitService.getParticipantCount());
    } else {
      setLivekitConnectionError('No se pudo reconectar. Intenta nuevamente');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
    setLivekitConnectionError(errorMessage);
  }
};
```

**Comportamiento:**
- ✅ Desconecta limpiamente antes de reconectar
- ✅ Intenta reconectar con el mismo inspector_id
- ✅ Actualiza UI con resultado (éxito o error)
- ✅ Maneja errores gracefully

### 4. Botón de Reconexión en UI

**Ubicación:** `src/components/FloatingButtons.tsx` (ya existía)

El botón de micrófono se transforma en botón de reconexión cuando hay error:

```typescript
<button
  className={`fab fab-primary ${connectionError ? 'error' : ''}`}
  onClick={connectionError ? onRetryConnection : undefined}
  title={
    connectionError 
      ? `Error: ${connectionError}. Toca para reintentar` 
      : 'Mantén presionado para hablar'
  }
>
  {connectionError ? (
    <>
      <span className="fab-icon error-icon">⚠️</span>
      <span className="error-text">Reintentar</span>
    </>
  ) : (
    <span className="fab-icon">🎤</span>
  )}
</button>
```

**Estados visuales:**
- 🎤 Normal: Botón de micrófono verde
- ⚠️ Error: Botón rojo con "Reintentar"
- 🔄 Conectando: Botón deshabilitado

## Flujo de Reconexión

### Escenario 1: App Minimizada por Tiempo Prolongado

```
1. Usuario minimiza la app
   ↓
2. Pasa tiempo (conexión se pierde)
   ↓
3. Usuario vuelve a la app
   ↓
4. visibilitychange detecta que volvió
   ↓
5. Verifica conexión: livekitService.getIsConnected()
   ↓
6. Si desconectado: muestra botón de reconexión
   ↓
7. Usuario toca botón "Reintentar"
   ↓
8. handleRetryConnection() reconecta
   ↓
9. Botón vuelve a estado normal 🎤
```

### Escenario 2: Desconexión Durante Uso

```
1. App está abierta y en uso
   ↓
2. Conexión se pierde (red, servidor, etc.)
   ↓
3. Chequeo periódico (cada 10s) detecta desconexión
   ↓
4. Automáticamente muestra botón de reconexión
   ↓
5. Usuario toca "Reintentar"
   ↓
6. Reconecta exitosamente
```

### Escenario 3: Reconexión Automática

```
1. LiveKit se desconecta
   ↓
2. LiveKit se reconecta automáticamente (por su lógica interna)
   ↓
3. Chequeo periódico detecta reconexión
   ↓
4. Actualiza UI automáticamente
   ↓
5. Botón vuelve a estado normal sin intervención del usuario
```

## Logs de Consola

### Cuando vuelve del background:
```
📱 App visible nuevamente - verificando conexión LiveKit...
⚠️ LiveKit desconectado - actualizando estado
```

### Chequeo periódico detecta desconexión:
```
⚠️ LiveKit desconectado detectado en chequeo periódico
```

### Usuario intenta reconectar:
```
🔄 Intentando reconectar a LiveKit...
✅ Reconexión exitosa
```

### Reconexión falla:
```
🔄 Intentando reconectar a LiveKit...
❌ Reconexión fallida
```

## Ventajas de la Implementación

✅ **Triple detección:**
- Al volver del background
- Chequeo periódico cada 10s
- Eventos de LiveKit

✅ **Reconexión manual:**
- Botón visible y claro
- Feedback inmediato al usuario

✅ **Reconexión automática:**
- Si LiveKit se reconecta solo, UI se actualiza

✅ **No bloquea funcionalidad:**
- GPS sigue funcionando
- Mapa sigue actualizándose
- Solo el walkie-talkie se desactiva

✅ **Logs informativos:**
- Fácil debugging
- Usuario puede reportar problemas con contexto

## Casos de Uso

### Caso 1: Inspector en el Campo
- Minimiza app para atender llamada
- Vuelve después de 5 minutos
- App detecta desconexión
- Toca "Reintentar" y vuelve a estar conectado

### Caso 2: Zona con Mala Señal
- Conexión se pierde intermitentemente
- Chequeo periódico detecta desconexión
- Usuario ve botón de reconexión
- Reconecta cuando mejora la señal

### Caso 3: Servidor LiveKit Reinicia
- Todos los inspectores se desconectan
- Cada uno ve botón de reconexión
- Tocan "Reintentar" y vuelven a conectarse

## Configuración

**Intervalo de chequeo periódico:**
```typescript
const connectionCheckInterval = setInterval(() => {
  // ...
}, 10000); // 10 segundos (configurable)
```

**Timeout de reconexión:**
Usa el timeout por defecto de LiveKit (~5 segundos)

## Notas Técnicas

- `livekitService.getIsConnected()` verifica el estado interno de LiveKit
- La reconexión limpia la conexión anterior antes de crear una nueva
- Los event listeners de LiveKit se reconfiguran en cada conexión
- El contador de participantes se actualiza después de reconectar
