import express from 'express';
import passport from 'passport';
import passportConfig from '../auth/passport'
import authController from '../controllers/authController';


const Router = express.Router();

Router.post('/signup', authController.signUp);

Router.post('/login', passport.authenticate('local'), authController.loggedIn);


Router.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}));

Router.get('/auth/google/callback', passport.authenticate('google'), authController.loggedIn);

Router.get('/logout', authController.logOut);

Router.get('/profile', authController.profile);

export default Router;
