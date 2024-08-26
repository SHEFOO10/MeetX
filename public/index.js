const io = require("socket.io-client");
const mediasoupClient = require("mediasoup-client");

const socket = io("/mediasoup");


const clientRoomId = document.getElementById('roomId').value;
const videoContainer = document.getElementById('videoContainer');


socket.on("connection-success", ({ socketId }) => {
  console.log('Socket id: ', socketId);
});

socket.on('NewProducerJoined', ({id, socketId}) => {
  if (socket.id !== socketId)
    consumeProducer({id});
})


let device;
let producer;
let producerTransport;

let routerRtpCapabilities;
let consumers = [];

let params = {
  encoding: [
    {
      rid: "r0",
      maxBitrate: 100000,
      scalabilityMode: "S1T3",
    },
    {
      rid: "r1",
      maxBitrate: 300000,
      scalabilityMode: "S1T3",
    },
    {
      rid: "r2",
      maxBitrate: 900000,
      scalabilityMode: "S1T3",
    },
  ],
  codecOptions: {
    videoGoogleStartBitrate: 1000,
  },
};

function AddConsumer(consumer, consumerTransport, socketId, roomId) {
  consumers = [
    ...consumers,
    {socketId, consumer, consumerTransport, roomId}
  ]
}

const streamSuccess = (stream) => {
  localVideo.srcObject = stream;
  const track = stream.getVideoTracks()[0];
  videoParams = { track, ...params };
};

// Producer flow: 0. get the stream
const getLocalStream = async () => {
  let localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
  } catch (e) {
    localStream = await navigator.mediaDevices.getDisplayMedia({video: true});
  }
  streamSuccess(localStream)
};


// Producer/ Consumer flow: 1. get rtpCapabilities from the server
const getRtpCapabilities = async () => {
  socket.emit("getRouterRtpCapabilities", (rtpCapabilities) => {
    console.log("Router RTP Capabilities:", rtpCapabilities);
    routerRtpCapabilities = rtpCapabilities;
    createDevice();
  });
};

// Producer/ Consumer flow: 2. create and load the device with rtpCapabilities
const createDevice = async () => {
  device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities });
  console.log('Device capabilites: ', device.rtpCapabilities);


  await getLocalStream(); 
  await createSendTransport()

  return device;
};


async function getProducers() {
  return new Promise((resolve, reject) => {
    socket.emit('getProducers', clientRoomId, (producers) => {
      resolve(producers)
    });

  })
}

// Producer flow: 3. send createWebRtcTransport to create
//  webrtc transport on the server and with the returned parameters create sendTransport
const createSendTransport = async () => {
  socket.emit("createWebRtcTransport", { consumer: false, roomId: clientRoomId }, async ({ params }) => {
    if (params.error) {
      console.error(params.error);
      return;
    }
    console.log('Web Rtc params: ', params);
    producerTransport = device.createSendTransport(params);
  

    // after produce method called 'connect' event will be triggered
    producerTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.log('DTLS Paramters:', dtlsParameters)
        try {
          const roomId = clientRoomId;
          await socket.emit("transport-connect", {
            dtlsParameters,
            peerId: socket.id,
            roomId
          });
          callback();
        } catch (error) {
          console.error(error);
          errback(error);
        }
      }
    );

    // then 'produce' event will be triggered
    producerTransport.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        try {
          await socket.emit(
            "transport-produce",
            {
              kind,
              rtpParameters,
              peerId: socket.id,
              roomId: clientRoomId
            },
            ({ id, producersExists }) => {
              callback({ id });
              
              socket.emit('NewProducerJoined', {id})
              if (producersExists) {
                getProducers().then(producers => {
                  producers.forEach(consumeProducer);
                });
              };

            }
          );
        } catch (error) {
          console.error(error);
          errback(error);
        }
      }
    );

    
    connectSendTransport();
});
};

// this function will triggers connect and produce events 
const connectSendTransport = async () => {
  producer = await producerTransport.produce(videoParams);
  producer.on("trackended", () => {
    console.log("Track ended");
  });
  producer.on("transportclose", () => {
    console.log("Transport closed");
  });
};


// Consumer flow: 3. create webrtc transport on the server
//    and create recvTransport on client with parameters of server webrtc transport
const consumeProducer = async (producer) => {
    await socket.emit("createWebRtcTransport", { consumer: true, roomId: clientRoomId }, async ({ params }) => {
        if (params.error) {
        console.error(params.error);
        return;
        }
        console.log('Transport params: ', params);
        const consumerTransport = device.createRecvTransport(params);
        consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
               console.log('producer:', producer)
                await socket.emit('transport-recv-connect',
                  {
                    dtlsParameters,
                    roomId: clientRoomId,
                    peerId: socket.id,
                    producerId: producer.id
                   });
                callback();
            } catch (error) {
                console.error(error);
                errback(error);
            }
        });

        connectRecvTransport(consumerTransport, producer.id);
    });
};

// this will sent consume event to the server
//    first i will check if the user can consume
//    and if he can consumer object will be returned
//    and consumer parameters will be sent to the client (which is here)
const connectRecvTransport = async (consumerTransport, producerId, clientConsumerId) => {
    await socket.emit('consume', {
        rtpCapabilities: device.rtpCapabilities,
        roomId: clientRoomId,
        socketId: socket.id,
        producerId,
        clientConsumerId
    }, async ({ params }) => {
        if (params.error) {
            console.error('Cannot consume');
            return;
        }
        console.log('Consuming')
        console.log('consume params: ', params);
        const consumer = await consumerTransport.consume({
            id: params.id,
            producerId: params.producerId,
            kind: params.kind,
            rtpParameters: params.rtpParameters,
        });;

        AddConsumer(consumer, consumerTransport, socket.id, clientRoomId)
        const { track } = consumer;
        console.log('Track Recieved: ', track);
        const video = document.createElement('video');
        video.style = 'background-color: black;'
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = new MediaStream([track]);
        videoContainer.appendChild(video);
        socket.emit('consumer-resume', consumer.id);
        consumer.on('transportclose', () => {
            console.log('Consumer Transport closed');
        });
    });
};


async function init() {
  await getRtpCapabilities();
}

const endCallBtn = document.getElementById('endCallBtn');
endCallBtn.addEventListener('click', async () => {
if (producerTransport)
  producerTransport.close()
if (producer)
  producer.close()
})

init();