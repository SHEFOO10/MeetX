import { Server } from 'socket.io';

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
  });

  return io;
}
