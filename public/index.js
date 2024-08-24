const io = require("socket.io-client");
const mediasoupClient = require("mediasoup-client");

const socket = io("/mediasoup");


const roomInput = document.getElementById('roomId');
console.log('room Id:', roomInput.value);

const userType = document.getElementById('userType').value;
console.log(userType)

socket.emit('join-room', roomInput.value)

socket.on("connection-success", ({ socketId }) => {
  console.log('Socket id: ', socketId);
});

let device;
let producerTransport;
let routerRtpCapabilities;
let producer;
let consumer;

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

  if (userType === 'producer') {
    await getLocalStream(); 
    await createSendTransport()
  } else if (userType === 'consumer') {
    await createRecvTransport();
  }
  return device;
};


// Producer flow: 3. send createWebRtcTransport to create
//  webrtc transport on the server and with the returned parameters create sendTransport
const createSendTransport = async () => {
  socket.emit("createWebRtcTransport", { sender: true, roomId: roomInput.value }, async ({ params }) => {
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
          const roomId = roomInput.value;
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
              roomId: roomInput.value
            },
            ({ id }) => {
              callback({ id });
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
const createRecvTransport = async () => {
    await socket.emit("createWebRtcTransport", { sender: false, roomId: roomInput.value }, async ({ params }) => {
        if (params.error) {
        console.error(params.error);
        return;
        }
        console.log('Transport params: ', params);
        consumerTransport = device.createRecvTransport(params);
        consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await socket.emit('transport-recv-connect',
                  {
                    dtlsParameters,
                    roomId: roomInput.value,
                    peerId: socket.id
                   });
                callback();
            } catch (error) {
                console.error(error);
                errback(error);
            }
        });

        connectRecvTransport();
    });
};

// this will sent consume event to the server
//    first i will check if the user can consume
//    and if he can consumer object will be returned
//    and consumer parameters will be sent to the client (which is here)
const connectRecvTransport = async () => {
    await socket.emit('consume', {
        rtpCapabilities: device.rtpCapabilities,
        roomId: roomInput.value,
        peerId: socket.id,

    }, async ({ params }) => {
        if (params.error) {
            console.error('Cannot consume');
            return;
        }
        console.log('Consuming')
        console.log('consume params: ', params);
        consumer = await consumerTransport.consume({
            id: params.id,
            producerId: params.producerId,
            kind: params.kind,
            rtpParameters: params.rtpParameters,
        });;

        const { track } = consumer;
        console.log('Track Recieved: ', track);
        remoteVideo.srcObject = new MediaStream([track]);
        socket.emit('consumer-resume');
        consumer.on('transportclose', () => {
            console.log('Consumer Transport closed');
        });
    });
};


async function init() {
  await getRtpCapabilities();
}

const callBtn = document.getElementById('callBtn');
callBtn.addEventListener('click', async () => {
  await init()
})
