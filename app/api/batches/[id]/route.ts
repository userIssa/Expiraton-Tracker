import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import CategoryThreshold from '@/lib/models/CategoryThreshold';
import StatusHistory from '@/lib/models/StatusHistory';
import { calculateUrgencyColor } from '@/lib/urgency';
import { getCurrentUser } from '@/lib/session';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    await dbConnect();
    const _forceUser = User;

    const batch = await Batch.findById(id)
      .populate('productId')
      .populate({ path: 'createdBy', select: 'name email role' });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Fetch status history for this batch
    const history = await StatusHistory.find({ batchId: id })
      .populate({ path: 'actorId', select: 'name email role' })
      .sort({ timestamp: -1 });

    return NextResponse.json({
      ...batch.toObject(),
      statusHistory: history,
    });
  } catch (error: any) {
    console.error('GET single batch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    await dbConnect();
    const _forceUser = User;

    const batch = await Batch.findById(id).populate('productId');
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const body = await request.json();
    const { quantity, location, expiryDate, purchaseDate, manufactureDate, status } = body;

    const originalStatus = batch.status;
    let urgencyColor = batch.currentUrgencyColor;
    let datesChanged = false;

    // Update fields if provided
    if (quantity !== undefined) batch.quantity = Number(quantity);
    if (location !== undefined) batch.location = location.trim();
    if (purchaseDate !== undefined) batch.purchaseDate = new Date(purchaseDate);
    if (manufactureDate !== undefined) batch.manufactureDate = new Date(manufactureDate);
    
    if (expiryDate !== undefined) {
      batch.expiryDate = new Date(expiryDate);
      datesChanged = true;
    }

    // If expiry date changed, recalculate urgency color
    if (datesChanged) {
      const productDoc = await Product.findById(batch.productId);
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
        urgencyColor = calculateUrgencyColor(batch.expiryDate, threshold);
        batch.currentUrgencyColor = urgencyColor;
      }
    }

    if (status !== undefined && status !== originalStatus) {
      batch.status = status;
      
      // Write StatusHistory for status changes
      await StatusHistory.create({
        batchId: batch._id,
        fromStatus: originalStatus,
        toStatus: status,
        actorId: user.userId,
        note: `Manual batch status update.`,
        timestamp: new Date(),
      });
    }

    await batch.save();

    const updatedBatch = await Batch.findById(id)
      .populate('productId')
      .populate({ path: 'createdBy', select: 'name email role' });

    return NextResponse.json(updatedBatch);
  } catch (error: any) {
    console.error('PATCH batch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
