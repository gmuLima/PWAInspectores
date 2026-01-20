import { useEffect, useState, useRef } from 'react';
import socketService from '../services/socketService';
import geolocationService from '../services/geolocationService';
import audioService from '../services/audioService';
import type { Inspector } from '../types';

export function useSocket(inspectorName: string, socketUrl: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inspectorName || !socketUrl) return;

    socketService.connect(socketUrl, inspectorName);

    socketService.on('socketConnected', () => {
      setIsConnected(true);
      setError(null);
    });

    socketService.on('socketDisconnected', () => {
      setIsConnected(false);
    });

    socketService.on('socketError', (errorMsg: string) => {
      setError(errorMsg);
    });

    return () => {
      socketService.disconnect();
    };
  }, [inspectorName, socketUrl]);

  return { isConnected, error };
}

export function useGeolocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number; timestamp: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const startTracking = () => {
    geolocationService.startTracking(
      (locationData) => {
        setLocation({ 
          lat: locationData.lat, 
          lng: locationData.lng, 
          accuracy: locationData.accuracy,
          timestamp: locationData.timestamp
        });
      },
      (errorMsg) => {
        setError(errorMsg);
      }
    );
    setIsTracking(true);
  };

  const stopTracking = () => {
    geolocationService.stopTracking();
    setIsTracking(false);
  };

  return { location, error, isTracking, startTracking, stopTracking };
}

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      await audioService.startRecording();
      setIsRecording(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error iniciando grabación:', err);
    }
  };

  const stopRecording = async (): Promise<Blob | null> => {
    try {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      const audioBlob = await audioService.stopRecording();
      setIsRecording(false);
      return audioBlob;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error deteniendo grabación:', err);
      return null;
    }
  };

  const cancelRecording = () => {
    audioService.cancelRecording();
    setIsRecording(false);
    setError(null);
  };

  const cleanup = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    if (isRecording) {
      cancelRecording();
    }
  };

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    cleanup,
  };
}

export function useInspectors() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);

  useEffect(() => {
    socketService.on('usersUpdated', (users: any[]) => {
      const updatedInspectors = users.map((user) => ({
        id: user.id,
        name: user.name,
        lat: user.lat,
        lng: user.lng,
        lastUpdate: Date.now(),
        isOnline: true,
      }));
      setInspectors(updatedInspectors);
    });

    return () => {
      socketService.off('usersUpdated', () => {});
    };
  }, []);

  return inspectors;
}
