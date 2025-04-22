const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let queue = [];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`Novo usuário conectado: ${socket.id}`);
  queue.push(socket);

  // Tentativa de pareamento
  if (queue.length >= 2) {
    const user1 = queue.shift();
    const user2 = queue.shift();

    const roomId = `room-${user1.id}-${user2.id}`;

    user1.join(roomId);
    user2.join(roomId);

    user1.peerId = user2.id;
    user2.peerId = user1.id;

    user1.emit('start-chat', { roomId, peerId: user2.id });
    user2.emit('start-chat', { roomId, peerId: user1.id });

    console.log(`Pareados: ${user1.id} <--> ${user2.id}`);
  }

  // Encaminha sinal WebRTC
  socket.on('signal', ({ to, signal }) => {
    console.log(`Sinal de ${socket.id} para ${to}`);
    io.to(to).emit('signal', {
      from: socket.id,
      signal,
    });
  });

  // Encaminha mensagem de texto
  socket.on('chat-message', (data) => {
    if (socket.peerId) {
      io.to(socket.peerId).emit('chat-message', {
        from: socket.id,
        message: data.message,
      });
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log(`Desconectado: ${socket.id}`);
    queue = queue.filter((user) => user.id !== socket.id);

    if (socket.peerId) {
      io.to(socket.peerId).emit('peer-disconnected');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


