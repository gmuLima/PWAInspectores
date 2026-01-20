/**
 * Utilidad para reproducir sonidos de beep para walkie-talkie
 */

class BeepSound {
  private startAudio: HTMLAudioElement;
  private endAudio: HTMLAudioElement;

  constructor() {
    // Precargar archivos de audio
    this.startAudio = new Audio('/start_talk.wav');
    this.endAudio = new Audio('/end_talk.wav');
    
    // Configurar volumen
    this.startAudio.volume = 0.5;
    this.endAudio.volume = 0.5;
  }

  /**
   * Reproducir beep de inicio
   */
  playStartBeep(): void {
    try {
      // Reiniciar si ya se estaba reproduciendo
      this.startAudio.currentTime = 0;
      this.startAudio.play().catch(error => {
        console.warn('⚠️ Error reproduciendo beep de inicio:', error);
      });
    } catch (error) {
      console.warn('⚠️ Error reproduciendo beep:', error);
    }
  }

  /**
   * Reproducir beep de fin
   */
  playEndBeep(): void {
    try {
      // Reiniciar si ya se estaba reproduciendo
      this.endAudio.currentTime = 0;
      this.endAudio.play().catch(error => {
        console.warn('⚠️ Error reproduciendo beep de fin:', error);
      });
    } catch (error) {
      console.warn('⚠️ Error reproduciendo beep:', error);
    }
  }

  /**
   * Reproducir beep doble (para confirmación)
   */
  playDoubleBeep(): void {
    this.playStartBeep();
    setTimeout(() => this.playStartBeep(), 150);
  }
}

export default new BeepSound();
