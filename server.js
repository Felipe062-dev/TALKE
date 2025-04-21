const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

io.on('connection', (socket) => {
  console.log(`Novo usuário conectado: ${socket.id}`);

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal,
    });
  });

  socket.on('chat-message', (data) => {
    if (socket.peerId) {
      io.to(socket.peerId).emit('chat-message', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    if (socket.peerId) {
      io.to(socket.peerId).emit('peer-disconnected');
    }
  });
});

server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
