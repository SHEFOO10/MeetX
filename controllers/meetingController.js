const { NotImplemented } = require('../utils/response');
import Meeting from '../models/meetings';

class meetingController {

  static CreateMeeting(request, response) {
    return response.render('newMeeting');
  }

  static async newMeeting(request, response) {
    try {
      const { title, description, participants, endTime } = request.body;

      const host = request.user.id;
      const startTime = new Date();

      const newMeeting = new Meeting({
        title,
        description,
        host,
        participants,
        startTime,
        endTime
      });

      await newMeeting.save();
      return response.status(201).json({ message: 'Meeting created successfully', meeting: newMeeting });
    } catch (error) {
      console.log(error);
      response.status(500).json({ message: 'Error creating meeting', error });
    }
  }

  static async joinMeeting(request, response) {
    try {
      console.log(request.params)
      const { id: meetingId } = request.params;
      const { userId } = request.user.id; // User ID of the participant
  
      console.log(meetingId)
      const meeting = await Meeting.findById(meetingId);
      console.log(meeting);
      if (!meeting) {
        return response.status(404).json({ message: 'Meeting not found' });
      }
  
      if (meeting.participants.includes(userId)) {
        return response.status(400).json({ message: 'User already joined the meeting' });
      }

      const currentDate = new Date();
      if (meeting.endTime <= currentDate)
        return response.status(410).send({message: 'Meeting ended'});
  
      meeting.participants.push(userId);
      await meeting.save();
  
      response.status(200).json({ message: 'User joined the meeting successfully', meeting });
    } catch (error) {
      response.status(500).json({ message: 'Error joining meeting', error });
    }
}

  static async MeetingDetails(request, response) {
    try {
      const { id: meetingId } = request.params;
  
      const meeting = await Meeting.findById(meetingId).populate('host participants');
  
      if (!meeting) {
        return response.status(404).json({ message: 'Meeting not found' });
      }
  
      return response.status(200).json({ meeting });
    } catch (error) {
      return response.status(500).json({ message: 'Error retrieving meeting details', error });
    }
}

  static async endMeeting(request, response) {
    try {
      const { id: meetingId } = request.params;
  
      const meeting = await Meeting.findById(meetingId);
  
      if (!meeting) {
        return response.status(404).json({ message: 'Meeting not found' });
      }
  
      const endTime = new Date();
      meeting.endTime = endTime;
      await meeting.save();
  
      return response.status(200).json({ message: 'Meeting ended successfully', meeting });
    } catch (error) {
      return response.status(500).json({ message: 'Error ending meeting', error });
    }
}
}

export default meetingController;
