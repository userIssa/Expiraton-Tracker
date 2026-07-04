import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryThreshold extends Document {
  category: string;
  greenMinDays: number;
  yellowMinDays: number;
  orangeMinDays: number;
  redMinDays: number;
}

const CategoryThresholdSchema = new Schema<ICategoryThreshold>({
  category: { type: String, required: true, unique: true, trim: true },
  greenMinDays: { type: Number, required: true, min: 0 },
  yellowMinDays: { type: Number, required: true, min: 0 },
  orangeMinDays: { type: Number, required: true, min: 0 },
  redMinDays: { type: Number, required: true, min: 0 }
});

export default mongoose.models.CategoryThreshold || mongoose.model<ICategoryThreshold>('CategoryThreshold', CategoryThresholdSchema);
