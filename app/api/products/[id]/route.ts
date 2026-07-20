import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { getCurrentUser } from '@/lib/session';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers, quality assurance, and superadmins can modify product costs/settings
    if (!['manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    const body = await request.json();
    const { cost, name, category, unit, defaultShelfLifeDays } = body;

    const updateFields: any = {};
    if (cost !== undefined) updateFields.cost = Number(cost);
    if (name !== undefined) updateFields.name = name.trim();
    if (category !== undefined) updateFields.category = category.trim();
    if (unit !== undefined) updateFields.unit = unit.trim();
    if (defaultShelfLifeDays !== undefined) updateFields.defaultShelfLifeDays = Number(defaultShelfLifeDays);

    const product = await Product.findByIdAndUpdate(id, updateFields, { new: true });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('PATCH product error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
