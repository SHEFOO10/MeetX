import express from 'express';
import authRoutes from './auth';
import meetingRoutes from './meeting';
import chatRoutes from './chat';

const routes = express.Router();

routes.use(authRoutes);
routes.use(meetingRoutes);
routes.use(chatRoutes);


export default routes;
