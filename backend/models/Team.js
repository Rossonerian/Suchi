// Single responsibility: schema for a sub-team (Core Technical, Design & CAD, Social).
import mongoose from 'mongoose';
import { TEAM_KEYS } from '../constants/teams.js';

const teamSchema = new mongoose.Schema(
  {
    key: { type: String, enum: TEAM_KEYS, required: true, unique: true },
    displayName: { type: String, required: true },
    capacity: { type: Number, default: null }, // null = no fixed headcount
  },
  { timestamps: true }
);

export default mongoose.model('Team', teamSchema);
