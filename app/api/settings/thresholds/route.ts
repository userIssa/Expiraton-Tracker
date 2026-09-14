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

    // All authenticated roles (store-hand, supervisor, manager, QA, admin) can read categories and thresholds
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

    if (!['manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
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
    const targetCategory = category.trim();

    if (_id) {
      const oldThreshold = await CategoryThreshold.findById(_id);
      if (!oldThreshold) {
        return NextResponse.json({ error: 'Threshold configuration not found' }, { status: 404 });
      }

      // Check duplicate name if category name changed
      const oldCategoryName = oldThreshold.category;
      if (oldCategoryName !== targetCategory) {
        const existing = await CategoryThreshold.findOne({
          category: { $regex: new RegExp(`^${targetCategory}$`, 'i') }
        });
        if (existing) {
          return NextResponse.json({ error: `Category "${targetCategory}" already exists` }, { status: 400 });
        }
      }

      threshold = await CategoryThreshold.findByIdAndUpdate(
        _id,
        { category: targetCategory, greenMinDays: g, yellowMinDays: y, orangeMinDays: o, redMinDays: r },
        { new: true }
      );

      // If category name changed, update all products belonging to the old category name
      if (oldCategoryName !== targetCategory) {
        const ProductModel = (await import('@/lib/models/Product')).default;
        // Evaluate Product schema just in case Mongoose registry needs it
        const _forceProduct = ProductModel;
        await ProductModel.updateMany(
          { category: oldCategoryName },
          { category: targetCategory }
        );
      }
    } else {
      threshold = await CategoryThreshold.findOneAndUpdate(
        { category: targetCategory },
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

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only managers and admins can delete categories' },
        { status: 403 }
      );
    }

    await dbConnect();

    // Support id or category via searchParams or request body
    const url = new URL(request.url);
    let id = url.searchParams.get('id');
    let categoryName = url.searchParams.get('category');

    if (!id && !categoryName) {
      try {
        const body = await request.json();
        if (body?.id) id = body.id;
        if (body?.category) categoryName = body.category;
      } catch {}
    }

    if (!id && !categoryName) {
      return NextResponse.json(
        { error: 'Category ID or category name is required' },
        { status: 400 }
      );
    }

    let deletedThreshold = null;
    if (id) {
      deletedThreshold = await CategoryThreshold.findByIdAndDelete(id);
    } else if (categoryName) {
      deletedThreshold = await CategoryThreshold.findOneAndDelete({
        category: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') },
      });
    }

    const removedCategory = deletedThreshold ? deletedThreshold.category : (categoryName || '');

    // If there are products referencing this category, reassign them to 'Uncategorized'
    if (removedCategory) {
      const ProductModel = (await import('@/lib/models/Product')).default;
      await ProductModel.updateMany(
        { category: removedCategory },
        { category: 'Uncategorized' }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Category "${removedCategory}" deleted successfully.`,
      deleted: deletedThreshold,
    });
  } catch (error: any) {
    console.error('DELETE thresholds settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
