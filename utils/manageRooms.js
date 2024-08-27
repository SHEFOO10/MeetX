import * as mediasoup from 'mediasoup';
import Room from './room';

// const rooms = new Map(); // Store all the rooms
let rooms = {}          // { roomName1: { Router, peers: [ socketId1, ... ] }, ...}
let peers = {}          // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
let transports = []     // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = []      // [ { socketId1, roomName1, producer, }, ... ]
let consumers = []      // [ { socketId1, roomName1, consumer, }, ... ]


let worker;

(async () => {
  worker = await mediasoup.createWorker();

  worker.on('died', () => {
    console.error('mediasoup Worker died, exiting...');
    process.exit(1);
  });
})();

const removeItems = (items, socketId, type) => {
  items.forEach(item => {
    if (item.socketId === socketId) {
      item[type].close()
    }
  })
  items = items.filter(item => item.socketId !== socketId)

  return items
}



// create WebRtc Transport
async function createWebRtcTransport(router) {
  return new Promise(async (resolve, reject) => {
    try {
      // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
      const webRtcTransport_options = {
        listenIps: [
          {
            ip: '0.0.0.0', // replace with relevant IP address
            announcedIp: '192.168.1.9',
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      }

      // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
      let transport = await router.createWebRtcTransport(webRtcTransport_options)
      console.log(`transport id: ${transport.id}`)

      transport.on('dtlsstatechange', dtlsState => {
        if (dtlsState === 'closed') {
          transport.close()
        }
      })

      transport.on('close', () => {
        console.log('transport closed')
      })

      resolve(transport)

    } catch (error) {
      reject(error)
    }
  })
}

async function createRoom (roomName, socketId) {

  const mediaCodecs = [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000,
      },
    },
  ];
  // worker.createRouter(options)
  // options = { mediaCodecs, appData }
  // mediaCodecs -> defined above
  // appData -> custom application data - we are not supplying any
  // none of the two are required
  let router1
  let peers = []
  if (rooms[roomName]) {
    router1 = rooms[roomName].router
    peers = rooms[roomName].peers || []
  } else {
    router1 = await worker.createRouter({ mediaCodecs, })
  }
  
  console.log(`Router ID: ${router1.id}`, peers.length)

  rooms[roomName] = {
    router: router1,
    peers: [...peers, socketId],
  }

  return router1
}

function getRoom(roomName) {
  return rooms[roomName];
}

function AddPeer(sockId, { socket, roomName }) {
  peers[sockId] = {
    socket,
    roomName,           // Name for the Router this Peer joined
    transports: [],
    producers: [],
    consumers: [],
    peerDetails: {
      name: '',
      isAdmin: false,   // Is this Peer the Admin?
    }
  }
}

function getPeer(socketId) {
  return peers[socketId];
}

function deletePeer(socketId) {
  delete peers[socketId];
}

function removePeerFromRoom(roomName, peerSocketId) {
  rooms[roomName] = {
    router: rooms[roomName].router,
    peers: rooms[roomName].peers.filter(socketId => socketId !== peerSocketId)
  }
}

function addTransportToPeer(peerSocketId, transport) {
  peers[peerSocketId] = {
    ...peers[peerSocketId],
    transports: [
      ...peers[peerSocketId].transports,
      transport.id,
    ]
  }
}

function addProducerToPeer(peerSocketId, producer) {
  peers[peerSocketId] = {
    ...peers[peerSocketId],
    producers: [
      ...peers[peerSocketId].producers,
      producer.id,
    ]
  }
}

function addProducerToProducers(socketId, producer, roomName) {
  producers = [
    ...producers,
    { socketId: socketId, producer, roomName, }
  ]
}

function addConsumerToPeer(peerSocketId, consumer) {
  peers[peerSocketId] = {
    ...peers[peerSocketId],
    consumers: [
      ...peers[peerSocketId].consumers,
      consumer.id,
    ]
  }
}

function addConsumerToConsumers(peerSocketId, roomName, consumer) {
  consumers = [
    ...consumers,
    { socketId: peerSocketId, consumer, roomName, }
  ]
}

function getConsumerById(consumerId) {
  return consumers.find(consumerData => consumerData.consumer.id === consumerId)
}

function removeConsumerFromConsumers(consumerId) {
  consumers = consumers.filter(consumerData => consumerData.consumer.id !== consumerId)
}

function addTranportToTransports(peerSocketId, transport, roomName, consumer) {
  transports = [
    ...transports,
    { socketId: peerSocketId, transport, roomName, consumer, }
  ]
}

function getTransportFromTransports(peerSocketId) {
  const [producerTransport] = transports.filter(transport => transport.socketId === peerSocketId && !transport.consumer)
  return producerTransport.transport
}

function removeTransportFromTransportsByTransportId(transportId) {
  transports = transports.filter(transportData => transportData.transport.id !== transportId)
}

function getTransportFromTransportsByTransportId(transportId) {
  return transports.find(transport => (
    transport.consumer && transport.transport.id == transportId
  )).transport
}

function removeTransportsIfUserDisconnected(peerSocketId) {
  transports = removeItems(transports, peerSocketId, 'transport')
}

function removeProducersIfUserDisconnected(peerSocketId) {
  producers = removeItems(producers, peerSocketId, 'producer')
}

function getProducers() {
  return producers;
}

function getAllProducersExceptThisSocketId(socketId, roomName) {
  let producerList = []
  producers.forEach(producerData => {
    if (producerData.socketId !== socketId && producerData.roomName === roomName) {
      producerList = [...producerList, producerData.producer.id]
    }
  })
  return producerList;
}

function removeConsumersIfUserDisconnected(peerSocketId) {
  consumers = removeItems(consumers, peerSocketId, 'consumer')
}

export default {
    createWebRtcTransport,
    createRoom,
    getRoom,
    AddPeer,
    getPeer,
    deletePeer,
    removePeerFromRoom,
    addTransportToPeer,
    addTranportToTransports,
    getTransportFromTransports,
    getTransportFromTransportsByTransportId,
    removeTransportFromTransportsByTransportId,
    removeTransportsIfUserDisconnected,
    addProducerToProducers,
    getAllProducersExceptThisSocketId,
    getProducers,
    removeProducersIfUserDisconnected,
    addConsumerToConsumers,
    getConsumerById,
    removeConsumerFromConsumers,
    removeConsumersIfUserDisconnected,
    addProducerToPeer,
    addConsumerToPeer,
};