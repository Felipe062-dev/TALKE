const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve arquivos estáticos (se necessário)
app.use(express.static('public'));

io.on('connection', socket => {
  console.log('Novo usuário conectado:', socket.id);

  // Envia sinal de oferta para o peer
  socket.on('signal', data => {
    console.log('Sinal recebido:', data);
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  // Inicia a conversa
  socket.on('start-chat', (roomId) => {
    socket.emit('start-chat', roomId);
  });

  // Envia mensagem de chat
  socket.on('chat-message', (data) => {
    socket.broadcast.emit('chat-message', data);
  });

  // Evento quando o peer se desconectar
  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
    socket.broadcast.emit('peer-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


