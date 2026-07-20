import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'store-hand' | 'supervisor' | 'manager' | 'quality-assurance' | 'superadmin';
  assignedLocations: string[];
  notifyByEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['store-hand', 'supervisor', 'manager', 'quality-assurance', 'superadmin'], 
    default: 'store-hand' 
  },
  assignedLocations: { type: [String], default: [] },
  notifyByEmail: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
