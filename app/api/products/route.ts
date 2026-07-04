import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const products = await Product.find({}).sort({ name: 1 });
    return NextResponse.json(products);
  } catch (error: any) {
    console.error('GET products error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based check: store-hands register incoming stock (products + batches), supervisors/managers can create as well
    // All roles can create products since register new product might create product lookup if SKU is new
    await dbConnect();
    const body = await request.json();
    const { name, SKU, category, unit, defaultShelfLifeDays } = body;

    if (!name || !SKU || !category || !unit || defaultShelfLifeDays === undefined) {
      return NextResponse.json(
        { error: 'Missing required product fields' },
        { status: 400 }
      );
    }

    // Check SKU uniqueness
    const existingProduct = await Product.findOne({ SKU: SKU.toUpperCase().trim() });
    if (existingProduct) {
      return NextResponse.json(
        { error: `Product with SKU ${SKU} already exists` },
        { status: 409 }
      );
    }

    const newProduct = await Product.create({
      name: name.trim(),
      SKU: SKU.toUpperCase().trim(),
      category: category.trim(),
      unit: unit.trim(),
      defaultShelfLifeDays: Number(defaultShelfLifeDays),
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('POST product error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
