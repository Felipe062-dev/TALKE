const socket = io();
let peerConnection;
let localStream;
let audioTrack, videoTrack;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const messages = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');

const btnMic = document.getElementById('btn-mic');
const btnCam = document.getElementById('btn-cam');

// Verificar conexão com o servidor Socket.IO
socket.on('connect', () => {
  console.log('Conectado ao servidor Socket.IO');
});

socket.on('disconnect', () => {
  console.log('Desconectado do servidor Socket.IO');
});

// Obter acesso à câmera e microfone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;

    // Armazenar as tracks para controle posterior
    audioTrack = stream.getAudioTracks()[0];
    videoTrack = stream.getVideoTracks()[0];
  })
  .catch(err => {
    console.error("Erro ao acessar mídia: ", err);
    alert("Não foi possível acessar a câmera ou microfone. Verifique as permissões.");
  });

// Botão de microfone
btnMic.addEventListener('click', () => {
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    btnMic.textContent = audioTrack.enabled ? "🎤 Microfone" : "🔇 Mutado";
    btnMic.classList.toggle('bg-green-600', audioTrack.enabled);
    btnMic.classList.toggle('bg-red-600', !audioTrack.enabled);
  }
});

// Botão de câmera
btnCam.addEventListener('click', () => {
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    btnCam.textContent = videoTrack.enabled ? "🎥 Câmera" : "📷 Desligada";
    btnCam.classList.toggle('bg-green-600', videoTrack.enabled);
    btnCam.classList.toggle('bg-red-600', !videoTrack.enabled);
  }
});

// Quando emparelhar com outro usuário
socket.on('matched', async (peerId) => {
  console.log('Emparelhado com:', peerId);

  peerConnection = createPeerConnection(peerId);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit('signal', {
    to: peerId,
    signal: { sdp: offer }
  });
});

// Quando receber sinal do outro peer
socket.on('signal', async (data) => {
  console.log('Recebendo sinal:', data);
  if (!peerConnection) {
    peerConnection = createPeerConnection(data.from);
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  if (data.signal.sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
    if (data.signal.sdp.type === 'offer') {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('signal', {
        to: data.from,
        signal: { sdp: answer }
      });
    }
  } else if (data.signal.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
  }
});

// Criar conexão peer
function createPeerConnection(peerId) {
  const pc = new RTCPeerConnection();

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('signal', {
        to: peerId,
        signal: { candidate: event.candidate }
      });
    }
  };

  pc.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  return pc;
}

// Envio de mensagens
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg !== "") {
    appendMessage(`Você: ${msg}`, 'user');
    socket.emit('chat-message', msg);
    input.value = '';
  }
});

// Recebe mensagem do parceiro
socket.on('chat-message', (msg) => {
  appendMessage(`Parceiro: ${msg}`, 'other');
});

// Usuário desconectou
socket.on('peer-disconnected', () => {
  appendMessage("O usuário saiu da conversa.", 'info');
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
});

// Exibe mensagens no chat
function appendMessage(message, type = 'other') {
  const div = document.createElement('div');
  div.classList.add("p-2", "rounded-lg", "w-fit", "max-w-[70%]", "break-words");

  if (type === 'user') {
    div.classList.add("bg-indigo-600", "self-end", "ml-auto");
  } else if (type === 'info') {
    div.classList.add("text-center", "text-sm", "text-gray-400");
  } else {
    div.classList.add("bg-gray-700", "text-white");
  }

  div.textContent = message;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  // Opcional: Limitar o tamanho da mensagem visível
  if (div.textContent.length > 100) {
    div.textContent = div.textContent.substring(0, 100) + '...';
  }
}
