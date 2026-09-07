// Single responsibility: schema for a scheduled meeting.
import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    agenda: { type: String, trim: true, default: '' },
    meetLink: { type: String, trim: true, default: '' },
    scheduledAt: { type: Date, required: true },
    invitees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true }],
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    emailStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    emailAttempts: { type: Number, min: 0, default: 0 },
    lastEmailAttemptAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Meeting', meetingSchema);
