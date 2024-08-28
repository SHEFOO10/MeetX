import { Server } from 'socket.io';
import * as mediasoup from 'mediasoup';
import manageRooms from './utils/manageRooms';

export default function signaling(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
  });

  let worker;
  
  const createWorker = async () => {
    worker = await mediasoup.createWorker({
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });
    console.log('Worker Pid:', worker.pid);
    worker.on('died', (error) => {
      console.log('mediasoup worker died. Exit in 2 seconds.', error);
      setTimeout(() => process.exit(1), 2000);
    });
  };

  createWorker(); // Start creating worker

  const connections = io.of('/mediasoup');

  connections.on('connection', async socket => {
    console.log(socket.id)
    socket.emit('connection-success', {
      socketId: socket.id,
    })
  
    const removeItems = (items, socketId, type) => {
      items.forEach(item => {
        if (item.socketId === socket.id) {
          item[type].close()
        }
      })
      items = items.filter(item => item.socketId !== socket.id)
  
      return items
    }
  
    socket.on('disconnect', () => {
      // do some cleanup
      console.log('peer disconnected')
      manageRooms.removeProducersIfUserDisconnected(socket.id)
      manageRooms.removeConsumersIfUserDisconnected(socket.id)
      manageRooms.removeTransportsIfUserDisconnected(socket.id)
  
      if (manageRooms.getPeer(socket.id)) {
        const { roomName } = manageRooms.getPeer(socket.id);
        manageRooms.deletePeer(socket.id)
    
        // remove socket from room
        manageRooms.removePeerFromRoom(roomName, socket.id)
      }
    })
  
    socket.on('joinRoom', async ({ roomName }, callback) => {
      // create Router if it does not exist
      // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
      const router1 = await manageRooms.createRoom(roomName, socket.id)
  
      manageRooms.AddPeer(socket.id, {
        socket,
        roomName,           // Name for the Router this Peer joined
      });
  
      // get Router RTP Capabilities
      const rtpCapabilities = router1.rtpCapabilities
  
      // call callback from the client and send back the rtpCapabilities
      callback({ rtpCapabilities })
    })
  

  
    // Client emits a request to create server side Transport
    socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
      // get Room Name from Peer's properties
      const roomName = manageRooms.getPeer(socket.id).roomName;
  
      // get Router (Room) object this peer is in based on RoomName
      const room = manageRooms.getRoom(roomName);
      const router = room.router
  
  
      manageRooms.createWebRtcTransport(router).then(
        transport => {
          callback({
            params: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            }
          })
  
          // add transport to Peer's properties
          addTransport(transport, roomName, consumer)
        },
        error => {
          console.log(error)
        })
    })
  
    const addTransport = (transport, roomName, consumer) => {
  
      manageRooms.addTranportToTransports(socket.id, transport, roomName, consumer)
  
      manageRooms.addTransportToPeer(socket.id, transport);
    }
  
    const addProducer = (producer, roomName) => {
      manageRooms.addProducerToProducers(socket.id, producer, roomName);
      manageRooms.addProducerToPeer(socket.id, producer);
    }
  
    const addConsumer = (consumer, roomName) => {
      // add the consumer to the consumers list
      manageRooms.addConsumerToConsumers(socket.id, roomName, consumer);
  
      // add the consumer id to the peers list
      manageRooms.addConsumerToPeer(socket.id, consumer);
    }
  
    socket.on('getProducers', callback => {
      //return all producer transports
      const { roomName } = manageRooms.getPeer(socket.id)
  
      let producerList = manageRooms.getAllProducersExceptThisSocketId(socket.id, roomName)
  
      // return the producer list back to the client
      callback(producerList)
    })
  
    const informConsumers = (roomName, socketId, id) => {
      console.log(`just joined, id ${id} ${roomName}, ${socketId}`)
      // A new producer just joined
      // let all consumers to consume this producer
      const producers = manageRooms.getProducers();
      producers.forEach(producerData => {
        if (producerData.socketId !== socketId && producerData.roomName === roomName) {
          const producerSocket = manageRooms.getPeer(producerData.socketId).socket
          // use socket to send producer id to producer
          producerSocket.emit('new-producer', { producerId: id })
        }
      })
    }

    // see client's socket.emit('transport-connect', ...)
    socket.on('transport-connect', ({ dtlsParameters }) => {
      console.log('DTLS PARAMS... ', { dtlsParameters })
      
      manageRooms.getTransportFromTransports(socket.id).connect({ dtlsParameters })
    })
  
    // see client's socket.emit('transport-produce', ...)
    socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
      // call produce based on the prameters from the client
      const producer = await manageRooms.getTransportFromTransports(socket.id).produce({
        kind,
        rtpParameters,
      })
  
      // add producer to the producers array
      const { roomName } = manageRooms.getPeer(socket.id)
  
      addProducer(producer, roomName)
  
      informConsumers(roomName, socket.id, producer.id)
  
      console.log('Producer ID: ', producer.id, producer.kind)
  
      producer.on('transportclose', () => {
        console.log('transport for this producer closed ')
        producer.close()
      })
  
      // Send back to the client the Producer's id
      const producers = manageRooms.getProducers();
      callback({
        id: producer.id,
        producersExist: producers.length>1 ? true : false
      })
    })
  
    // see client's socket.emit('transport-recv-connect', ...)
    socket.on('transport-recv-connect', async ({ dtlsParameters, serverConsumerTransportId }) => {
      console.log(`DTLS PARAMS: ${dtlsParameters}`)
      const consumerTransport = manageRooms.getTransportFromTransportsByTransportId(serverConsumerTransportId);
      await consumerTransport.connect({ dtlsParameters })
    })
  
    socket.on('consume', async ({ rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback) => {
      try {
  
        const { roomName } = manageRooms.getPeer(socket.id)
        const router = manageRooms.getRoom(roomName).router;

        let consumerTransport = manageRooms.getTransportFromTransportsByTransportId(serverConsumerTransportId);
  
        // check if the router can consume the specified producer
        if (router.canConsume({
          producerId: remoteProducerId,
          rtpCapabilities
        })) {
          // transport can now consume and return a consumer
          const consumer = await consumerTransport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true,
          })
  
          consumer.on('transportclose', () => {
            console.log('transport close from consumer')
          })
  
          consumer.on('producerclose', () => {
            console.log('producer of consumer closed')
            socket.emit('producer-closed', { remoteProducerId })
  
            consumerTransport.close([])
            manageRooms.removeTransportFromTransportsByTransportId(consumerTransport.id)
            consumer.close()
            manageRooms.removeConsumerFromConsumers(consumer.id)
          })
  
          addConsumer(consumer, roomName)
  
          // from the consumer extract the following params
          // to send back to the Client
          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id,
          }
  
          // send the parameters to the client
          callback({ params })
        }
      } catch (error) {
        console.log(error.message)
        callback({
          params: {
            error: error
          }
        })
      }
    })
  
    socket.on('consumer-resume', async ({ serverConsumerId }) => {
      console.log('consumer resume')
      const { consumer } = manageRooms.getConsumerById(serverConsumerId);
      await consumer.resume()
    })
  })
  


  return io;
}
