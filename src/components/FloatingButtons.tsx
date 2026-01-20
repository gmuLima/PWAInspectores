import { useEffect, useRef } from 'react';
import './FloatingButtons.css';

interface FloatingButtonsProps {
  isRecording: boolean;
  isTracking: boolean;
  recordingTime: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCenterMap: () => void;
  isConnected: boolean;
  participantCount: number;
  onOpenAssignments: () => void;
}

export function FloatingButtons({
  isRecording,
  isTracking,
  recordingTime,
  onStartRecording,
  onStopRecording,
  onCenterMap,
  isConnected,
  participantCount,
  onOpenAssignments,
}: FloatingButtonsProps) {
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {}, 100);
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
    <div className="floating-buttons">
      {/* Contador de participantes conectados */}
      {isConnected && participantCount > 0 && (
        <div className="participant-counter">
          <span className="counter-icon">📻</span>
          <span className="counter-text">{participantCount}</span>
        </div>
      )}

      {/* Botón de micrófono (Walkie-Talkie) */}
      <button
        className={`fab fab-primary ${isRecording ? 'recording' : ''}`}
        onMouseDown={isConnected ? onStartRecording : undefined}
        onMouseUp={isConnected ? onStopRecording : undefined}
        onMouseLeave={isConnected && isRecording ? onStopRecording : undefined}
        onTouchStart={isConnected ? onStartRecording : undefined}
        onTouchEnd={isConnected ? onStopRecording : undefined}
        onTouchCancel={isConnected && isRecording ? onStopRecording : undefined}
        disabled={!isConnected}
        title={isConnected ? 'Mantén presionado para hablar' : 'Conectando a radio...'}
      >
        {isRecording ? (
          <>
            <span className="fab-icon recording-icon">🎤</span>
            <span className="recording-time">{formatTime(recordingTime)}</span>
          </>
        ) : (
          <span className="fab-icon">🎤</span>
        )}
      </button>

      {/* Botón de centrar ubicación */}
      <button
        className="fab fab-secondary"
        onClick={onCenterMap}
        disabled={!isTracking}
        title="Centrar mapa en mi ubicación"
      >
        📍
      </button>

      {/* Botón de asignaciones */}
      <button
        className="fab fab-secondary"
        onClick={onOpenAssignments}
        title="Ver asignaciones"
      >
        📋
      </button>

      {/* Indicador de grabación */}
      {isRecording && (
        <div className="recording-pulse">
          <div className="pulse-dot"></div>
          <span className="pulse-text">Grabando...</span>
        </div>
      )}
    </div>
  );
}
