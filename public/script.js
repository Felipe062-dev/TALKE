// Conexão com o servidor Socket.IO
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

// Acesso imediato à mídia
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    audioTrack = stream.getAudioTracks()[0];
    videoTrack = stream.getVideoTracks()[0];

    socket.emit('join-peer', socket.id); // Solicita pareamento imediato após acessar mídia
  })
  .catch(err => {
    console.error("Erro ao acessar mídia: ", err);
    alert("Não foi possível acessar a câmera ou microfone. Verifique as permissões.");
  });

// Controle de microfone
btnMic.addEventListener('click', () => {
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    btnMic.textContent = audioTrack.enabled ? "🎤 Microfone" : "🔇 Mutado";
    btnMic.classList.toggle('bg-green-600', audioTrack.enabled);
    btnMic.classList.toggle('bg-red-600', !audioTrack.enabled);
  }
});

// Controle de câmera
btnCam.addEventListener('click', () => {
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    btnCam.textContent = videoTrack.enabled ? "🎥 Câmera" : "📷 Desligada";
    btnCam.classList.toggle('bg-green-600', videoTrack.enabled);
    btnCam.classList.toggle('bg-red-600', !videoTrack.enabled);
  }
});

// Conexão com servidor
socket.on('connect', () => {
  console.log('Conectado ao servidor Socket.IO');
});

socket.on('disconnect', () => {
  console.log('Desconectado do servidor Socket.IO');
});

// Emparelhamento
socket.on('peer-connected', async (peerId) => {
  console.log('Emparelhado com:', peerId);
  createConnectionAndSendOffer(peerId);
});

async function createConnectionAndSendOffer(peerId) {
  peerConnection = createPeerConnection(peerId);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit('signal', {
    to: peerId,
    signal: { sdp: peerConnection.localDescription }
  });
}

// Sinalização
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

// Criação da conexão peer
function createPeerConnection(peerId) {
  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ]
  };

  const pc = new RTCPeerConnection(config);

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('signal', {
        to: peerId,
        signal: { candidate: event.candidate }
      });
    }
  };

  pc.ontrack = event => {
    console.log("Track recebida", event.streams);
    if (!remoteVideo.srcObject) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  return pc;
}

// Envio de mensagem
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg !== "") {
    appendMessage(`Você: ${msg}`, 'user');
    socket.emit('chat-message', { message: msg });
    input.value = '';
  }
});

// Recebimento de mensagem
socket.on('chat-message', (data) => {
  if (data && typeof data.message === 'string') {
    appendMessage(`Parceiro: ${data.message}`, 'other');
  }
});

// Desconexão do par
socket.on('peer-disconnected', () => {
  appendMessage("O usuário saiu da conversa.", 'info');
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
});

// Adiciona mensagens ao chat
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

  if (div.textContent.length > 300) {
    div.textContent = div.textContent.substring(0, 300) + '...';
  }
}

