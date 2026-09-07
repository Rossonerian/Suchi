// Single responsibility: schema for a team's uploaded plan/progress entry.
// A plan is text content, an optional file link (Drive/Notion/etc.), tagged
// to a phase and a date — this is the daily-accountability record per team.
import mongoose from 'mongoose';
import { PHASES } from '../constants/phases.js';

const planSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, trim: true, default: '' },
    fileUrl: { type: String, trim: true, default: '' },
    phase: { type: String, enum: PHASES, default: 'simulation' },
    forDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);