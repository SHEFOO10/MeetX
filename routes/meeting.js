import express from 'express';
import meetingController from '../controllers/meetingController';

const Router = express.Router();

Router.get('/meetings/:id/join', meetingController.joinMeeting);
Router.get('/meetings/:id/end', meetingController.endMeeting);

Router.get('/meetings/:id', meetingController.MeetingDetails);

Router.post('/meetings', meetingController.newMeeting);
Router.get('/meetings', meetingController.CreateMeeting)




Router.get('/join-room/:id/produce', (req, res) => {
    return res.render('producer', {roomId: req.params.id});
})

Router.get('/join-room/:id', (req, res) => {
    const roomId = req.params.id;
    return res.send(`<html><head><style>a {margin-inline: 20px;padding: 4px;  text-decoration: none; background-color: black; color: white;}</style></head><body><a href="/join-room/${roomId}/produce">produce</a></body></html>`)
})

export default Router;