import express from 'express';
import meetingController from '../controllers/meetingController';

const Router = express.Router();

Router.get('/meetings/:id/join', meetingController.joinMeeting);
Router.get('/meetings/:id/end', meetingController.endMeeting);

Router.get('/meetings/:id', meetingController.MeetingDetails);

Router.post('/meetings', meetingController.newMeeting);
Router.get('/meetings', meetingController.CreateMeeting)


Router.get('/join-room/:id/consume', (req, res) => {
    return res.render('consume', {roomId: req.params.id});
})

Router.get('/join-room/:id/produce', (req, res) => {
    return res.render('producer', {roomId: req.params.id});
})

export default Router;