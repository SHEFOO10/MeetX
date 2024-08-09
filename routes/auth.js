import express from 'express';
import authController from '../controllers/authController';


const Router = express.Router();

Router.post('/signup', authController.signUp);

Router.post('/login', authController.login);

Router.get('/logout', authController.logOut);

export default Router;
