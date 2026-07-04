import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEscalation extends Document {
  batchId: Types.ObjectId;
  raisedBy: Types.ObjectId;
  assignedTo: Types.ObjectId;
  reason: string;
  status: 'open' | 'in_review' | 'resolved';
  resolutionNote?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const EscalationSchema = new Schema<IEscalation>({
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
  raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['open', 'in_review', 'resolved'], 
    default: 'open',
    index: true
  },
  resolutionNote: { type: String },
  resolvedAt: { type: Date }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.models.Escalation || mongoose.model<IEscalation>('Escalation', EscalationSchema);
