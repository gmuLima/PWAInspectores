import { useEffect, useState, useRef } from 'react';
import { MapComponent } from './components/MapComponent';
import { Header } from './components/Header';
import { FloatingButtons } from './components/FloatingButtons';
import { AssignmentsModal } from './components/AssignmentsModal';
import { SpeakingIndicator } from './components/SpeakingIndicator';
import {
  useGeolocation,
  useVoiceRecording,
  useInspectors,
} from './hooks/useApp';
import geolocationService from './services/geolocationService';
import authService from './services/authService';
import inspectorService from './services/inspectorService';
import assignmentService from './services/assignmentService';
import gpsService from './services/gpsService';
import alertService from './services/alertService';
import livekitService from './services/livekitService';
import attendanceService from './services/attendanceService';
import { isPointInsidePolygon, parseWKTPolygon } from './utils/wktParser';
import beepSound from './utils/beepSound';
import './App.css';

function App() {
  // Estado
  const [inspectorName, setInspectorName] = useState<string>('');
  const [inspectorData, setInspectorData] = useState<any>(null); // Datos completos del inspector
  // const [socketUrl] = useState<string>('http://localhost:3000');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const mapRef = useRef<any>(null);
  const [loginToken, setLoginToken] = useState('');
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [allAssignments, setAllAssignments] = useState<any[]>([]); // Todas las asignaciones del día
  const [nextScheduledAssignment, setNextScheduledAssignment] = useState<any>(null); // Próxima programada
  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false);
  const [zonePolygon, setZonePolygon] = useState<any>(null);
  const [isOutOfZone, setIsOutOfZone] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const lowBatteryAlertedRef = useRef(false); // Para evitar múltiples alertas
  const [isLiveKitConnected, setIsLiveKitConnected] = useState(false);
  const [livekitConnectionError, setLivekitConnectionError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);

  // Hooks personalizados
  const { location, stopTracking, startTracking: startLocationTracking } = useGeolocation();
  const { isRecording: _isRecording } = useVoiceRecording();
  void _isRecording; // Reservado para uso futuro
  const inspectors = useInspectors();

  // Efectos de inicialización
  useEffect(() => {
    // Verificar si ya está autenticado
    if (authService.isAuthenticated()) {
      setIsLoggedIn(true);
      loadInspectorData();
      
      // Registrar periodic background sync (cada 15 minutos)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker?.ready.then(sw => {
          if ('periodicSync' in sw) {
            registerPeriodicSync();
          }
        });
      }
    }

    // Monitorear batería
    const monitorBattery = async () => {
      try {
        const battery = await (navigator as any).getBattery?.();
        if (battery) {
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level * 100);
          });
        }
      } catch (error) {
        // Battery API no disponible
      }
    };
    monitorBattery();

    // Limpiar alertas al desmontar
    return () => {
      stopTracking();
      if (isGpsTracking) {
        gpsService.stopTracking();
      }
    };
  }, []);

  // Función helper para registrar asistencia cuando se activa una asignación
  const registerAttendanceForActivatedAssignment = async (assignment: any) => {
    try {
      console.log('📋 ===== INICIANDO REGISTRO DE ASISTENCIA =====');
      console.log('📋 Asignación:', assignment);
      console.log('📋 Assignment ID:', assignment.assignment.id);
      console.log('📋 Zona:', assignment.zone.name);
      
      // Obtener ubicación actual para el check-in
      console.log('📍 Solicitando ubicación GPS...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      console.log('📍 Ubicación obtenida:', { latitude, longitude });

      // Obtener inspector_id
      const inspector = inspectorService.getFromCache();
      console.log('👤 Inspector desde cache:', inspector);
      const inspectorId = (inspector as any)?.inspector_id || (inspector as any)?.id;
      console.log('👤 Inspector ID:', inspectorId);

      if (!inspectorId) {
        console.warn('⚠️ No se pudo obtener inspector_id para asistencia');
        return;
      }

      // Usar el assignment_id de la asignación que se acaba de activar
      const assignmentId = assignment.assignment.id;
      const scheduleId = assignment.schedule?.id || null;
      console.log('📋 Llamando a attendanceService.checkIn con:', {
        inspectorId,
        latitude,
        longitude,
        assignmentId,
        scheduleId
      });

      // Registrar check-in
      await attendanceService.checkIn(inspectorId, latitude, longitude, assignmentId, scheduleId);
      console.log('✅ Asistencia registrada exitosamente para asignación:', assignment.zone.name);
      console.log('📋 ===== FIN REGISTRO DE ASISTENCIA =====');
    } catch (attendanceError) {
      console.error('⚠️ Error registrando asistencia (no crítico):', attendanceError);
      console.error('⚠️ Stack trace:', (attendanceError as Error).stack);
      // No bloquear el flujo si falla la asistencia
    }
  };

  // Cargar datos del inspector y asignación
  const loadInspectorData = async () => {
    try {
      // Obtener datos del inspector
      const inspector = await inspectorService.getMeWithFallback();
      if (inspector) {
        // Mostrar nombre completo (nombre + apellido)
        const fullName = `${inspector.name} ${inspector.last_name}`.trim();
        setInspectorName(fullName);
        setInspectorData(inspector); // Guardar datos completos
        console.log('✅ Inspector cargado completo:', inspector);
      } else {
        console.error('❌ No se pudo cargar datos del inspector');
      }

      // Obtener todas las asignaciones del día
      let assignments = await assignmentService.getCurrent();
      
      // NUEVO: Procesar cambios automáticos al cargar (por si inician sesión tarde)
      console.log('⏰ Verificando cambios automáticos de estado al iniciar...');
      const result = await assignmentService.processAutoStatusChanges(
        assignments,
        registerAttendanceForActivatedAssignment
      );
      
      // Si hubo cambios, recargar asignaciones
      if (result.hasChanges) {
        console.log('🔄 Recargando asignaciones después de cambios automáticos...');
        assignments = await assignmentService.getCurrent();
      }
      
      setAllAssignments(assignments);
      console.log('✅ Asignaciones cargadas:', assignments.length);

      // Obtener asignación activa
      const assignment = await assignmentService.getActiveAssignmentDetails();
      if (assignment) {
        setCurrentAssignment(assignment);
        setNextScheduledAssignment(null); // Si hay activa, no mostrar programada
        console.log('✅ Asignación activa completa:', assignment);

        // Agregar zona de asignación al inspectorData para mostrarlo en el modal
        if (inspector && assignment.zone?.name) {
          setInspectorData({
            ...inspector,
            currentZone: assignment.zone.name
          });
        }

        // Parsear polígono de zona
        if (assignment.zone?.geometry) {
          console.log('📐 Geometry recibido:', assignment.zone.geometry);
          console.log('📐 Tipo de geometry:', typeof assignment.zone.geometry);
          try {
            const polygon = parseWKTPolygon(assignment.zone.geometry);
            setZonePolygon(polygon);
            console.log('✅ Zona cargada:', assignment.zone.name);
          } catch (parseError) {
            console.error('❌ Error parseando zona:', parseError);
          }
        } else {
          console.warn('⚠️ No hay geometry en la zona');
        }
      } else {
        console.warn('⚠️ No hay asignación activa');
        
        // Buscar la próxima asignación programada más cercana en tiempo
        const scheduled = assignments.filter(a => a.assignment.status === 'scheduled');
        if (scheduled.length > 0) {
          // Ordenar por hora de inicio (schedule.start_time)
          const sortedByTime = scheduled.sort((a, b) => {
            const timeA = a.schedule.start_time; // "06:00"
            const timeB = b.schedule.start_time; // "14:00"
            return timeA.localeCompare(timeB);
          });
          
          const nextAssignment = sortedByTime[0];
          console.log('📅 Próxima programada más cercana:', nextAssignment.zone.name, 'a las', nextAssignment.schedule.start_time);
          
          // Obtener detalles con geometry
          const nextDetails = await assignmentService.getDetails(nextAssignment.assignment.id);
          setNextScheduledAssignment(nextDetails);
          
          if (nextDetails.zone?.geometry) {
            console.log('📐 Geometry programada:', nextDetails.zone.geometry);
            try {
              const polygon = parseWKTPolygon(nextDetails.zone.geometry);
              setZonePolygon(polygon);
              console.log('📅 Próxima asignación programada:', nextDetails.zone.name);
            } catch (parseError) {
              console.error('❌ Error parseando zona programada:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos del inspector:', error);
    }
  };

  // Conectar a LiveKit cuando se cargue el inspector
  useEffect(() => {
    const connectToLiveKit = async () => {
      const inspectorId = (inspectorData as any)?.inspector_id || inspectorData?.id;
      
      console.log('📊 Estado LiveKit:', { 
        hasInspectorData: !!inspectorId, 
        inspectorId: inspectorId,
        isAlreadyConnected: isLiveKitConnected 
      });

      if (inspectorId && !isLiveKitConnected) {
        try {
          console.log('🎙️ Intentando conectar a LiveKit con inspector:', inspectorId);
          setLivekitConnectionError(null); // Limpiar error previo
          
          // Configurar callback para cambios de participantes
          livekitService.setOnParticipantCountChange((count) => {
            setParticipantCount(count);
          });

          // Configurar callback para detectar quien está hablando
          livekitService.setOnSpeakerChange((speakerName) => {
            setCurrentSpeaker(speakerName);
          });
          
          const connected = await livekitService.connect(inspectorId);
          console.log('🎙️ Resultado de conexión:', connected);
          setIsLiveKitConnected(connected);
          if (connected) {
            console.log('✅ LiveKit conectado exitosamente');
            setLivekitConnectionError(null);
            // Obtener conteo inicial
            setParticipantCount(livekitService.getParticipantCount());
          } else {
            console.error('❌ LiveKit no pudo conectar');
            setLivekitConnectionError('No se pudo conectar al servidor de radio');
          }
        } catch (error) {
          console.error('❌ Error fatal conectando a LiveKit:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
          setLivekitConnectionError(errorMessage);
        }
      }
    };

    connectToLiveKit();
  }, [inspectorData, isLiveKitConnected]);

  // Mantener audio activo cuando la app está en background y verificar reconexión
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('📱 App minimizada - manteniendo audio activo');
        // El audio debe seguir funcionando automáticamente
      } else {
        console.log('📱 App visible nuevamente - verificando conexión LiveKit...');
        
        // Verificar si LiveKit sigue conectado
        if (isLoggedIn && inspectorData) {
          const isStillConnected = livekitService.getIsConnected();
          
          if (!isStillConnected) {
            console.warn('⚠️ LiveKit desconectado - actualizando estado');
            setIsLiveKitConnected(false);
            setLivekitConnectionError('Conexión perdida. Toca el micrófono para reconectar');
          } else {
            console.log('✅ LiveKit sigue conectado');
            // Actualizar contador de participantes por si cambió
            setParticipantCount(livekitService.getParticipantCount());
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn, inspectorData]);

  // Sincronizar estado de isTalking con LiveKit cada segundo como respaldo
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isLiveKitConnected) {
        const actuallyTalking = livekitService.getIsTalking();
        if (actuallyTalking !== isTalking) {
          console.warn('⚠️ Estado desincronizado. React:', isTalking, 'LiveKit:', actuallyTalking);
          console.log('🔄 Sincronizando estado...');
          setIsTalking(actuallyTalking);
        }
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [isLiveKitConnected, isTalking]);

  // Verificar conexión de LiveKit periódicamente (cada 10 segundos)
  useEffect(() => {
    if (!isLoggedIn || !inspectorData) return;

    const connectionCheckInterval = setInterval(() => {
      const isStillConnected = livekitService.getIsConnected();
      
      if (isLiveKitConnected && !isStillConnected) {
        console.warn('⚠️ LiveKit desconectado detectado en chequeo periódico');
        setIsLiveKitConnected(false);
        setLivekitConnectionError('Conexión perdida. Toca el micrófono para reconectar');
      } else if (!isLiveKitConnected && isStillConnected) {
        // Se reconectó de alguna forma, actualizar estado
        console.log('✅ LiveKit reconectado detectado');
        setIsLiveKitConnected(true);
        setLivekitConnectionError(null);
        setParticipantCount(livekitService.getParticipantCount());
      }
    }, 10000); // Cada 10 segundos

    return () => clearInterval(connectionCheckInterval);
  }, [isLoggedIn, inspectorData, isLiveKitConnected]);

  // Iniciar rastreo automáticamente cuando se hace login
  useEffect(() => {
    if (isLoggedIn && !isGpsTracking) {
      startGpsTracking();
    }
  }, [isLoggedIn]);

  // Polling periódico para actualizar asignaciones (cada 30 segundos)
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(async () => {
      try {
        console.log('🔄 Actualizando asignaciones...');
        
        // Guardar estados anteriores
        const previousActiveId = currentAssignment?.assignment?.id;
        const previousScheduledId = nextScheduledAssignment?.assignment?.id;
        const previousAllCount = allAssignments.length;
        
        // Obtener todas las asignaciones
        const assignments = await assignmentService.getCurrent();
        
        // NUEVO: Procesar cambios automáticos de estado (inicio/fin)
        const result = await assignmentService.processAutoStatusChanges(
          assignments,
          registerAttendanceForActivatedAssignment
        );
        
        // Si hubo cambios automáticos, recargar asignaciones
        const finalAssignments = result.hasChanges 
          ? await assignmentService.getCurrent() 
          : assignments;
        
        setAllAssignments(finalAssignments);
        
        // Detectar nuevas asignaciones agregadas
        if (finalAssignments.length > previousAllCount) {
          const newCount = finalAssignments.length - previousAllCount;
          console.log(`🆕 ${newCount} nueva(s) asignación(es) agregada(s)`);
          alert(`🆕 Se agregaron ${newCount} nueva(s) asignación(es) a tu día`);
        }
        
        // Detectar asignaciones canceladas/removidas
        if (finalAssignments.length < previousAllCount) {
          const removedCount = previousAllCount - finalAssignments.length;
          console.log(`🗑️ ${removedCount} asignación(es) cancelada(s)`);
          alert(`⚠️ Se cancelaron ${removedCount} asignación(es) de tu día`);
        }

        // Verificar si hay una nueva asignación activa
        const activeAssignment = await assignmentService.getActiveAssignmentDetails();
        
        if (activeAssignment) {
          // Si la asignación activa cambió o se activó una que estaba programada
          if (previousActiveId !== activeAssignment.assignment.id) {
            // Solo mostrar alerta si NO hubo cambios automáticos
            // (si hubo cambios automáticos, ya se mostró la alerta en processAutoStatusChanges)
            if (!result.hasChanges) {
              if (previousScheduledId === activeAssignment.assignment.id) {
                // Una programada se activó
                console.log('🎉 Asignación programada ahora ACTIVA:', activeAssignment.zone.name);
                alert(`🎉 Tu asignación programada en ${activeAssignment.zone.name} está ahora ACTIVA`);
              } else {
                // Nueva asignación activa diferente
                console.log('🎉 Nueva asignación activa detectada:', activeAssignment.zone.name);
                alert(`🎉 Tu asignación en ${activeAssignment.zone.name} está ahora ACTIVA`);
              }
            } else {
              console.log('ℹ️ Cambio de asignación detectado (ya notificado por cambio automático)');
            }
          }
          
          setCurrentAssignment(activeAssignment);
          setNextScheduledAssignment(null); // Limpiar programada si hay activa
          
          // Actualizar polígono si cambió
          if (activeAssignment.zone?.geometry) {
            try {
              const polygon = parseWKTPolygon(activeAssignment.zone.geometry);
              setZonePolygon(polygon);
            } catch (error) {
              console.error('❌ Error parseando polígono en polling:', error);
            }
          }
        } else if (previousActiveId) {
          // La asignación activa terminó o fue cancelada
          // Solo mostrar alerta si NO hubo cambios automáticos (ya se mostró)
          if (!result.hasChanges) {
            console.log('⏹️ Asignación activa finalizada o cancelada');
            alert('⏹️ Tu asignación activa ha finalizado');
          } else {
            console.log('ℹ️ Asignación finalizada (ya notificado por cambio automático)');
          }
          setCurrentAssignment(null);
          setZonePolygon(null);
          
          // Buscar próxima programada más cercana
          const scheduled = finalAssignments.filter(a => a.assignment.status === 'scheduled');
          if (scheduled.length > 0) {
            // Ordenar por hora de inicio (schedule.start_time)
            const sortedByTime = scheduled.sort((a, b) => {
              const timeA = a.schedule.start_time; // "06:00"
              const timeB = b.schedule.start_time; // "14:00"
              return timeA.localeCompare(timeB);
            });
            
            const nextAssignment = sortedByTime[0];
            console.log('📅 Próxima programada:', nextAssignment.zone.name, 'a las', nextAssignment.schedule.start_time);
            
            // Verificar si cambió la próxima programada
            if (nextAssignment.assignment.id !== previousScheduledId) {
              try {
                const nextDetails = await assignmentService.getDetails(nextAssignment.assignment.id);
                setNextScheduledAssignment(nextDetails);
                
                if (nextDetails.zone?.geometry) {
                  const polygon = parseWKTPolygon(nextDetails.zone.geometry);
                  setZonePolygon(polygon);
                }
              } catch (error) {
                console.error('❌ Error obteniendo detalles de programada:', error);
              }
            }
          } else {
            setNextScheduledAssignment(null);
          }
        } else {
          // No hay activa, buscar próxima programada más cercana
          const scheduled = finalAssignments.filter(a => a.assignment.status === 'scheduled');
          if (scheduled.length > 0) {
            const sortedByTime = scheduled.sort((a, b) => {
              const timeA = a.schedule.start_time;
              const timeB = b.schedule.start_time;
              return timeA.localeCompare(timeB);
            });
            
            const nextAssignment = sortedByTime[0];
            
            // Si cambió la próxima programada
            if (!previousScheduledId || nextAssignment.assignment.id !== previousScheduledId) {
              console.log('🔄 Nueva próxima programada:', nextAssignment.zone.name, 'a las', nextAssignment.schedule.start_time);
              try {
                const nextDetails = await assignmentService.getDetails(nextAssignment.assignment.id);
                setNextScheduledAssignment(nextDetails);
                
                if (nextDetails.zone?.geometry) {
                  const polygon = parseWKTPolygon(nextDetails.zone.geometry);
                  setZonePolygon(polygon);
                }
              } catch (error) {
                console.error('❌ Error obteniendo detalles de programada:', error);
              }
            }
          } else {
            setNextScheduledAssignment(null);
          }
        }
      } catch (error) {
        console.error('Error actualizando asignaciones:', error);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [isLoggedIn, currentAssignment, nextScheduledAssignment, allAssignments]);

  // Monitorear ubicación GPS para detectar salida de zona
  useEffect(() => {
    if (!location) {
      console.log('📍 Sin ubicación aún');
      return;
    }

    console.log('📍 Ubicación actualizada en App:', location);

    if (!zonePolygon) return;

    const point = { latitude: location.lat, longitude: location.lng };
    const outOfZone = !isPointInsidePolygon(point, zonePolygon);

    if (outOfZone !== isOutOfZone) {
      setIsOutOfZone(outOfZone);

      // Enviar alerta si salió de zona
      if (outOfZone) {
        console.warn('⚠️ Inspector fuera de su zona asignada!');
        alertService.alertOutOfZone(location.lat, location.lng).catch(() => {
          // Error será manejado por el servicio de alertas
        });
      }
    }
  }, [location, zonePolygon, isOutOfZone]);

  // Monitorear nivel de batería
  useEffect(() => {
    if (batteryLevel < 15 && !lowBatteryAlertedRef.current && location) {
      lowBatteryAlertedRef.current = true;
      alertService.alertLowBattery(location.lat, location.lng).catch(() => {
        // Error será manejado por el servicio de alertas
      });
    }
  }, [batteryLevel, location]);

  // Enviar ubicación GPS al servicio remoto cada 30 segundos
  useEffect(() => {
    if (!isGpsTracking || !location) {
      return;
    }

    console.log('🔄 Iniciando intervalo de envío GPS cada 30 segundos');
    
    // Enviar inmediatamente la primera vez
    const sendCurrentPosition = async () => {
      console.log('📍 Enviando ubicación al API GPS...', {
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date().toISOString()
      });
      
      const point = { latitude: location.lat, longitude: location.lng };
      const outOfZone = zonePolygon ? !isPointInsidePolygon(point, zonePolygon) : false;

      await gpsService.sendPosition(
        location.lat,
        location.lng,
        outOfZone,
        currentAssignment
        // isLogout = false (valor por defecto)
      );
    };
    
    // Enviar posición inicial
    sendCurrentPosition();

    // Configurar intervalo para envíos periódicos
    const interval = setInterval(() => {
      console.log('⏰ Intervalo GPS disparado - enviando posición...');
      sendCurrentPosition();
    }, 30000); // 30 segundos

    return () => {
      console.log('🛑 Limpiando intervalo de envío GPS');
      clearInterval(interval);
    };
  }, [isGpsTracking, location, zonePolygon, currentAssignment]);

  // Actualizar tiempo de grabación
  useEffect(() => {
    if (!isTalking) {
      setRecordingTime(0);
      return;
    }

    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTalking]);

  // Manejar grabación de voz - Push to Talk con LiveKit
  const handleStartRecording = async () => {
    try {
      console.log('🟢 handleStartRecording llamado, isTalking:', isTalking);
      
      if (!isLiveKitConnected) {
        console.warn('⚠️ LiveKit no conectado');
        return;
      }

      // Prevenir llamadas duplicadas
      if (isTalking) {
        console.warn('⚠️ Ya está hablando - ignorando llamada duplicada');
        return;
      }
      
      // Reproducir beep de inicio
      beepSound.playStartBeep();
      
      // PRIMERO: Iniciar LiveKit
      const started = await livekitService.startTalking();
      
      // SEGUNDO: Actualizar estado React solo si se inició correctamente
      if (started) {
        setIsTalking(true);
        setRecordingTime(0);
        console.log('✅ Estado actualizado: isTalking = true');
      } else {
        console.error('❌ No se pudo iniciar LiveKit');
      }
    } catch (error) {
      console.error('Error iniciando transmisión:', error);
      setIsTalking(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      console.log('🔴 handleStopRecording llamado, isTalking:', isTalking);
      
      // SIEMPRE intentar detener LiveKit, sin importar el estado de React
      await livekitService.stopTalking();
      
      // Limpiar estado React
      setIsTalking(false);
      setRecordingTime(0);
      
      console.log('✅ Estado actualizado: isTalking = false');
      
      // Reproducir beep de fin
      beepSound.playEndBeep();
    } catch (error) {
      console.error('Error deteniendo transmisión:', error);
      // Asegurar limpieza del estado incluso si hay error
      setIsTalking(false);
      setRecordingTime(0);
    }
  };

  const handleCenterMap = () => {
    if (location && mapRef.current) {
      mapRef.current.setView([location.lat, location.lng], 15);
    }
  };

  /**
   * Iniciar rastreo GPS mediante API REST
   */
  const startGpsTracking = async () => {
    try {
      setIsGpsTracking(true);
      
      // Iniciar rastreo de ubicación en tiempo real
      startLocationTracking();
      console.log('📍 Rastreo GPS iniciado');
    } catch (error) {
      console.error('Error iniciando rastreo GPS:', error);
      setIsGpsTracking(false);
    }
  };

  const stopGpsTracking = () => {
    gpsService.stopTracking();
    setIsGpsTracking(false);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando proceso de logout...');
      
      // 1. PRIMERO: Enviar ubicación final con is_logout=true
      if (location) {
        console.log('📍 Enviando ubicación final con is_logout=true...');
        try {
          await gpsService.sendPosition(
            location.lat,
            location.lng,
            isOutOfZone,
            currentAssignment,
            true // is_logout = true
          );
          console.log('✅ Ubicación final enviada correctamente');
        } catch (error) {
          console.error('❌ Error enviando ubicación final:', error);
          // Continuar con logout aunque falle el envío
        }
      } else {
        console.warn('⚠️ No hay ubicación disponible para enviar en logout');
      }

      // 2. LUEGO: Detener rastreos
      stopTracking();
      if (isGpsTracking) {
        stopGpsTracking();
      }

      // 3. Logout en servicio de autenticación
      authService.logout();

      // 4. Limpiar datos de asistencia
      attendanceService.clearAttendanceData();

      // 5. Desconectar LiveKit
      livekitService.disconnect();

      // 6. Limpiar estado local
      setIsLoggedIn(false);
      setInspectorName('');
      setCurrentAssignment(null);
      setZonePolygon(null);
      setLoginToken('');
      
      console.log('✅ Logout completado exitosamente');
    } catch (error) {
      console.error('❌ Error durante logout:', error);
    }
  };

  // Manejar reconexión a LiveKit
  const handleRetryConnection = async () => {
    if (!inspectorData) {
      console.error('❌ No hay datos del inspector para reconectar');
      return;
    }

    console.log('🔄 Intentando reconectar a LiveKit...');
    setLivekitConnectionError(null);
    setIsLiveKitConnected(false);

    try {
      // Desconectar primero si hay alguna conexión residual
      await livekitService.disconnect();

      // Intentar reconectar
      const inspectorId = (inspectorData as any).inspector_id || (inspectorData as any).id;
      const connected = await livekitService.connect(inspectorId);
      
      setIsLiveKitConnected(connected);
      
      if (connected) {
        console.log('✅ Reconexión exitosa');
        setParticipantCount(livekitService.getParticipantCount());
      } else {
        console.error('❌ Reconexión fallida');
        setLivekitConnectionError('No se pudo reconectar. Intenta nuevamente');
      }
    } catch (error) {
      console.error('❌ Error en reconexión:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
      setLivekitConnectionError(errorMessage);
    }
  };

  // handleShowSettings ya no se usa (settings eliminados)
  // const handleShowSettings = () => {
  //   const newName = prompt('Nuevo nombre de inspector:', inspectorName);
  //   if (newName && newName.trim()) {
  //     setInspectorName(newName);
  //     localStorage.setItem('inspectorName', newName);
  //     socketService.disconnect();
  //     socketService.connect(socketUrl, newName);
  //   }
  // };

  // Registrar periodic background sync para ubicaciones ocasionales en background
  const registerPeriodicSync = async () => {
    try {
      const sw = await navigator.serviceWorker?.ready;
      if (sw && 'periodicSync' in sw) {
        await (sw.periodicSync as any).register('sync-gps-positions', {
          minInterval: 15 * 60 * 1000, // 15 minutos mínimo
        });
        console.log('✅ Periodic sync registrado: ubicaciones cada 15 minutos en background');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo registrar periodic sync:', error);
      // Algunos navegadores no soportan periodic sync, es opcional
    }
  };

  /**
   * Pantalla de login con token
   */
  if (!isLoggedIn) {
    const handleLogin = async () => {
      if (!loginToken.trim()) {
        alert('Por favor ingresa un token');
        return;
      }

      try {
        // Solicitar permiso de geolocalización (todos los dispositivos)
        // Es opcional: continúa aunque falle, se pedirá de nuevo al rastrear
        console.log('🔐 Solicitando permiso de geolocalización...');
        const hasPermission = await geolocationService.requestPermission();
        
        if (!hasPermission) {
          console.warn('⚠️ Permiso de geolocalización no otorgado en login, se pedirá al rastrear');
          // NO bloquear login, permitir continuar
        } else {
          console.log('✅ Permiso de geolocalización otorgado');
        }

        // Autenticar con el token
        await authService.login(loginToken);
        setLoginToken('');

        // Cargar datos del inspector y asignación
        await loadInspectorData();

        // Registrar periodic background sync
        await registerPeriodicSync();

        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error durante login:', error);
        alert('❌ Error durante la autenticación. Verifica tu token e intenta nuevamente.');
      }
    };

    return (
      <div className="setup-screen">
        <div className="setup-container">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            <img 
              src="/ic_launcher-playstore.png" 
              alt="MunLima Logo" 
              style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '16px' }}
            />
            <h1>🚔 Sistema Inspector</h1>
            <p>Sistema municipal de seguimiento en tiempo real</p>
          </div>

          <div className="setup-form">
            <div className="form-group">
              <label>Token de Acceso:</label>
              <input
                type="password"
                value={loginToken}
                onChange={(e) => setLoginToken(e.target.value)}
                placeholder="Ingresa tu token de acceso"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div className="form-group" style={{ fontSize: '12px', color: '#6b7280', textAlign: 'left' }}>
              <p>Solicita tu token de acceso a administración</p>
            </div>

            <button className="setup-btn" onClick={handleLogin} disabled={!loginToken.trim()}>
              Ingresar
            </button>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280' }}>
              <p>🔐 Acceso seguro mediante API REST</p>
              <p>Tu token se almacena localmente en el dispositivo</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal (MOBILE-FIRST)
  return (
    <div className="app mobile-layout">
      {/* Header flotante */}
      <Header
        inspectorName={inspectorName}
        location={location}
        isTracking={isGpsTracking}
        isConnected={isLoggedIn}
        onLogout={handleLogout}
        inspectorData={inspectorData}
        hasActiveAssignment={!!currentAssignment}
      />

      {/* Mapa a pantalla completa */}
      <div className="map-fullscreen">
        <MapComponent
          ref={mapRef}
          inspectors={inspectors}
          currentLocation={location}
          inspectorName={inspectorName}
          zonePolygon={zonePolygon}
          isOutOfZone={isOutOfZone}
          zoneName={currentAssignment?.zone?.name || nextScheduledAssignment?.zone?.name}
          isScheduled={!!nextScheduledAssignment && !currentAssignment}
        />
      </div>

      {/* Botones flotantes */}
      <FloatingButtons
        isRecording={isTalking}
        isTracking={isGpsTracking}
        recordingTime={recordingTime}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onCenterMap={handleCenterMap}
        isConnected={isLiveKitConnected}
        connectionError={livekitConnectionError}
        onRetryConnection={handleRetryConnection}
        participantCount={participantCount}
        onOpenAssignments={() => setIsAssignmentsModalOpen(true)}
      />

      {/* Indicador de zona */}
      {isOutOfZone && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '10px',
            right: '10px',
            padding: '12px',
            backgroundColor: '#dc2626',
            color: 'white',
            borderRadius: '8px',
            zIndex: 100,
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          ⚠️ FUERA DE ZONA - Inspector fuera de su asignación
        </div>
      )}

      {/* Indicador de batería baja */}
      {batteryLevel < 15 && (
        <div
          style={{
            position: 'fixed',
            top: isOutOfZone ? '130px' : '80px',
            left: '10px',
            right: '10px',
            padding: '12px',
            backgroundColor: '#f59e0b',
            color: 'white',
            borderRadius: '8px',
            zIndex: 99,
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          🔋 Batería baja ({batteryLevel}%)
        </div>
      )}

      {/* PWA Install Prompt */}
      <div id="pwa-install-prompt" style={{ display: 'none' }} />

      {/* Modal de asignaciones */}
      <AssignmentsModal
        isOpen={isAssignmentsModalOpen}
        onClose={() => setIsAssignmentsModalOpen(false)}
        assignments={allAssignments}
      />

      {/* Indicador de quien está hablando */}
      <SpeakingIndicator speakerName={currentSpeaker} />
    </div>
  );
}

export default App;
