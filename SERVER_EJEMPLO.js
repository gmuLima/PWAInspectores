/**
 * SERVIDOR SOCKET.IO EJEMPLO
 * 
 * Este es un servidor Node.js + Socket.IO de ejemplo para la PWA de Inspectores.
 * NO incluye autenticación ni persistencia de datos.
 * 
 * Instalación:
 * npm init -y
 * npm install express socket.io cors
 * 
 * Ejecución:
 * node server.js
 * 
 * El servidor estará en http://localhost:3000
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configurar CORS para Socket.IO
const io = socketIo(server, {
  cors: {
    origin: '*', // En producción, especificar dominio
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(cors());
app.use(express.json());

// Estado en memoria (sin base de datos)
const users = new Map();

// Rutas HTTP básicas
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Socket.IO para Inspectores de Tránsito',
    connected_users: users.size,
    timestamp: new Date(),
  });
});

app.get('/status', (req, res) => {
  const usersList = Array.from(users.values()).map(user => ({
    id: user.id,
    name: user.name,
    lat: user.lat,
    lng: user.lng,
    lastUpdate: user.lastUpdate,
  }));

  res.json({
    total_connected: users.size,
    users: usersList,
    timestamp: new Date(),
  });
});

// Socket.IO eventos
io.on('connection', socket => {
  console.log(`🔌 Nueva conexión: ${socket.id}`);

  // Evento: Usuario se une
  socket.on('join', data => {
    const userId = data.id || socket.id;
    const userName = data.name || `Inspector ${Math.random().toString(36).substr(2, 9)}`;

    users.set(userId, {
      id: userId,
      name: userName,
      lat: -12.046374, // Lima por defecto
      lng: -77.042793,
      lastUpdate: Date.now(),
      socketId: socket.id,
    });

    console.log(`✅ ${userName} se unió (ID: ${userId})`);

    // Notificar a todos los clientes
    io.emit('users', Array.from(users.values()));

    // Responder al cliente
    socket.emit('join', {
      id: userId,
      success: true,
    });
  });

  // Evento: Actualización de ubicación
  socket.on('location', data => {
    const user = Array.from(users.values()).find(u => u.socketId === socket.id);

    if (user) {
      user.lat = data.lat;
      user.lng = data.lng;
      user.accuracy = data.accuracy;
      user.lastUpdate = data.timestamp;

      // Broadcast a todos excepto al remitente
      socket.broadcast.emit('location', {
        id: user.id,
        name: user.name,
        lat: user.lat,
        lng: user.lng,
        accuracy: user.accuracy,
        timestamp: data.timestamp,
      });
    }
  });

  // Evento: Mensaje de voz
  socket.on('voice', data => {
    const user = Array.from(users.values()).find(u => u.socketId === socket.id);

    if (user) {
      console.log(`🎤 Audio recibido de ${user.name} (${data.audio.byteLength} bytes)`);

      // Broadcast del audio a todos los clientes
      socket.broadcast.emit('voice', {
        senderId: user.id,
        senderName: user.name,
        audio: data.audio,
        timestamp: data.timestamp,
      });
    }
  });

  // Evento: Beep de inicio
  socket.on('beepStart', data => {
    const user = Array.from(users.values()).find(u => u.socketId === socket.id);

    if (user) {
      console.log(`📢 Beep START de ${user.name}`);

      // Broadcast del beep a todos los demás clientes
      socket.broadcast.emit('beepStartReceived', {
        senderId: user.id,
        senderName: user.name,
        timestamp: data.timestamp,
      });
    }
  });

  // Evento: Beep de fin
  socket.on('beepEnd', data => {
    const user = Array.from(users.values()).find(u => u.socketId === socket.id);

    if (user) {
      console.log(`📢 Beep END de ${user.name}`);

      // Broadcast del beep a todos los demás clientes
      socket.broadcast.emit('beepEndReceived', {
        senderId: user.id,
        senderName: user.name,
        timestamp: data.timestamp,
      });
    }
  });

  // Evento: Desconexión
  socket.on('disconnect', () => {
    // Buscar y remover usuario
    let disconnectedName = '';
    for (const [key, user] of users.entries()) {
      if (user.socketId === socket.id) {
        disconnectedName = user.name;
        users.delete(key);
        break;
      }
    }

    console.log(`❌ ${disconnectedName} desconectado (ID: ${socket.id})`);

    // Notificar a los demás
    if (users.size > 0) {
      io.emit('users', Array.from(users.values()));
    }
  });

  // Manejo de errores
  socket.on('error', error => {
    console.error(`⚠️ Error del socket ${socket.id}:`, error);
  });
});

// Manejo de errores del servidor
server.on('error', error => {
  console.error('Error del servidor:', error);
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🚓 Servidor Socket.IO Inspectores         ║
║  Puerto: ${PORT}                            ║
║  URL: http://localhost:${PORT}               ║
║  Conecta clientes a ws://localhost:${PORT}   ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});
