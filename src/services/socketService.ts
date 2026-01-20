import io, { Socket } from 'socket.io-client';
import type { SocketUser } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(serverUrl: string, inspectorName: string) {
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado:', this.socket?.id);
      this.emit('join', {
        name: inspectorName,
        id: this.generateId(),
      });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket desconectado');
      this.emit('socketDisconnected', null);
    });

    this.socket.on('error', (error) => {
      console.error('Error Socket:', error);
      this.emit('socketError', error);
    });

    // Escuchar lista de usuarios
    this.socket.on('users', (users: SocketUser[]) => {
      this.emit('usersUpdated', users);
    });

    // Escuchar eventos de localización
    this.socket.on('location', (data: any) => {
      this.emit('locationUpdated', data);
    });

    // Escuchar audio
    this.socket.on('voice', (data: any) => {
      this.emit('voiceReceived', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  sendLocation(lat: number, lng: number, accuracy: number) {
    if (this.socket?.connected) {
      this.socket.emit('location', {
        lat,
        lng,
        accuracy,
        timestamp: Date.now(),
      });
    }
  }

  sendVoice(audioBlob: Blob) {
    if (this.socket?.connected) {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.socket?.emit('voice', {
          audio: event.target?.result,
          timestamp: Date.now(),
        });
      };
      reader.readAsArrayBuffer(audioBlob);
    }
  }

  // Enviar evento de beep al iniciar grabación
  sendBeepStart() {
    if (this.socket?.connected) {
      this.socket.emit('beepStart', {
        timestamp: Date.now(),
      });
    }
  }

  // Enviar evento de beep al terminar grabación
  sendBeepEnd() {
    if (this.socket?.connected) {
      this.socket.emit('beepEnd', {
        timestamp: Date.now(),
      });
    }
  }  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  private generateId(): string {
    return `inspector_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default new SocketService();
