import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStatusHistory extends Document {
  batchId: Types.ObjectId;
  fromStatus: string;
  toStatus: string;
  actorId: Types.ObjectId;
  note: string;
  timestamp: Date;
}

const StatusHistorySchema = new Schema<IStatusHistory>({
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true }
});

export default mongoose.models.StatusHistory || mongoose.model<IStatusHistory>('StatusHistory', StatusHistorySchema);
