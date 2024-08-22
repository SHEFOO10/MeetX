import mongoose from 'mongoose';

// Define Meeting Schema
const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  producers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    kind: {
      type: String, // e.g., 'audio', 'video', 'data'
      required: true
    },
    producerId: {
      type: String, // The ID assigned by Mediasoup for this producer
      required: true
    },
    transportId: {
      type: String, // The transport ID used by this producer
      required: true
    }
  }]
});


// Create and export the model
const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
