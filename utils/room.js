import mediasoup from 'mediasoup';

class Room {
    constructor(roomId, worker) {
      this.roomId = roomId;
      this.worker = worker;
      this.router = null;
      this.peers = new Map(); // Store peers connected to this room
      this.producers = [];
      this.consumers = [];
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
      this.peers.set(peerId, { transports: {}, producers: [], consumers: [],  });
    }
  
    removePeer(peerId) {
      this.peers.delete(peerId);
    }
  
    getPeer(peerId) {
      return this.peers.get(peerId);
    }

    getPeerRecentProducer(socketId) {
      const peerId = socketId;
      const producer = this.peers.get(peerId).producers.filter(producer => (producer.producerId === null && producer.consumerId === null && producer.socketId == socketId))[0]
      return producer
    }

    getPeerConsumerByProducerId(socketId, producerId) {
      const peerId = socketId;
      return this.peers.get(peerId).producers.find(producer => producer.producerId === producerId)
    }

    UpdateRecentProducer(socketId, producerId, consumerId) {
      const peerId = socketId;
      const producer = this.peers.get(peerId).producers.find(producer => (producer.producerId === null && producer.consumerId === null && producer.socketId == socketId))
      producer.producerId = producerId;
      producer.consumerId = consumerId;
    }
    getConsumerById(consumerId) {
      console.log('getConsumerById consumers:', this.consumers)
      return this.consumers.find(consumer => {
        return consumer.id === consumerId
      })
    }

    getProducerById(producerId) {
      return this.producers.find(producer => producer.id === producerId)
    }

    getConsumerBySocketId(socketId) {
      return this.consumers.find(consumer => consumer.socketId === socketId)
    }

    getProducerBySocketId(socketId) {
      return this.producers.find(producer => producer.socketId === socketId)
    }

    getProducers() {
      return this.producers;
    }

    addNewConsumerToRoom(consumer, consumerTransport, socketId, producerId) {
      this.consumers.push({
        id: consumer.id,
        consumerObj: consumer,
        consumerTransport,
        socketId,
        producerId
      })
    }

    addNewProducerToRoom(producerId, producerTransport, socketId) {
      this.producers.push({
        id: producerId,
        producerTransport,
        socketId
      })
    }
  
  }
  
  export default Room;