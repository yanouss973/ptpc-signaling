const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const sessions = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_session', () => {
    const sessionId = uuidv4();
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
