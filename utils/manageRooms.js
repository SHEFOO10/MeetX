import * as mediasoup from 'mediasoup';
import Room from './room';

const rooms = new Map(); // Store all the rooms
let worker;

(async () => {
  worker = await mediasoup.createWorker();

  worker.on('died', () => {
    console.error('mediasoup Worker died, exiting...');
    process.exit(1);
  });
})();

async function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    const room = new Room(roomId, worker);
    await room.init();
    rooms.set(roomId, room);
  }

  return rooms.get(roomId);
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

// Example of adding a peer to a room
async function handlePeerConnection(peerId, roomId, type, callback) {
  const room = await getOrCreateRoom(roomId);
  room.addPeer(peerId);

  const socketId = peerId;
  let sendTransport;
  let recvTransport;

  const webRtcOptions = {
    listenIps: [
        {
            ip: '0.0.0.0',
            announcedIp: '20.103.221.187', // don't forget to change this ip to the server ip
        }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
  }

  if (type === 'producer') {
    sendTransport = await room.createWebRtcTransport(webRtcOptions);
    room.peers.get(peerId).transports['sendTransport'] = sendTransport;
  } else if (type === 'consumer') {
    recvTransport = await room.createWebRtcTransport(webRtcOptions);
    room.peers.get(peerId).producers.push({
      consumerId: null,
      consumerTransport: recvTransport,
      producerId: null,
      socketId
    });
  }


  // console.log(room.peers.get(peerId))
  // You would then send the transport info to the client
  if (type == 'producer') {
    callback({ params: { 
      id: sendTransport.id,
      iceParameters: sendTransport.iceParameters,
      iceCandidates: sendTransport.iceCandidates,
      dtlsParameters: sendTransport.dtlsParameters,
   }});
  } else if (type === 'consumer') {
    callback({ params: { 
      id: recvTransport.id,
      iceParameters: recvTransport.iceParameters,
      iceCandidates: recvTransport.iceCandidates,
      dtlsParameters: recvTransport.dtlsParameters,
   }});
  }

  // console.log('Manage Room.js:', room.peers) 
}

// Example of removing a peer from a room
function handlePeerDisconnection(peerId, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.removePeer(peerId);
  }
}


export default {
    getRoom,
    getOrCreateRoom,
    handlePeerConnection,
    handlePeerDisconnection,
};