import { useState } from 'react';
import { InspectorModal } from './InspectorModal';
import './Header.css';

interface HeaderProps {
  inspectorName: string;
  location: { lat: number; lng: number; accuracy: number; timestamp: number } | null;
  isTracking: boolean;
  isConnected: boolean;
  onLogout: () => void;
  inspectorData?: any; // Datos completos del inspector
  hasActiveAssignment?: boolean;
}

export const Header = (props: HeaderProps) => {
  const { inspectorName, location, isTracking, isConnected, onLogout, inspectorData, hasActiveAssignment } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="header-floating">
        <div className="header-content">
          <div className="header-left">
            <div className="inspector-avatar">
              <span className="avatar-icon">👮</span>
            </div>
            <div className="inspector-info">
              <h3 className="inspector-name">{inspectorName}</h3>
              <p className="inspector-title">Inspector de Campo</p>
              <div className="inspector-status">
                <span className="status-indicator">
                  {isConnected ? '🟢' : '🔴'}
                </span>
                {isTracking ? (
                  <>
                    <span className="status-text">Ubicación activa</span>
                    {location && (
                      <span className="coordinates">
                        Lat: {location.lat.toFixed(4)} | Lon: {location.lng.toFixed(4)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="status-text">Rastreo inactivo</span>
                )}
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="header-btn profile-btn"
              onClick={() => setIsModalOpen(true)}
              title="Ver perfil"
            >
              👤
            </button>
            <button
              className="header-btn logout-btn"
              onClick={onLogout}
              disabled={hasActiveAssignment}
              title={hasActiveAssignment ? "No puedes cerrar sesión con una asignación activa" : "Cerrar sesión"}
              style={{
                opacity: hasActiveAssignment ? 0.5 : 1,
                cursor: hasActiveAssignment ? 'not-allowed' : 'pointer'
              }}
            >
              <img 
                src="/cerrar-sesion.png" 
                alt="Cerrar sesión"
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  filter: 'invert(1) brightness(2)',
                  display: 'block'
                }}
              />
            </button>
          </div>
        </div>
      </div>

      <InspectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inspectorName={inspectorName}
        location={location}
        isActive={isConnected}
        inspectorType={inspectorData?.type as 'punto_fijo' | 'motorizado' | 'bicicleta' | 'operaciones' | 'supervisor' | 'general' | undefined}
        dni={inspectorData?.dni}
        zone={inspectorData?.currentZone || inspectorData?.zone_name || 'Sin asignación'}
        email={inspectorData?.email}
        phone={inspectorData?.phone}
      />
    </>
  );
}
