// Server-side opaque sessions. Only a SHA-256 digest is persisted; the raw
// value exists solely in the HttpOnly browser cookie.
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

// Mongo removes expired sessions eventually; middleware also checks the date so
// an expired session cannot remain usable while the TTL monitor is pending.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Session', sessionSchema);
