import mongoose, { Schema, Document, Types } from 'mongoose';

export type UrgencyColor = 'green' | 'yellow' | 'orange' | 'red' | 'maroon';

export interface IBatch extends Document {
  productId: Types.ObjectId;
  batchNumber: string;
  quantity: number;
  location: string;
  purchaseDate: Date;
  manufactureDate: Date;
  expiryDate: Date;
  status: 'active' | 'cleared' | 'escalated' | 'expired';
  currentUrgencyColor: UrgencyColor;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  batchNumber: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  location: { type: String, required: true, trim: true, index: true },
  purchaseDate: { type: Date, required: true },
  manufactureDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true, index: true },
  status: { 
    type: String, 
    enum: ['active', 'cleared', 'escalated', 'expired'], 
    default: 'active',
    index: true
  },
  currentUrgencyColor: { 
    type: String, 
    enum: ['green', 'yellow', 'orange', 'red', 'maroon'], 
    default: 'green' 
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export default mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);
