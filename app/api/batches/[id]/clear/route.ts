import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import StatusHistory from '@/lib/models/StatusHistory';
import { getCurrentUser } from '@/lib/session';

export async function POST(
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
    const _forceProduct = Product;

    const batch = await Batch.findById(id);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status === 'cleared') {
      return NextResponse.json(
        { error: 'Batch is already cleared' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason, note } = body;

    if (!reason || !['sold', 'used', 'discarded'].includes(reason)) {
      return NextResponse.json(
        { error: "Valid reason ('sold', 'used', 'discarded') is required" },
        { status: 400 }
      );
    }

    const originalStatus = batch.status;
    batch.status = 'cleared';
    await batch.save();

    // Create StatusHistory record
    const clearNote = `Cleared (Reason: ${reason})${note ? ` - ${note.trim()}` : ''}`;
    await StatusHistory.create({
      batchId: batch._id,
      fromStatus: originalStatus,
      toStatus: 'cleared',
      actorId: user.userId,
      note: clearNote,
      timestamp: new Date(),
    });

    const populatedBatch = await Batch.findById(id)
      .populate('productId')
      .populate({ path: 'createdBy', select: 'name email role' });

    return NextResponse.json(populatedBatch);
  } catch (error: any) {
    console.error('Clear batch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
