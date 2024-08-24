import mediasoup from 'mediasoup';

class Room {
    constructor(roomId, worker) {
      this.roomId = roomId;
      this.worker = worker;
      this.router = null;
      this.peers = new Map(); // Store peers connected to this room
      this.producers = [];
    }
  
    async init() {
      // Create a router for this room
      this.router = await this.worker.createRouter({
        mediaCodecs: [
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
        ],
      });
    }
  
    async createWebRtcTransport() {
      const transport = await this.router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0',
           announcedIp: 'upgraded-space-happiness-x4xvp9q7v9r2997j-5000.app.github.dev'
           }], // Replace with your server's public IP
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });
  
      return transport;
    }
  
    addPeer(peerId) {
      this.peers.set(peerId, { transports: {}, producers: [], consumers: [] });
    }
  
    removePeer(peerId) {
      this.peers.delete(peerId);
    }
  
    getPeer(peerId) {
      return this.peers.get(peerId);
    }

    getProducers() {
      return this.producers;
    }
  
  }
  
  export default Room;