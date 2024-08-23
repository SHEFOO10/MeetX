const io = require("socket.io-client");
const mediasoupClient = require("mediasoup-client");

const socket = io("/mediasoup");

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
  params = { track, ...params };
};

const getLocalStream = async () => {
  let localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
  } catch (e) {
    localStream = await navigator.mediaDevices.getDisplayMedia({video: true});
  }
  streamSuccess(localStream)
};

const createDevice = async () => {
  device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities });
  console.log('Device capabilites: ', device.rtpCapabilities);

  return device;
};

const getRtpCapabilities = async () => {
  socket.emit("getRouterRtpCapabilities", (rtpCapabilities) => {
    console.log("Router RTP Capabilities:", rtpCapabilities);
    routerRtpCapabilities = rtpCapabilities;
  });
};

const createSendTransport = async () => {
  socket.emit("createWebRtcTransport", { sender: true }, async ({ params }) => {
    if (params.error) {
      console.error(params.error);
      return;
    }
    console.log('Web Rtc params: ', params);
    producerTransport = device.createSendTransport(params);

    producerTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          await socket.emit("transport-connect", {
            dtlsParameters,
          });
          callback();
        } catch (error) {
          console.error(error);
          errback(error);
        }
      }
    );

    producerTransport.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        try {
          await socket.emit(
            "transport-produce",
            {
              kind,
              rtpParameters,
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
});
};

const connectSendTransport = async () => {
  producer = await producerTransport.produce(params);
  producer.on("trackended", () => {
    console.log("Track ended");
  });
  producer.on("transportclose", () => {
    console.log("Transport closed");
  });
};

const createRecvTransport = async () => {
    await socket.emit("createWebRtcTransport", { sender: false }, async ({ params }) => {
        if (params.error) {
        console.error(params.error);
        return;
        }
        console.log('Transport params: ', params);
        consumerTransport = device.createRecvTransport(params);
        consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await socket.emit('transport-recv-connect', { dtlsParameters });
                callback();
            } catch (error) {
                console.error(error);
                errback(error);
            }
        });
    });
};

const connectRecvTransport = async () => {
    await socket.emit('consume', {
        rtpCapabilities: device.rtpCapabilities,
    }, async ({ params }) => {
        if (params.error) {
            console.error('Cannot consume');
            return;
        }
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

btnLocalVideo.addEventListener("click", getLocalStream);
btnRtpCapabilities.addEventListener("click", getRtpCapabilities);
btnDevice.addEventListener("click", createDevice);
btnCreateSendTransport.addEventListener("click", createSendTransport);
btnConnectSendTransport.addEventListener("click", connectSendTransport);
btnRecvSendTransport.addEventListener('click', createRecvTransport);
btnConnectRecvTransport.addEventListener('click', connectRecvTransport);