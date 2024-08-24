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
  let router;
  let producerTransport;
  let consumerTransport;
  
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
  
  // create webrtc Transport on the server
  const createWebRtcTransport = async (callback) => {
      try {
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
  
          const transport = await router.createWebRtcTransport(webRtcOptions);
          console.log(`WebRtcTransport created: ${transport.id}`);
          transport.on('dtlsstatechange', (dtlsState) => {
              if (dtlsState === 'closed') {
                  console.log('WebRtcTransport closed');
                  transport.close();
              }
          });
          transport.on('close', () => {
              console.log('WebRtcTransport closed');
          });

          // sending transport parameters to the client side
          callback({ params: { 
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
           } });
           return transport;
      } catch (error) {
          console.error(error);
          callback({ params: { error: error.message } });
      }
  };
  
  







  const mediasoupsocket = io.of('/mediasoup');

  mediasoupsocket.on('connection', async (socket) => {
    console.log(socket.id);
    socket.emit('connection-success', { socketId: socket.id });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
    router = await worker.createRouter({ mediaCodecs });
    
    socket.on('getRouterRtpCapabilities', (callback) => {
        callback(router.rtpCapabilities);
    });


    // handle createWebRtcTransport event and return transport parameters to the client side
    socket.on('createWebRtcTransport',  async ({sender, roomId}, callback) => {
        console.log(`Is this a sender request? ${sender} and roomid: ${roomId}`);

        if (sender) {
            await manageRooms.handlePeerConnection(socket.id, roomId, 'producer', callback);
        } else {
            await manageRooms.handlePeerConnection(socket.id, roomId, 'consumer', callback);
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
        // console.log(producerPeer)
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

        console.log(`Producer id: ${producer.id}`);
        room.producers.push({id: producer.id, producerPeer})
        producer.on('transportclose', () => {
            console.log('Producer Transport closed');
            producer.close();
        });

        callback({ id: producer.id });
    });


    // after we check that the user can consume he will send dtls parameters
    // from connect event on recvTransport which is triggered by consume in client side
    socket.on('transport-recv-connect', async ({ dtlsParameters, roomId, peerId }) => {
        const room = await manageRooms.getOrCreateRoom(roomId);
        const consumerTransport = room.getPeer(peerId).transports.recvTransport;
        await consumerTransport.connect({ dtlsParameters });
    });


    // check if the user can consume, call consume method and return consumer parameters
    // to the client side to call consume with them 
    socket.on('consume', async ({ rtpCapabilities, roomId, peerId, producerId}, callback) => {
        const room = await manageRooms.getOrCreateRoom(roomId);
        const consumerTransport = room.getPeer(peerId).transports.recvTransport;
        const producer = room.getProducers()[0];

        console.log(room.router.canConsume({
            producerId: producer.id,
            rtpCapabilities,
        }))
        try {
            if (room.router.canConsume({
                producerId: producer.id,
                rtpCapabilities,
            })) {
                const consumer = await consumerTransport.consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: true,
                });
                consumer.on('transportclose', () => {
                    console.log('Consumer Transport closed');
                    consumer.close();
                });
                consumer.on('producerclose', () => {
                    console.log('producer of consumer closed');
                    consumer.close();
                });

                const params = {
                    id: consumer.id,
                    producerId: producer.id,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                }
                callback({ params });
            
            
                // we paused the stream when consume process after everything is right
                // we sent event to resume the stream
                socket.on('consumer-resume', async () => {
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
  })

  return io;
}
