import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Escalation from '@/lib/models/Escalation';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import StatusHistory from '@/lib/models/StatusHistory';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/session';
import { sendEscalationEmail } from '@/lib/resend';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['supervisor', 'manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only supervisors, managers, or admins can action escalations' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    await dbConnect();
    const _forceProduct = Product;

    const escalation = await Escalation.findById(id);
    if (!escalation) {
      return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    // Security check: supervisors can only update their own escalations
    if (user.role === 'supervisor' && escalation.assignedTo.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden: you can only action escalations assigned to you' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, note, assignedTo } = body;

    const originalStatus = escalation.status;
    const batch = await Batch.findById(escalation.batchId);

    if (action === 'in_review') {
      escalation.status = 'in_review';
      await escalation.save();
    } else if (action === 'reassign') {
      if (!assignedTo) {
        return NextResponse.json({ error: 'assignedTo supervisor ID is required' }, { status: 400 });
      }
      
      const newAssignee = await User.findById(assignedTo);
      if (!newAssignee || !['supervisor', 'manager', 'quality-assurance', 'superadmin'].includes(newAssignee.role)) {
        return NextResponse.json({ error: 'Invalid supervisor for reassignment' }, { status: 400 });
      }

      const originalAssigneeId = escalation.assignedTo;
      escalation.assignedTo = newAssignee._id;
      await escalation.save();

      // Write status history update
      if (batch) {
        await StatusHistory.create({
          batchId: batch._id,
          fromStatus: 'escalated',
          toStatus: 'escalated',
          actorId: user.userId,
          note: `Escalation reassigned from ${originalAssigneeId} to ${newAssignee._id}`,
          timestamp: new Date(),
        });
      }
    } else if (action === 'resolve_clear') {
      // Resolve escalation by clearing the batch (discarding or selling)
      escalation.status = 'resolved';
      escalation.resolutionNote = note || 'Resolved & Cleared by supervisor';
      escalation.resolvedAt = new Date();
      await escalation.save();

      if (batch) {
        const batchOriginalStatus = batch.status;
        batch.status = 'cleared';
        await batch.save();

        // Write status history update
        await StatusHistory.create({
          batchId: batch._id,
          fromStatus: batchOriginalStatus,
          toStatus: 'cleared',
          actorId: user.userId,
          note: `Escalation resolved: batch cleared. Note: ${escalation.resolutionNote}`,
          timestamp: new Date(),
        });
      }
    } else if (action === 'resolve_keep') {
      // Resolve escalation by returning the batch to active inventory
      escalation.status = 'resolved';
      escalation.resolutionNote = note || 'Resolved & Retained in active stock';
      escalation.resolvedAt = new Date();
      await escalation.save();

      if (batch) {
        const batchOriginalStatus = batch.status;
        
        // If batch is past expiry, set to expired, otherwise active
        const today = new Date();
        today.setHours(0,0,0,0);
        const expiryMidnight = new Date(batch.expiryDate);
        expiryMidnight.setHours(0,0,0,0);
        const resolvedBatchStatus = expiryMidnight <= today ? 'expired' : 'active';

        batch.status = resolvedBatchStatus;
        await batch.save();

        // Write status history update
        await StatusHistory.create({
          batchId: batch._id,
          fromStatus: batchOriginalStatus,
          toStatus: resolvedBatchStatus,
          actorId: user.userId,
          note: `Escalation resolved: batch kept in stock. Note: ${escalation.resolutionNote}`,
          timestamp: new Date(),
        });
      }
    } else {
      return NextResponse.json(
        { error: "Valid action ('in_review', 'reassign', 'resolve_clear', 'resolve_keep') is required" },
        { status: 400 }
      );
    }

    const populatedEscalation = await Escalation.findById(id)
      .populate({
        path: 'batchId',
        populate: { path: 'productId' }
      })
      .populate('raisedBy', 'name email role')
      .populate('assignedTo', 'name email role');

    // Send email alert to assignee if reassigned
    if (action === 'reassign' && populatedEscalation) {
      try {
        const batchDoc = populatedEscalation.batchId;
        const productDoc = (batchDoc as any).productId;
        await sendEscalationEmail(
          (populatedEscalation.assignedTo as any).email,
          (populatedEscalation.assignedTo as any).name,
          {
            batchNumber: (batchDoc as any).batchNumber,
            productName: (productDoc as any).name,
            SKU: (productDoc as any).SKU,
            quantity: (batchDoc as any).quantity,
            unit: (productDoc as any).unit,
            expiryDate: (batchDoc as any).expiryDate,
            location: (batchDoc as any).location,
          },
          `Reassigned from previous supervisor. Note: ${note || 'No additional note.'}`,
          user.name
        );
      } catch (emailErr) {
        console.error('Failed to send reassign email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      escalation: populatedEscalation,
    });
  } catch (error: any) {
    console.error('PATCH escalation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
