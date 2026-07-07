import dbConnect from '../../lib/mongodb';
import Batch from '../../lib/models/Batch';
import Product from '../../lib/models/Product';
import CategoryThreshold from '../../lib/models/CategoryThreshold';
import NotificationConfig from '../../lib/models/NotificationConfig';
import StatusHistory from '../../lib/models/StatusHistory';
import { calculateUrgencyColor } from '../../lib/urgency';
import { sendDigestEmail } from '../../lib/resend';

export default async function handler() {
  console.log('Starting scheduled nightly batch update job...');
  
  try {
    await dbConnect();
    const _forceProduct = Product;

    // 1. Fetch all non-cleared batches
    const batches = await Batch.find({ status: { $ne: 'cleared' } }).populate('productId');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiredCount = 0;
    let colorRecalculatedCount = 0;

    for (const batch of batches) {
      const originalStatus = batch.status;
      const originalColor = batch.currentUrgencyColor;
      
      const expiryMidnight = new Date(batch.expiryDate);
      expiryMidnight.setHours(0, 0, 0, 0);

      // Auto-transition to expired if past expiry date
      let statusChanged = false;
      if (expiryMidnight <= today && originalStatus !== 'expired') {
        batch.status = 'expired';
        statusChanged = true;
        expiredCount++;
      } else if (expiryMidnight > today && originalStatus === 'expired') {
        // Return to active if expiry was modified to the future
        batch.status = 'active';
        statusChanged = true;
      }

      // Recalculate Urgency Color
      const productDoc = batch.productId;
      if (productDoc) {
        let threshold = await CategoryThreshold.findOne({ category: productDoc.category });
        if (!threshold) {
          threshold = await CategoryThreshold.create({
            category: productDoc.category,
            greenMinDays: 30,
            yellowMinDays: 15,
            orangeMinDays: 7,
            redMinDays: 3,
          });
        }
        const newColor = calculateUrgencyColor(batch.expiryDate, threshold);
        if (newColor !== originalColor) {
          batch.currentUrgencyColor = newColor;
          colorRecalculatedCount++;
        }
      }

      // Save batch changes
      if (statusChanged || batch.isModified('currentUrgencyColor')) {
        await batch.save();

        if (statusChanged) {
          // Log status transition in audit logs
          await StatusHistory.create({
            batchId: batch._id,
            fromStatus: originalStatus,
            toStatus: batch.status,
            actorId: null, // null represents system/automated job
            note: 'Automated nightly expiration transition.',
            timestamp: new Date(),
          });
        }
      }
    }

    console.log(`Successfully updated batches. Expired: ${expiredCount}, Color Recalculated: ${colorRecalculatedCount}`);

    // 2. Process Email Alerts configurations
    const config = await NotificationConfig.findOne();
    if (config && config.digestFrequency !== 'none') {
      const isDaily = config.digestFrequency === 'daily';
      const isWeekly = config.digestFrequency === 'weekly' && new Date().getDay() === 0; // Weekly on Sunday

      if (isDaily || isWeekly) {
        // Find active/escalated batches matching enabled colors
        const alertBatches = await Batch.find({
          status: { $in: ['active', 'escalated'] },
          currentUrgencyColor: { $in: config.enabledUrgencyColors }
        }).populate('productId');

        if (alertBatches.length > 0) {
          console.log(`Sending digest email to ${config.recipients.join(', ')} with ${alertBatches.length} items...`);
          
          const emailItems = alertBatches.map((b: any) => ({
            batchNumber: b.batchNumber,
            productName: b.productId?.name || 'Unknown Product',
            SKU: b.productId?.SKU || 'N/A',
            quantity: b.quantity,
            unit: b.productId?.unit || 'units',
            expiryDate: b.expiryDate,
            location: b.location,
            currentUrgencyColor: b.currentUrgencyColor,
          }));

          const frequencyLabel = isDaily ? 'Daily' : 'Weekly';
          await sendDigestEmail(
            config.recipients,
            `ExpireGuard Pro - ${frequencyLabel} Inventory Expiration Digest (${alertBatches.length} alerts)`,
            emailItems
          );
        } else {
          console.log('No batches matching alert criteria. Skipping digest email.');
        }
      } else {
        console.log(`Current frequency is ${config.digestFrequency}. No digest email scheduled for today.`);
      }
    } else {
      console.log('Mailing digests are disabled or not configured.');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Nightly batch check ran successfully',
        expiredCount,
        colorRecalculatedCount
      }),
    };
  } catch (error: any) {
    console.error('Nightly update job failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Netlify V2 config schedule
export const config = {
  schedule: '0 0 * * *', // Run nightly at midnight
};
