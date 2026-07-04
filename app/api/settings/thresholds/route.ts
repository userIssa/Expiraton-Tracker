import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CategoryThreshold from '@/lib/models/CategoryThreshold';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['manager', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only managers and admins can edit thresholds' },
        { status: 403 }
      );
    }

    await dbConnect();
    const thresholds = await CategoryThreshold.find().sort({ category: 1 });
    return NextResponse.json(thresholds);
  } catch (error: any) {
    console.error('GET thresholds settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['manager', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only managers and admins can edit thresholds' },
        { status: 403 }
      );
    }

    await dbConnect();
    const body = await request.json();
    const { _id, category, greenMinDays, yellowMinDays, orangeMinDays, redMinDays } = body;

    if (!category || greenMinDays === undefined || yellowMinDays === undefined || orangeMinDays === undefined || redMinDays === undefined) {
      return NextResponse.json({ error: 'Missing threshold values' }, { status: 400 });
    }

    // Validate relative order constraint: green > yellow > orange > red
    const g = Number(greenMinDays);
    const y = Number(yellowMinDays);
    const o = Number(orangeMinDays);
    const r = Number(redMinDays);

    if (!(g > y && y > o && o > r && r >= 0)) {
      return NextResponse.json(
        { error: 'Order constraint violation: Green > Yellow > Orange > Red must be satisfied' },
        { status: 400 }
      );
    }

    let threshold;
    if (_id) {
      threshold = await CategoryThreshold.findByIdAndUpdate(
        _id,
        { greenMinDays: g, yellowMinDays: y, orangeMinDays: o, redMinDays: r },
        { new: true }
      );
    } else {
      threshold = await CategoryThreshold.findOneAndUpdate(
        { category },
        { greenMinDays: g, yellowMinDays: y, orangeMinDays: o, redMinDays: r },
        { new: true, upsert: true }
      );
    }

    return NextResponse.json(threshold);
  } catch (error: any) {
    console.error('PUT thresholds settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
