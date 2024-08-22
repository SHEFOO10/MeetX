import mediasoup from 'mediasoup';
import Room from './Room';

const rooms = new Map(); // Store all the rooms
let worker;

(async () => {
  worker = await mediasoup.createWorker();

  worker.on('died', () => {
    console.error('mediasoup Worker died, exiting...');
    process.exit(1);
  });
})();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    const room = new Room(roomId, worker);
    room.init();
    rooms.set(roomId, room);
  }

  return rooms.get(roomId);
}

// Example of adding a peer to a room
async function handlePeerConnection(peerId, roomId) {
  const room = getOrCreateRoom(roomId);
  room.addPeer(peerId);

  const transport = await room.createWebRtcTransport();
  // You would then send the transport info to the client
}

// Example of removing a peer from a room
function handlePeerDisconnection(peerId, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.removePeer(peerId);
  }
}

export {
    getOrCreateRoom,
    handlePeerConnection,
    handlePeerDisconnection,
};