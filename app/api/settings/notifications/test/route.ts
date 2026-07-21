import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NotificationConfig from '@/lib/models/NotificationConfig';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import { sendDigestEmail } from '@/lib/resend';
import { getCurrentUser } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only managers and admins can trigger test digests' },
        { status: 403 }
      );
    }

    await dbConnect();
    const _forceUser = User;
    const _forceProduct = Product;

    // 1. Load config
    let config = await NotificationConfig.findOne();
    if (!config) {
      config = await NotificationConfig.create({
        digestFrequency: 'daily',
        recipients: [user.email],
        alertThresholdDays: 7,
        enabledUrgencyColors: ['red', 'maroon'],
      });
    }

    // 2. Fetch active/escalated batches whose color is enabled
    const batches = await Batch.find({
      status: { $in: ['active', 'escalated'] },
      currentUrgencyColor: { $in: config.enabledUrgencyColors }
    }).populate('productId');

    const emailItems = batches.map((b: any) => ({
      batchNumber: b.batchNumber,
      productName: b.productId.name,
      SKU: b.productId.SKU,
      quantity: b.quantity,
      unit: b.productId.unit,
      expiryDate: b.expiryDate,
      location: b.location,
      currentUrgencyColor: b.currentUrgencyColor,
    }));

    // 3. Trigger send
    const res = await sendDigestEmail(
      config.recipients,
      `Genesis Expiry360 Test Digest - ${batches.length} Alerts`,
      emailItems
    );

    if (!res.success) {
      return NextResponse.json(
        { error: res.error || 'Failed to send digest email' },
        { status: 400 }
      );
    }

    return NextResponse.json(res);
  } catch (error: any) {
    console.error('POST test notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
