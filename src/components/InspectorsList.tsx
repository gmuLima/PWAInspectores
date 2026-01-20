import type { Inspector } from '../types';
import './InspectorsList.css';

interface InspectorsListProps {
  inspectors: Inspector[];
  currentInspectorId: string;
}

export function InspectorsList({ inspectors, currentInspectorId }: InspectorsListProps) {
  return (
    <div className="inspectors-list">
      <div className="list-header">
        <h3>Inspectores conectados</h3>
        <span className="badge">{inspectors.length}</span>
      </div>

      <div className="list-content">
        {inspectors.length === 0 ? (
          <p className="empty-state">Sin inspectores conectados</p>
        ) : (
          <ul>
            {inspectors.map((inspector) => (
              <li
                key={inspector.id}
                className={`inspector-item ${
                  inspector.id === currentInspectorId ? 'current' : ''
                }`}
              >
                <div className="item-avatar">
                  {inspector.isOnline ? (
                    <span className="status-online">🟢</span>
                  ) : (
                    <span className="status-offline">🔴</span>
                  )}
                </div>

                <div className="item-info">
                  <p className="item-name">
                    {inspector.name}
                    {inspector.id === currentInspectorId && (
                      <span className="you-badge">(Tú)</span>
                    )}
                  </p>
                  <p className="item-coords">
                    {inspector.lat.toFixed(4)}, {inspector.lng.toFixed(4)}
                  </p>
                </div>

                <div className="item-status">
                  {inspector.isOnline && <div className="pulse"></div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
