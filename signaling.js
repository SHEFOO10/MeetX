import { Server } from 'socket.io';
import * as mediasoup from 'mediasoup'
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
      return worker;
  };
  
  worker = createWorker();
  
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
  


  const mediasoupsocket = io.of('/mediasoup');

  mediasoupsocket.on('connection', async (socket) => {
    let clientRoomId;
    console.log(socket.id);
    socket.emit('connection-success', { socketId: socket.id }, (roomId) => {
        clientRoomId = roomId
    });
    socket.on('disconnect', async () => {
        console.log('Client disconnected');
        const room = manageRooms.getRoom(clientRoomId)
        if (room) {
            room.removeProducersIfClientDisconnected(mediasoupsocket, socket.id);
            console.log(room.getProducers())
            console.log(room.getConsumers())
        }
    });
    
    socket.on('getRouterRtpCapabilities', async (callback) => {
        const router = await worker.createRouter({ mediaCodecs });
        callback(router.rtpCapabilities);
        router.close()
    });


    // handle createWebRtcTransport event and return transport parameters to the client side
    socket.on('createWebRtcTransport',  async ({consumer, roomId}, callback) => {
        console.log(`Is this a consumer request? ${consumer} and roomid: ${roomId}`);

        if (consumer) {
            await manageRooms.handlePeerConnection(socket.id, roomId, 'consumer', callback);
        } else {
            await manageRooms.handlePeerConnection(socket.id, roomId, 'producer', callback);
        }
        // console.log(room.peers);
        // console.log(room.peers.get(socket.id))
        // console.log(room.getPeer(socket.id).transports) 
        // rooms.forEach(room => console.log(room))
        // console.log('Consumers:',consumers)
        // console.log('Producers:', producers)
    });

    // when connect event is triggered on the client side it will send dtls parameters and we connect
    socket.on('transport-connect', async ({ dtlsParameters, peerId, roomId }) => {
        const room = await manageRooms.getOrCreateRoom(roomId);
        const producerPeer = room.getPeer(peerId);
        await producerPeer.transports.sendTransport.connect({dtlsParameters});
    });

    // after connecting client side will send this parameters and server will call produce method with them
    // and return producer id to the client side
    socket.on('transport-produce', async ({ kind, rtpParameters, peerId, roomId }, callback) => {
        const room = await manageRooms.getOrCreateRoom(roomId);
        // console.log(room.getPeer(peerId));
        const producerPeer = room.getPeer(peerId);
        const producerTransport = producerPeer.transports.sendTransport;
        const producer = await producerTransport.produce({
            kind,
            rtpParameters,
        });

        // add New Producer to the Room
        room.addNewProducerToRoom(producer, producerTransport, socket.id)
        
        console.log('New Producer Id:', producer.id)
        producer.on('transportclose', () => {
            console.log('Producer Transport closed');
            producer.close();
        });

        callback({ id: producer.id, producersExists: room.producers.length > 1 ? true : false });
    });


    // after we check that the user can consume he will send dtls parameters
    // from connect event on recvTransport which is triggered by consume in client side
    socket.on('transport-recv-connect', async ({ dtlsParameters, roomId, peerId, producerId }) => {
        const room = await manageRooms.getOrCreateRoom(roomId);
        const socketId = peerId;
        console.log(`socketid: ${socketId}, producerId: ${producerId}`)
        const consumerTransport = room.getPeerConsumerByProducerId(socketId, producerId).consumerTransport;
        await consumerTransport.connect({ dtlsParameters });
    });


    // check if the user can consume, call consume method and return consumer parameters
    // to the client side to call consume with them 
    socket.on('consume', async ({ rtpCapabilities, roomId, socketId, producerId}, callback) => {
        const room = await manageRooms.getOrCreateRoom(roomId);
        console.log('consume event: => consumerTransport:', room.getPeerRecentProducer(socketId))
        const consumerTransport = room.getPeerRecentProducer(socketId).consumerTransport;
    
        try {
            if (room.router.canConsume({
                producerId,
                rtpCapabilities,
            })) {
                const consumer = await consumerTransport.consume({
                    producerId,
                    rtpCapabilities,
                    paused: true,
                });
                consumer.on('transportclose', () => {
                    console.log('Consumer Transport closed');
                    consumer.close();
                });
                consumer.on('producerclose', () => {
                    console.log('producer of consumer closed');
                    mediasoupsocket.to(socketId).emit('producerOfConsumerClosed', { consumerId: consumer.id });
                    consumer.close();
                });

                room.UpdateRecentProducer(socket.id, producerId, consumer.id)
                room.addNewConsumerToRoom(consumer, consumerTransport, socket.id, producerId)
                const params = {
                    id: consumer.id,
                    producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                }
                callback({ params });
            
            
                // we paused the stream when consume process after everything is right
                // we sent event to resume the stream
                socket.on('consumer-resume', async (consumerId) => {
                    const consumer = room.getConsumerById(consumerId).consumerObj
                    await consumer.resume();
                });
            
            }
            else {
                console.log('can\'t consume')
            }
        } catch (error) {
            console.error(error);
            callback({ error: error.message });
        }
    });




    // recieve room id
    socket.on('join-room', (roomId) => {
        console.log(roomId);
    });

    socket.on('NewProducerJoined', ({id}) => {
        socket.broadcast.emit('NewProducerJoined', {id, socketId: socket.id});
    });

    socket.on('getProducers', async (roomId, callback) => {
        const room = await manageRooms.getOrCreateRoom(roomId);
        const clientProducer = room.getProducerBySocketId(socket.id)
        const availableProducers = room.getProducers().filter((producer) => {
            return producer.id !== clientProducer.id;
        });
        callback(availableProducers)
    });

    socket.on('producerClosed', async ({clientRoomId, clientProducerId}) => {
        console.log(clientRoomId)
        const room = await manageRooms.getRoom(clientRoomId);
        const producer = room.getProducerById(clientProducerId).producer;
        // console.log(producer);
        console.log('Closing Producer Id:', clientProducerId)
        producer.close();
        // const peer = room.getPeer(socket.id)
        // console.log(peer.producers)
        // const producer = room.getProducerById(producerId)
        // console.log(producer);
    })
  })

  return io;
}
