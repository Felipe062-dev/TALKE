const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path'); // Módulo path para resolver os caminhos dos arquivos

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let queue = []; // Fila para pareamento de usuários

// Configuração para servir arquivos estáticos (HTML, CSS, JS) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Serve o arquivo index.html quando a raiz do site é acessada
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve o arquivo index.html da pasta 'public'
});

// Gerenciamento de conexões de usuários
io.on('connection', (socket) => {
  console.log(`Novo usuário conectado: ${socket.id}`);

  // Adiciona o usuário à fila
  queue.push(socket);

  // Se houver pelo menos 2 usuários na fila, pareie-os
  if (queue.length >= 2) {
    const user1 = queue.shift(); // Pega o primeiro usuário da fila
    const user2 = queue.shift(); // Pega o segundo usuário da fila

    // Cria uma sala única para os dois usuários
    const roomId = `room-${user1.id}-${user2.id}`;
    user1.join(roomId);
    user2.join(roomId);

    // Notifica os usuários que o chat começou
    user1.emit('start-chat', roomId);
    user2.emit('start-chat', roomId);

    console.log(`Usuários ${user1.id} e ${user2.id} foram pareados na sala ${roomId}`);
  }

  // Recebe sinal de WebRTC (sinalização) e transmite para o outro participante
  socket.on('signal', (data) => {
    console.log(`Sinal de ${socket.id} para ${data.to}`);
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal,
    });
  });

  // Recebe mensagens de chat e as encaminha para o outro usuário
  socket.on('chat-message', (data) => {
    if (socket.peerId) {
      io.to(socket.peerId).emit('chat-message', data);
    }
  });

  // Quando um usuário desconectar, remove da fila e notifica o par
  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    // Remove o usuário desconectado da fila
    queue = queue.filter(user => user.id !== socket.id);

    // Se o usuário estava pareado, avisa ao par sobre a desconexão
    if (socket.peerId) {
      io.to(socket.peerId).emit('peer-disconnected');
    }
  });

  // Lida com a associação de par de usuários
  socket.on('join-peer', (peerId) => {
    socket.peerId = peerId; // Define o peerId para esse usuário
    console.log(`Usuário ${socket.id} pareado com ${peerId}`);
    io.to(peerId).emit('peer-connected', socket.id);
  });
});

// Inicia o servidor na porta definida no ambiente ou 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});




