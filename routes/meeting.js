import express from 'express';
import meetingController from '../controllers/meetingController';

const Router = express.Router();

Router.get('/meetings/:id/join', meetingController.joinMeeting);
Router.get('/meetings/:id/end', meetingController.endMeeting);

Router.get('/meetings/:id', meetingController.MeetingDetails);

Router.post('/meetings', meetingController.newMeeting);
Router.get('/meetings', meetingController.CreateMeeting)

export default Router;