// Single responsibility: schema for a team member. Legacy documents may not
// yet have a password/status/role, but they cannot authenticate until an
// administrator issues an invitation or bootstraps access.
import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true, unique: true }, // case-insensitive uniqueness
    // Sparse keeps legacy name-only records loadable while the migration is
    // completed; all newly created/activated members still require an email.
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, sparse: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    passwordHash: { type: String, select: false, default: null },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    status: { type: String, enum: ['invited', 'active', 'disabled'], default: 'invited' },
  },
  { timestamps: true }
);

memberSchema.pre('validate', function setNameLower(next) {
  if (this.name) this.nameLower = this.name.trim().toLowerCase();
  if (this.email) this.email = this.email.trim().toLowerCase();
  next();
});

export default mongoose.model('Member', memberSchema);
