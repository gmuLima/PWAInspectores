/**
 * Servicio de LiveKit para Walkie-Talkie
 * Maneja conexión a sala de audio y push-to-talk
 */

import {
  Room,
  RoomEvent,
  Track,
  LocalTrack,
  createLocalAudioTrack,
  ConnectionState,
} from 'livekit-client';
import httpClient from './httpClient';
import { API_CONFIG } from '../config/api';
import beepSound from '../utils/beepSound';

// CONFIGURACIÓN DE VOLUMEN
// Ajusta este valor para cambiar el volumen de las voces recibidas
// Valores recomendados:
// - 1.0 = 100% (volumen normal)
// - 1.5 = 150% (50% más fuerte)
// - 2.0 = 200% (doble de volumen)
// - 3.0 = 300% (triple de volumen)
// NOTA: Valores muy altos (>3.0) pueden causar distorsión
const AUDIO_GAIN_MULTIPLIER = 2.0;

export interface LiveKitTokenResponse {
  token: string;
  server_url: string;
  room: string;
  participant_identity: string;
  inspector_name: string;
}

class LiveKitService {
  private room: Room | null = null;
  private localAudioTrack: LocalTrack | null = null;
  private isConnected: boolean = false;
  private isMicrophoneEnabled: boolean = false;
  private onParticipantCountChange: ((count: number) => void) | null = null;
  private onSpeakerChange: ((speakerName: string | null) => void) | null = null;
  private isStartingTalking: boolean = false; // Flag para operación pendiente
  private shouldStopAfterStart: boolean = false; // Flag para detener después de iniciar

  /**
   * Registrar callback para cambios en número de participantes
   */
  setOnParticipantCountChange(callback: (count: number) => void) {
    this.onParticipantCountChange = callback;
  }

  /**
   * Registrar callback para cambios de speaker (quién está hablando)
   */
  setOnSpeakerChange(callback: (speakerName: string | null) => void) {
    this.onSpeakerChange = callback;
  }

  /**
   * Obtener token de LiveKit desde el backend
   */
  async getToken(inspectorId: string): Promise<LiveKitTokenResponse> {
    try {
      console.log('📡 Enviando request para token:', { inspector_id: inspectorId });
      const response = await httpClient.post<LiveKitTokenResponse>(
        '/apk/livekit/token',
        { inspector_id: inspectorId },
        API_CONFIG.MAIN_API
      );
      console.log('📡 Respuesta del backend:', response);
      
      if (!response) {
        throw new Error('Respuesta vacía del backend');
      }
      
      // El backend devuelve los datos directamente, no envueltos en {data: ...}
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo token:', error);
      throw error;
    }
  }

