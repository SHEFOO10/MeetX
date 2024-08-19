import express from 'express';
import authRoutes from './auth';
import meetingRoutes from './meeting';
import chatRoutes from './chat';
import path from 'path';
const __dirname = path.resolve();


const routes = express.Router();

routes.use(authRoutes);
routes.use(meetingRoutes);
routes.use(chatRoutes);

routes.get('/signal', (request, response) => {
    return response.render('page');
})

export default routes;
