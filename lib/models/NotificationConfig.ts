import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationConfig extends Document {
  digestFrequency: 'daily' | 'weekly' | 'none';
  recipients: string[];
  alertThresholdDays: number;
  enabledUrgencyColors: ('green' | 'yellow' | 'orange' | 'red' | 'maroon')[];
}

const NotificationConfigSchema = new Schema<INotificationConfig>({
  digestFrequency: { 
    type: String, 
    enum: ['daily', 'weekly', 'none'], 
    default: 'daily' 
  },
  recipients: [{ type: String, trim: true }],
  alertThresholdDays: { type: Number, default: 7, min: 1 },
  enabledUrgencyColors: [{ 
    type: String, 
    enum: ['green', 'yellow', 'orange', 'red', 'maroon'],
    default: ['red', 'maroon']
  }]
}, {
  timestamps: true
});

export default mongoose.models.NotificationConfig || mongoose.model<INotificationConfig>('NotificationConfig', NotificationConfigSchema);