  /**
   * Conectar a la sala de LiveKit
   */
  async connect(inspectorId: string): Promise<boolean> {
    try {
      console.log('🎙️ Conectando a LiveKit...');

      // Solicitar permiso de micrófono anticipadamente
      console.log('🎤 Solicitando permiso de micrófono...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Detener el stream inmediatamente, solo necesitamos el permiso
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Permiso de micrófono concedido');
      } catch (permError) {
        console.error('❌ Permiso de micrófono denegado:', permError);
        throw new Error('Se requiere permiso de micrófono para usar el walkie-talkie');
      }

      // Obtener token del backend
      console.log('🔑 Solicitando token al backend...');
      try {
        const tokenData = await this.getToken(inspectorId);
        
        if (!tokenData) {
          throw new Error('Token data es undefined');
        }
        
        console.log('✅ Token LiveKit obtenido:', {
          room: tokenData.room,
          server: tokenData.server_url,
          identity: tokenData.participant_identity
        });

        // Crear instancia de Room
        console.log('📦 Creando instancia de Room...');
        this.room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Configurar event listeners
        this.setupEventListeners();

        // Conectar a la sala SIN auto-publicar
        console.log('🔌 Conectando al servidor LiveKit...');
        await this.room.connect(tokenData.server_url, tokenData.token, {
          autoSubscribe: true, // Sí queremos recibir audio de otros
        });
        console.log('✅ Conectado a sala:', tokenData.room);
        console.log('🔇 Micrófono en modo PTT - presiona el botón para hablar');

        this.isConnected = true;
        return true;
      } catch (tokenError) {
        console.error('❌ Error obteniendo token o conectando:', tokenError);
        throw tokenError;
      }
    } catch (error) {
      console.error('❌ Error fatal conectando a LiveKit:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Configurar event listeners de la sala
   */
  private setupEventListeners() {
    if (!this.room) return;

    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log('🔄 Estado de conexión:', state);
      this.isConnected = state === ConnectionState.Connected;
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      console.log('🔊 Track recibido de:', participant.identity);
      
      // Auto-reproducir audio de otros participantes
      if (track.kind === Track.Kind.Audio) {
        const audioElement = track.attach();
        // Configurar audio para background playback
        audioElement.setAttribute('playsinline', 'true');
        audioElement.setAttribute('webkit-playsinline', 'true');
        
        // Aumentar volumen al máximo (1.0 = 100%)
        audioElement.volume = 1.0;
        
        // Amplificar audio más allá del 100% usando Web Audio API
        try {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaElementSource(audioElement);
          const gainNode = audioContext.createGain();
          
          // Aplicar multiplicador de ganancia configurado
          gainNode.gain.value = AUDIO_GAIN_MULTIPLIER;
          
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          console.log(`🔊 Audio amplificado a ${AUDIO_GAIN_MULTIPLIER * 100}% del volumen`);
        } catch (audioApiError) {
          console.warn('⚠️ Web Audio API no disponible, usando volumen estándar:', audioApiError);
        }
        
        audioElement.play().catch(err => {
          console.error('❌ Error reproduciendo audio:', err);
          // Reintentar reproducción después de interacción del usuario
          setTimeout(() => audioElement.play().catch(console.error), 1000);
        });
      }
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach();
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('📴 Desconectado de LiveKit');
      this.isConnected = false;
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('👤 Participante conectado:', participant.identity);
      if (this.onParticipantCountChange) {
        this.onParticipantCountChange(this.getParticipantCount());
      }
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('👤 Participante desconectado:', participant.identity);
      if (this.onParticipantCountChange) {
        this.onParticipantCountChange(this.getParticipantCount());
      }
    });

    // Detectar cuando alguien publica audio (empieza a hablar)
    this.room.on(RoomEvent.TrackPublished, (_publication, participant) => {
      if (_publication.kind === Track.Kind.Audio) {
        // Usar el nombre del participante (name) en lugar del ID (identity)
        const speakerName = participant.name || participant.identity;
        console.log('🎤 Hablando:', speakerName, '(ID:', participant.identity, ')');
        
        // Reproducir beep de inicio para participantes remotos
        console.log('📢 Reproduciendo beep de inicio para participante remoto');
        beepSound.playStartBeep();
        
        if (this.onSpeakerChange) {
          this.onSpeakerChange(speakerName);
        }
      }
    });

    // Detectar cuando alguien deja de publicar audio (deja de hablar)
    this.room.on(RoomEvent.TrackUnpublished, (_publication, participant) => {
      if (_publication.kind === Track.Kind.Audio && participant.identity) {
        console.log('🔇 Dejó de hablar:', participant.identity);
        
        // Reproducir beep de fin para participantes remotos
        console.log('📢 Reproduciendo beep de fin para participante remoto');
        beepSound.playEndBeep();
        
        if (this.onSpeakerChange) {
          this.onSpeakerChange(null);
        }
      }
    });
  }

  /**
   * Iniciar transmisión de audio (Push-to-Talk)
   */
  async startTalking(): Promise<boolean> {
    if (!this.room || !this.isConnected) {
      console.warn('⚠️ No conectado a LiveKit');
      return false;
    }

    // Si ya está transmitiendo, no hacer nada
    if (this.localAudioTrack) {
      console.warn('⚠️ Ya está transmitiendo - ignorando llamada duplicada');
      return true;
    }

    // Si ya hay una operación en progreso, no iniciar otra
    if (this.isStartingTalking) {
      console.warn('⚠️ Ya hay una operación de inicio en progreso');
      return false;
    }

    try {
      this.isStartingTalking = true;
      this.shouldStopAfterStart = false;
      
      console.log('🎤 Iniciando transmisión PTT...');

      // Crear track de audio local SOLO cuando se presiona el botón
      this.localAudioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      console.log('🎤 Track de audio creado');
      
      // Verificar si se llamó stop mientras se creaba el track
      if (this.shouldStopAfterStart) {
        console.log('🔇 Se solicitó detener durante la creación - limpiando');
        this.localAudioTrack.stop();
        this.localAudioTrack = null;
        this.isStartingTalking = false;
        return false;
      }

      // Publicar el track
      await this.room.localParticipant.publishTrack(this.localAudioTrack);
      this.isMicrophoneEnabled = true;
      this.isStartingTalking = false;

      console.log('✅ Transmitiendo audio (PTT ACTIVO)');
      
      // Notificar que el usuario local está hablando
      if (this.onSpeakerChange) {
        this.onSpeakerChange('Tú');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error iniciando transmisión:', error);
      this.isStartingTalking = false;
      // Limpieza completa en caso de error
      if (this.localAudioTrack) {
        try {
          this.localAudioTrack.stop();
        } catch (stopError) {
          console.error('Error deteniendo track:', stopError);
        }
        this.localAudioTrack = null;
      }
      this.isMicrophoneEnabled = false;
      return false;
    }
  }

  /**
   * Detener transmisión de audio
   */
  async stopTalking(): Promise<void> {
    console.log('🔇 stopTalking() llamado, estado actual:', {
      hasRoom: !!this.room,
      hasTrack: !!this.localAudioTrack,
      isMicEnabled: this.isMicrophoneEnabled,
      isStarting: this.isStartingTalking
    });

    // Si hay una operación de inicio en progreso, marcar para detener después
    if (this.isStartingTalking) {
      console.log('🚨 Operación de inicio en progreso - marcando para detener');
      this.shouldStopAfterStart = true;
      return;
    }

    if (!this.room) {
      console.warn('⚠️ No hay sala activa');
      return;
    }

    if (!this.localAudioTrack) {
      console.warn('⚠️ No hay track para detener');
      return;
    }

    try {
      console.log('🔇 Deteniendo transmisión PTT...');

      // Guardar referencia antes de limpiar
      const trackToStop = this.localAudioTrack;
      
      // Limpiar estado primero para evitar race conditions
      this.localAudioTrack = null;
      this.isMicrophoneEnabled = false;

      // Despublicar el track
      await this.room.localParticipant.unpublishTrack(trackToStop);
      
      // Detener el track completamente
      trackToStop.stop();

      console.log('✅ Transmisión detenida (PTT INACTIVO)');
      
      // Notificar que dejó de hablar
      if (this.onSpeakerChange) {
        this.onSpeakerChange(null);
      }
    } catch (error) {
      console.error('❌ Error deteniendo transmisión:', error);
      // Asegurar limpieza incluso si hay error
      if (this.localAudioTrack) {
        try {
          this.localAudioTrack.stop();
        } catch (stopError) {
          console.error('Error deteniendo track en catch:', stopError);
        }
        this.localAudioTrack = null;
      }
      this.isMicrophoneEnabled = false;
      
      // Asegurar que se notifique que dejó de hablar
      if (this.onSpeakerChange) {
        this.onSpeakerChange(null);
      }
    }
  }

  /**
   * Desconectar de la sala
   */
  async disconnect(): Promise<void> {
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }

    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }

    this.isConnected = false;
    this.isMicrophoneEnabled = false;
    console.log('📴 Desconectado de LiveKit');
  }

  /**
   * Verificar si está conectado
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Verificar si está transmitiendo actualmente
   */
  getIsTalking(): boolean {
    return !!this.localAudioTrack || this.isStartingTalking;
  }

  /**
   * Obtener número de participantes en la sala
   */
  getParticipantCount(): number {
    if (!this.room) return 0;
    return this.room.remoteParticipants.size + 1; // +1 por el participante local
  }
}

export default new LiveKitService();
