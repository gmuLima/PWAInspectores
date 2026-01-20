import { useEffect, useRef } from 'react';
import './ControlPanel.css';

interface ControlPanelProps {
  isTracking: boolean;
  isRecording: boolean;
  isConnected: boolean;
  locationError: string | null;
  audioError: string | null;
  recordingTime: number;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  inspectorName: string;
}

export function ControlPanel({
  isTracking,
  isRecording,
  isConnected,
  locationError,
  audioError,
  recordingTime,
  onStartTracking,
  onStopTracking,
  onStartRecording,
  onStopRecording,
  inspectorName,
}: ControlPanelProps) {
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        // El componente se re-renderiza automáticamente
      }, 100);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="control-panel">
      {/* Información del inspector */}
      <div className="inspector-info">
        <div className="info-item">
          <span className="label">Inspector:</span>
          <span className="value">{inspectorName}</span>
        </div>

        <div className="info-item">
          <span className="label">Conexión:</span>
          <span className={`status ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </span>
        </div>
      </div>

      {/* Errores */}
      {(locationError || audioError) && (
        <div className="error-banner">
          {locationError && <p>📍 {locationError}</p>}
          {audioError && <p>🎤 {audioError}</p>}
        </div>
      )}

      {/* Botones de control */}
      <div className="button-group">
        {/* Botón de geolocalización */}
        <button
          className={`control-btn tracking-btn ${isTracking ? 'active' : ''}`}
          onClick={isTracking ? onStopTracking : onStartTracking}
          disabled={!isConnected}
        >
          {isTracking ? (
            <>
              <span className="icon">📍</span>
              <span className="text">Seguimiento activo</span>
            </>
          ) : (
            <>
              <span className="icon">📍</span>
              <span className="text">Iniciar seguimiento</span>
            </>
          )}
        </button>

        {/* Botón de voz */}
        <button
          className={`control-btn voice-btn ${isRecording ? 'recording' : ''}`}
          onMouseDown={onStartRecording}
          onMouseUp={onStopRecording}
          onTouchStart={onStartRecording}
          onTouchEnd={onStopRecording}
          disabled={!isConnected || !isTracking}
          title="Mantén presionado para grabar"
        >
          {isRecording ? (
            <>
              <span className="icon recording-icon">🎤</span>
              <span className="text recording-time">{formatTime(recordingTime)}</span>
            </>
          ) : (
            <>
              <span className="icon">🎤</span>
              <span className="text">Hablar</span>
            </>
          )}
        </button>
      </div>

      {/* Indicador de grabación */}
      {isRecording && (
        <div className="recording-indicator">
          <div className="dot"></div>
          <span>Grabando...</span>
          <div className="dot"></div>
        </div>
      )}

      {/* Info de uso */}
      <div className="usage-info">
        <p>💡 Mantén presionado el botón "Hablar" para grabar mensajes de voz</p>
        <p>🗺️ Necesitas iniciar el seguimiento para usar la aplicación</p>
      </div>
    </div>
  );
}
