const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const sessions = new Map();

// Fonction pour générer un code de session de 6 caractères
function generateSessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (sessions.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_session', () => {
    const sessionId = generateSessionCode();
    sessions.set(sessionId, new Set([socket.id]));
    socket.join(sessionId);
    socket.emit('session_created', { sessionId });
    console.log('Session created:', sessionId);
  });

  socket.on('join_session', ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.add(socket.id);
      socket.join(sessionId);
      socket.emit('session_joined', { sessionId });
      console.log('Client', socket.id, 'joined session:', sessionId);
    } else {
      socket.emit('error', { message: 'Invalid session ID' });
    }
  });

  socket.on('message', ({ sessionId, message }) => {
    const session = sessions.get(sessionId);
    if (session) {
      socket.to(sessionId).emit('message', { message });
      console.log('Message from', socket.id, 'in session', sessionId + ':', message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    sessions.forEach((clients, sessionId) => {
      if (clients.has(socket.id)) {
        clients.delete(socket.id);
        if (clients.size === 0) {
          sessions.delete(sessionId);
          console.log('Session deleted:', sessionId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
