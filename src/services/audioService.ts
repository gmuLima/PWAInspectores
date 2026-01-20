class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private _isRecording = false;

  async startRecording(): Promise<boolean> {
    try {
      // Solicitar permiso de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.stream = stream;
      this.audioChunks = [];

      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this._isRecording = true;
      console.log('🎤 Grabando audio...');
      return true;
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      if ((error as any).name === 'NotAllowedError') {
        throw new Error('Permiso de micrófono denegado');
      }
      throw error;
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No hay grabación activa'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });

        // Detener todas las pistas de audio
        this.stream?.getTracks().forEach((track) => track.stop());

        this._isRecording = false;
        console.log('✅ Grabación completada');
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error(`Error grabación: ${event.error}`));
      };

      this.mediaRecorder.stop();
    });
  }

  playAudio(audioBlob: Blob) {
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play().catch((error) => {
        console.error('Error reproduciendo audio:', error);
      });

      // Liberar recurso después de reproducir
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Error al reproducir audio:', error);
    }
  }

  playAudioFromArrayBuffer(buffer: ArrayBuffer) {
    try {
      const audioBlob = new Blob([buffer], { type: 'audio/webm' });
      this.playAudio(audioBlob);
    } catch (error) {
      console.error('Error al reproducir audio desde buffer:', error);
    }
  }

  // Reproducir beep de inicio
  playBeepStart() {
    try {
      const audio = new Audio('/start_talk.wav');
      audio.volume = 0.8;
      audio.play().catch((error) => {
        console.warn('No se pudo reproducir beep-start:', error);
      });
    } catch (error) {
      console.warn('Error reproduciendo beep-start:', error);
    }
  }

  // Reproducir beep de fin
  playBeepEnd() {
    try {
      const audio = new Audio('/end_talk.wav');
      audio.volume = 0.8;
      audio.play().catch((error) => {
        console.warn('No se pudo reproducir beep-end:', error);
      });
    } catch (error) {
      console.warn('Error reproduciendo beep-end:', error);
    }
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg'];

    for (const mimeType of types) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // Si ninguno es soportado, usa el por defecto
    return 'audio/webm';
  }

  isRecording(): boolean {
    return this._isRecording;
  }

  cancelRecording() {
    if (this.mediaRecorder && this._isRecording) {
      this.mediaRecorder.stop();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.audioChunks = [];
      this._isRecording = false;
    }
  }

  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as any });
      return permission.state !== 'denied';
    } catch {
      // Si la API de permissions no está disponible, asume que es soportado
      return true;
    }
  }
}

export default new AudioService();
