const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path'); // Importando o módulo path para ajudar com os caminhos dos arquivos
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configuração para servir arquivos estáticos (HTML, CSS, JS) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public'))); // A pasta 'public' deve conter os arquivos estáticos

// Rota para a página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve o arquivo index.html quando a raiz for acessada
});

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

// Inicia o servidor na porta correta (usando a porta definida no ambiente ou 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});


