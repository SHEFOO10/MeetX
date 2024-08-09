import express from 'express';
import chatController from '../controllers/chatController';

const Router = express.Router();

Router.post('/chat', chatController.sendMessage);
Router.get('/chat', chatController.getMessages);


export default Router;
