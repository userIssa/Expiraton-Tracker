import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import Escalation from '@/lib/models/Escalation';
import StatusHistory from '@/lib/models/StatusHistory';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/session';
import { sendEscalationEmail } from '@/lib/resend';

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
    const _forceProduct = Product;

    const batch = await Batch.findById(id);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status === 'escalated') {
      return NextResponse.json(
        { error: 'Batch is already escalated' },
        { status: 400 }
      );
    }

    if (batch.status === 'cleared') {
      return NextResponse.json(
        { error: 'Cleared batches cannot be escalated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { assignedTo, reason } = body;

    if (!assignedTo || !reason) {
      return NextResponse.json(
        { error: 'assignedTo (supervisor ID) and reason are required' },
        { status: 400 }
      );
    }

    // Verify assignee is a supervisor, manager, or superadmin
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return NextResponse.json({ error: 'Assignee supervisor not found' }, { status: 404 });
    }

    if (!['supervisor', 'manager', 'quality-assurance', 'superadmin'].includes(assignee.role)) {
      return NextResponse.json(
        { error: 'Assignee must have a supervisor, manager, or superadmin role' },
        { status: 400 }
      );
    }

    const originalStatus = batch.status;
    batch.status = 'escalated';
    await batch.save();

    // Create Escalation entry
    const escalation = await Escalation.create({
      batchId: batch._id,
      raisedBy: user.userId,
      assignedTo: assignee._id,
      reason: reason.trim(),
      status: 'open',
    });

    // Create StatusHistory record
    await StatusHistory.create({
      batchId: batch._id,
      fromStatus: originalStatus,
      toStatus: 'escalated',
      actorId: user.userId,
      note: `Escalated: ${reason.trim()}`,
      timestamp: new Date(),
    });

    const populatedBatch = await Batch.findById(id)
      .populate('productId')
      .populate({ path: 'createdBy', select: 'name email role' });

    // Send email alert to assignee
    try {
      await sendEscalationEmail(
        assignee.email,
        assignee.name,
        {
          batchNumber: populatedBatch.batchNumber,
          productName: (populatedBatch.productId as any).name,
          SKU: (populatedBatch.productId as any).SKU,
          quantity: populatedBatch.quantity,
          unit: (populatedBatch.productId as any).unit,
          expiryDate: populatedBatch.expiryDate,
          location: populatedBatch.location,
        },
        reason.trim(),
        user.name
      );
    } catch (emailErr) {
      console.error('Failed to send escalation email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      batch: populatedBatch,
      escalation,
    });
  } catch (error: any) {
    console.error('Escalate batch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
