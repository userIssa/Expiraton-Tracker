import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Escalation from '@/lib/models/Escalation';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['supervisor', 'manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only supervisors, managers, or admins can view escalations' },
        { status: 403 }
      );
    }

    await dbConnect();
    const _forceUser = User;
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'open'; // default to open
    const search = searchParams.get('search');

    const query: any = {};

    // 1. Enforce RBAC Assignment: supervisors see only their assigned escalations, managers/superadmins see all
    if (user.role === 'supervisor') {
      query.assignedTo = user.userId;
    }

    // 2. Status Filter
    if (statusParam && statusParam !== 'all') {
      query.status = statusParam;
    }

    // 3. Search Filter (reason, product SKU, or product name)
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      
      // Find matching products
      const matchedProducts = await Product.find({
        $or: [{ name: searchRegex }, { SKU: searchRegex }]
      }).select('_id');
      const productIds = matchedProducts.map((p) => p._id);

      // Find matching batches
      const matchedBatches = await Batch.find({
        $or: [
          { batchNumber: searchRegex },
          { productId: { $in: productIds } }
        ]
      }).select('_id');
      const batchIds = matchedBatches.map((b) => b._id);

      query.$or = [
        { reason: searchRegex },
        { batchId: { $in: batchIds } }
      ];
    }

    const escalations = await Escalation.find(query)
      .populate({
        path: 'batchId',
        populate: { path: 'productId' }
      })
      .populate('raisedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    return NextResponse.json(escalations);
  } catch (error: any) {
    console.error('GET escalations list error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
