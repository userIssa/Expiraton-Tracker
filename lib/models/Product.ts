import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  SKU: string;
  category: string;
  unit: string;
  defaultShelfLifeDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  SKU: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  unit: { type: String, required: true, trim: true },
  defaultShelfLifeDays: { type: Number, required: true, min: 0 }
}, {
  timestamps: true
});

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
