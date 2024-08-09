import express from 'express';
import meetingController from '../controllers/meetingController';

const Router = express.Router();

Router.post('/meetings/:id/join', meetingController.joinMeeting);
Router.post('/meetings/:id/end', meetingController.endMeeting);

Router.get('/meetings/:id', meetingController.MeetingDetails);

Router.post('/meetings', meetingController.newMeeting);


export default Router;