// Single responsibility: schema for a task tracked on the dashboard.
import mongoose from 'mongoose';

const STATUSES = ['todo', 'in-progress', 'blocked', 'done'];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    status: { type: String, enum: STATUSES, default: 'todo' },
    subProblemRef: { type: Number, min: 1, max: 15, default: null }, // links to the 15 sub-problem breakdown
    dueDate: { type: Date, default: null },
    highlighted: { type: Boolean, default: false }, // flagged by any member as important — visible to everyone
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
export { STATUSES as STATUSES };