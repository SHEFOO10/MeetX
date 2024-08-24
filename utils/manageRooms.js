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

// Example of adding a peer to a room
async function handlePeerConnection(peerId, roomId, type, callback) {
  const room = await getOrCreateRoom(roomId);
  room.addPeer(peerId);

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

  if (type === 'producer')
    sendTransport = await room.createWebRtcTransport(webRtcOptions);
  else if (type === 'consumer')
    recvTransport = await room.createWebRtcTransport(webRtcOptions);

  room.peers.get(peerId).transports['sendTransport'] = sendTransport;
  room.peers.get(peerId).transports['recvTransport'] = recvTransport;

  // console.log(room.peers.get(peerId))
  // You would then send the transport info to the client
  if (type == 'producer') {
    callback({ params: { 
      id: sendTransport.id,
      iceParameters: sendTransport.iceParameters,
      iceCandidates: sendTransport.iceCandidates,
      dtlsParameters: sendTransport.dtlsParameters,
   }});
   addNewProducer(sendTransport, roomId, peerId)
  } else if (type === 'consumer') {
    callback({ params: { 
      id: recvTransport.id,
      iceParameters: recvTransport.iceParameters,
      iceCandidates: recvTransport.iceCandidates,
      dtlsParameters: recvTransport.dtlsParameters,
   }});
   addNewConsumer(recvTransport, roomId, peerId)
  }

  console.log(room.peers) 
}

// Example of removing a peer from a room
function handlePeerDisconnection(peerId, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.removePeer(peerId);
  }
}


function addNewProducer(producerTransport, roomId, peerId) {
  const room = rooms.get(roomId);
  const peers = room.peers;
  const producerPeer = room.getPeer(peerId);

  for (const [key, value] of peers) {
    // all peers except the one who produce, we will set the producer transport
    // and set other peers on consumers on the producer
    if (key !== peerId)
      value.producers.push(producerTransport);
  }

}

function addNewConsumer(consumerTransport, roomId, peerId) {
  const room = rooms.get(roomId);
  const producers = room.producers;
  const peer = room.getPeer(peerId);

  // set producer to producers on the consumer peer
  // set the peer on consumers on the producer
  producers.forEach(producer => {
    // console.log(producer)
    let producerPeer = producer.producerPeer;
    producerPeer.consumers.push({peerId: consumerTransport})
    peer.producers.push(producerPeer)
  });  
}


export default {
    getOrCreateRoom,
    handlePeerConnection,
    handlePeerDisconnection,
    addNewProducer,
    addNewConsumer,
};