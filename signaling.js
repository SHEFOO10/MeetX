import { Server } from 'socket.io';
import * as mediasoup from 'mediasoup'
// import manageRooms from './utils/manageRooms';

export default function signaling(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle offer
    socket.on('offer', (data) => {
      const { target, offer } = data;
      socket.to(target).emit('offer', { sender: socket.id, offer });
    });

    // Handle answer
    socket.on('answer', (data) => {
      const { target, answer } = data;
      socket.to(target).emit('answer', { sender: socket.id, answer });
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
      const { target, candidate } = data;
      socket.to(target).emit('ice-candidate', { sender: socket.id, candidate });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });

    // socket.on('join-room', async (roomId) => {
    //     await manageRooms.handlePeerConnection(1, roomId);
    // })
    // socket.on('room-leave', (roomId) => {
    //   manageRooms.handlePeerDisconnection(1, roomId);
    // });
    
  });



  let worker;
  let router;
  let producerTransport;
  let consumerTransport;
  let producer;
  let consumer;
  
  
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
  
  const createWebRtcTransport = async (callback) => {
      try {
          const webRtcOptions = {
              listenIps: [
                  {
                      ip: '0.0.0.0',
                      announcedIp: '20.103.221.187',
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



    socket.on('createWebRtcTransport',  async ({sender}, callback) => {
        console.log(`Is this a sender request? ${sender}`);
        if (sender) {
            producerTransport = await createWebRtcTransport(callback);
        } else {
            consumerTransport = await createWebRtcTransport(callback);
        }
    });

    socket.on('transport-connect', async ({ dtlsParameters }) => {
        await producerTransport.connect({ dtlsParameters });
    });

    socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
        producer = await producerTransport.produce({
            kind,
            rtpParameters,
        });

        console.log(`Producer id: ${producer.id}`);
        producer.on('transportclose', () => {
            console.log('Producer Transport closed');
            producer.close();
        });

        callback({ id: producer.id });
    });

    socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
            await consumerTransport.connect({ dtlsParameters });
    });


    socket.on('consume', async ({ rtpCapabilities }, callback) => {
        try {
            if (router.canConsume({
                producerId: producer.id,
                rtpCapabilities,
            })) {
                consumer = await consumerTransport.consume({
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
            }
        } catch (error) {
            console.error(error);
            callback({ error: error.message });
        }
    });

    socket.on('consumer-resume', async () => {
        await consumer.resume();
    });
  })

  return io;
}
