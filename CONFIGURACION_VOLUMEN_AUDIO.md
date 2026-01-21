# Configuración de Volumen de Audio

## Resumen
Se implementó amplificación de audio usando Web Audio API para aumentar el volumen de las voces recibidas más allá del 100%.

## Implementación

### Constante de Configuración

**Ubicación:** `src/services/livekitService.ts` (línea ~18)

```typescript
// CONFIGURACIÓN DE VOLUMEN
// Ajusta este valor para cambiar el volumen de las voces recibidas
// Valores recomendados:
// - 1.0 = 100% (volumen normal)
// - 1.5 = 150% (50% más fuerte)
// - 2.0 = 200% (doble de volumen) ← ACTUAL
// - 3.0 = 300% (triple de volumen)
// NOTA: Valores muy altos (>3.0) pueden causar distorsión
const AUDIO_GAIN_MULTIPLIER = 2.0;
```

### Cómo Funciona

1. **Volumen Base**: Se establece en `1.0` (100%) en el elemento HTML
2. **Web Audio API**: Se usa un `GainNode` para amplificar más allá del 100%
3. **Multiplicador**: El valor `AUDIO_GAIN_MULTIPLIER` controla la amplificación

### Código Implementado

```typescript
this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
  if (track.kind === Track.Kind.Audio) {
    const audioElement = track.attach();
    
    // Volumen base al máximo
    audioElement.volume = 1.0;
    
    // Amplificar usando Web Audio API
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audioElement);
      const gainNode = audioContext.createGain();
      
      // Aplicar multiplicador configurado
      gainNode.gain.value = AUDIO_GAIN_MULTIPLIER; // 2.0 = 200%
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      console.log(`🔊 Audio amplificado a ${AUDIO_GAIN_MULTIPLIER * 100}%`);
    } catch (error) {
      console.warn('⚠️ Web Audio API no disponible, usando volumen estándar');
    }
    
    audioElement.play();
  }
});
```

## Cómo Ajustar el Volumen

### Opción 1: Editar la Constante (Recomendado)

Abre `src/services/livekitService.ts` y cambia el valor:

```typescript
// Para volumen más bajo (150%)
const AUDIO_GAIN_MULTIPLIER = 1.5;

// Para volumen actual (200%)
const AUDIO_GAIN_MULTIPLIER = 2.0;

// Para volumen más alto (300%)
const AUDIO_GAIN_MULTIPLIER = 3.0;
```

Después de cambiar:
```bash
npm run build
```

### Opción 2: Valores Recomendados por Escenario

| Escenario | Valor | Descripción |
|-----------|-------|-------------|
| **Ambiente silencioso** | 1.0 - 1.5 | Oficina, interior |
| **Ambiente normal** | 1.5 - 2.0 | Calle tranquila |
| **Ambiente ruidoso** | 2.0 - 2.5 | Tráfico, construcción |
| **Ambiente muy ruidoso** | 2.5 - 3.0 | Eventos, multitudes |
| **Máximo (con riesgo)** | 3.0+ | Puede distorsionar |

## Ventajas de Web Audio API

✅ **Amplificación real**: No solo ajusta el volumen del dispositivo
✅ **Sin límite de 100%**: Puede amplificar 2x, 3x o más
✅ **Control granular**: Ajuste preciso del nivel de ganancia
✅ **Fallback automático**: Si no está disponible, usa volumen estándar

## Limitaciones

⚠️ **Distorsión**: Valores muy altos (>3.0) pueden distorsionar el audio
⚠️ **Calidad de entrada**: Si el audio original es bajo, amplificar puede agregar ruido
⚠️ **Compatibilidad**: Web Audio API está disponible en navegadores modernos (Chrome 35+, Firefox 25+, Safari 14.1+)

## Logs de Consola

Cuando se recibe audio de otro participante:

```
🔊 Track recibido de: inspector-123
🔊 Audio amplificado a 200% del volumen
```

Si Web Audio API no está disponible:

```
🔊 Track recibido de: inspector-123
⚠️ Web Audio API no disponible, usando volumen estándar
```

## Pruebas Recomendadas

1. **Prueba con valor 1.5** (150%):
   - Cambiar `AUDIO_GAIN_MULTIPLIER = 1.5`
   - Rebuild y probar
   - Verificar si es suficiente

2. **Prueba con valor 2.0** (200%) - ACTUAL:
   - Ya está configurado
   - Probar en ambiente ruidoso
   - Verificar que no distorsione

3. **Prueba con valor 2.5** (250%):
   - Solo si 2.0 no es suficiente
   - Verificar distorsión
   - Ajustar según necesidad

## Alternativas Adicionales

### Opción A: Control Dinámico de Volumen

Si quieres que el usuario pueda ajustar el volumen desde la UI:

```typescript
// Agregar slider en UI
<input 
  type="range" 
  min="1.0" 
  max="3.0" 
  step="0.1" 
  value={volumeMultiplier}
  onChange={(e) => setVolumeMultiplier(parseFloat(e.target.value))}
/>
```

### Opción B: Ajuste Automático por Ambiente

Usar la API de nivel de ruido ambiente para ajustar automáticamente:

```typescript
// Detectar nivel de ruido y ajustar ganancia
if (ambientNoiseLevel > 70) {
  gainNode.gain.value = 3.0; // Ambiente muy ruidoso
} else if (ambientNoiseLevel > 50) {
  gainNode.gain.value = 2.0; // Ambiente ruidoso
} else {
  gainNode.gain.value = 1.5; // Ambiente normal
}
```

## Configuración Actual

**Volumen configurado:** 200% (2.0x)

Este valor es un buen balance entre:
- ✅ Suficientemente alto para ambientes ruidosos
- ✅ No causa distorsión en la mayoría de casos
- ✅ Permite escuchar claramente en la calle

Si necesitas ajustarlo, simplemente cambia `AUDIO_GAIN_MULTIPLIER` y rebuild.

## Comandos Útiles

```bash
# Rebuild después de cambiar el volumen
npm run build

# Ver logs en consola del navegador
# Buscar: "🔊 Audio amplificado a X%"

# Probar en diferentes dispositivos
# El volumen puede variar según el hardware
```

## Notas Importantes

1. **El volumen del dispositivo también importa**: Asegúrate de que el volumen del teléfono/tablet esté alto
2. **Auriculares vs Altavoz**: El volumen puede sonar diferente
3. **Calidad del micrófono**: Si el que habla tiene micrófono de baja calidad, amplificar no mejorará mucho
4. **Prueba en campo**: Lo ideal es probar con inspectores reales en ambiente de trabajo

## Soporte

Si el volumen sigue siendo bajo después de ajustar a 3.0:
1. Verificar volumen del dispositivo
2. Verificar que Web Audio API esté funcionando (ver logs)
3. Verificar calidad del micrófono del emisor
4. Considerar usar auriculares con amplificación
