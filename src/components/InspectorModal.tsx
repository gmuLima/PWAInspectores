import { useState } from 'react';
import './InspectorModal.css';

interface InspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectorName: string;
  location: { lat: number; lng: number; accuracy: number; timestamp: number } | null;
  isActive: boolean;
  inspectorType?: 'punto_fijo' | 'motorizado' | 'bicicleta' | 'operaciones' | 'supervisor' | 'general';
  dni?: string;
  zone?: string;
  email?: string;
  phone?: string;
}

export function InspectorModal({
  isOpen,
  onClose,
  inspectorName,
  location,
  isActive,
  inspectorType,
  dni,
  zone,
}: InspectorModalProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isOpen) return null;

  // Log para debug
  console.log('🔍 InspectorModal - inspectorType recibido:', inspectorType, 'typeof:', typeof inspectorType);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }) + ' ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="inspector-modal-overlay" onClick={onClose}>
      <div className="inspector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Perfil del Inspector</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {/* Avatar y nombre */}
          <div className="inspector-avatar-section">
            <div className="avatar-large">👮</div>
            <h3 className="inspector-name-large">{inspectorName}</h3>
            <div className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
              <span className="status-dot"></span>
              {isActive ? 'En línea' : 'Desconectado'}
            </div>
          </div>

          {/* Información básica */}
          <div className="modal-section">
            <h4 className="section-title">Información Básica</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">DNI:</span>
                <span className="info-value">{dni || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tipo de Inspector:</span>
                <span className="info-value">
                  {(() => {
                    const type = inspectorType?.trim().toLowerCase();
                    console.log('🔍 Tipo procesado:', type);
                    if (type === 'motorizado') return '🏍️ Motorizado';
                    if (type === 'punto_fijo') return '🚗 Punto Fijo';
                    if (type === 'bicicleta') return '🚴 Bicicleta';
                    if (type === 'operaciones') return '👔 Operaciones';
                    if (type === 'supervisor') return '👨‍💼 Supervisor';
                    if (type === 'general') return '👮 General';
                    return `N/A (${inspectorType})`;
                  })()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Zona Asignada:</span>
                <span className="info-value">{zone || 'Sin asignación'}</span>
              </div>

            </div>
          </div>

          {/* Contacto - COMENTADO: Pendiente datos del API */}
          {/* 
          <div className="modal-section">
            <h4 className="section-title">Contacto</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value email">{email || 'No registrado'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Celular:</span>
                <span className="info-value phone">{phone || 'No registrado'}</span>
              </div>
            </div>
          </div>
          */}

          {/* Última ubicación */}
          {location && (
            <div className="modal-section">
              <button
                className="section-toggle"
                onClick={() => setExpanded(!expanded)}
              >
                <h4 className="section-title" style={{ margin: 0 }}>
                  Última Ubicación
                </h4>
                <span className="toggle-icon">{expanded ? '▼' : '▶'}</span>
              </button>
              {expanded && (
                <div className="location-details">
                  <div className="info-item">
                    <span className="info-label">Latitud:</span>
                    <span className="info-value">{location.lat.toFixed(6)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Longitud:</span>
                    <span className="info-value">{location.lng.toFixed(6)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Precisión:</span>
                    <span className="info-value">{location.accuracy.toFixed(0)}m</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Fecha/Hora:</span>
                    <span className="info-value">{formatDate(location.timestamp)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn-close" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
