import { useEffect, useState } from 'react';
import './SpeakingIndicator.css';

interface SpeakingIndicatorProps {
  speakerName: string | null;
}

export const SpeakingIndicator = ({ speakerName }: SpeakingIndicatorProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (speakerName) {
      setIsVisible(true);
    } else {
      // Pequeño delay antes de ocultar para suavizar la transición
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [speakerName]);

  if (!isVisible) return null;

  return (
    <div className="speaking-indicator-overlay">
      <div className="speaking-indicator">
        <div className="speaking-avatar">
          <div className="avatar-circle">
            <span className="avatar-icon">🎤</span>
          </div>
          <div className="pulse-ring"></div>
          <div className="pulse-ring pulse-ring-delay"></div>
        </div>
        <div className="speaking-name">{speakerName}</div>
        <div className="speaking-label">Hablando...</div>
      </div>
    </div>
  );
};
