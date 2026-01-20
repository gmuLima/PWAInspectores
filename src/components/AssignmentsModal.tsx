import './AssignmentsModal.css';

interface AssignmentItem {
  assignment: {
    id: string;
    start_time: string;
    end_time: string | null;
    status: string;
    is_active: boolean;
  };
  inspector: {
    id: string;
    name: string;
  };
  zone: {
    id: string;
    name: string;
    type: string;
  };
}

interface AssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: AssignmentItem[];
}

export function AssignmentsModal({ isOpen, onClose, assignments }: AssignmentsModalProps) {
  if (!isOpen) return null;

  const activeAssignments = assignments.filter((a) => a.assignment.status === 'active');
  const scheduledAssignments = assignments.filter((a) => a.assignment.status !== 'active');

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="status-badge-assignment active">🟢 Activa</span>;
      case 'scheduled':
        return <span className="status-badge-assignment scheduled">🔵 Programada</span>;
      case 'completed':
        return <span className="status-badge-assignment completed">✅ Completada</span>;
      default:
        return <span className="status-badge-assignment">{status}</span>;
    }
  };

  return (
    <div className="assignments-modal-overlay" onClick={onClose}>
      <div className="assignments-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📋 Mis Asignaciones</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {assignments.length === 0 ? (
            <div className="empty-state">
              <p>📭 No tienes asignaciones para hoy</p>
            </div>
          ) : (
            <>
              {/* Asignaciones activas */}
              {activeAssignments.length > 0 && (
                <div className="assignments-section">
                  <h3 className="section-title">🟢 Asignación Activa</h3>
                  {activeAssignments.map((item) => (
                    <div key={item.assignment.id} className="assignment-card active">
                      <div className="assignment-header">
                        <span className="zone-name">📍 {item.zone.name}</span>
                        {getStatusBadge(item.assignment.status)}
                      </div>
                      <div className="assignment-details">
                        <div className="detail-row">
                          <span className="detail-label">Tipo de Zona:</span>
                          <span className="detail-value">{item.zone.type}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Inicio:</span>
                          <span className="detail-value">
                            {formatDate(item.assignment.start_time)} - {formatTime(item.assignment.start_time)}
                          </span>
                        </div>
                        {item.assignment.end_time && (
                          <div className="detail-row">
                            <span className="detail-label">Fin programado:</span>
                            <span className="detail-value">
                              {formatTime(item.assignment.end_time)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Asignaciones programadas */}
              {scheduledAssignments.length > 0 && (
                <div className="assignments-section">
                  <h3 className="section-title">🔵 Asignaciones Programadas</h3>
                  {scheduledAssignments.map((item) => (
                    <div key={item.assignment.id} className="assignment-card scheduled">
                      <div className="assignment-header">
                        <span className="zone-name">📍 {item.zone.name}</span>
                        {getStatusBadge(item.assignment.status)}
                      </div>
                      <div className="assignment-details">
                        <div className="detail-row">
                          <span className="detail-label">Tipo de Zona:</span>
                          <span className="detail-value">{item.zone.type}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Inicio programado:</span>
                          <span className="detail-value">
                            {formatDate(item.assignment.start_time)} - {formatTime(item.assignment.start_time)}
                          </span>
                        </div>
                        {item.assignment.end_time && (
                          <div className="detail-row">
                            <span className="detail-label">Fin programado:</span>
                            <span className="detail-value">
                              {formatTime(item.assignment.end_time)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
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
