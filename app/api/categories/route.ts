import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CategoryThreshold from '@/lib/models/CategoryThreshold';
import Product from '@/lib/models/Product';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // 1. Fetch configured thresholds
    const thresholds = await CategoryThreshold.find().sort({ category: 1 });
    const thresholdCategories: string[] = thresholds.map((t: any) => t.category.trim());

    // 2. Fetch any distinct categories from products
    const productCategories: string[] = await Product.distinct('category');

    const categorySet = new Set<string>();

    if (thresholdCategories.length === 0) {
      // Fallback standard defaults only when no thresholds are configured yet
      const defaults = ['Dairy', 'Bakery', 'Meat & Seafood', 'Canned Goods'];
      defaults.forEach((c) => categorySet.add(c));
    } else {
      thresholdCategories.forEach((c) => {
        if (c) categorySet.add(c);
      });
    }

    productCategories.forEach((c) => {
      if (c && typeof c === 'string' && c.trim() !== 'Uncategorized') {
        categorySet.add(c.trim());
      }
    });

    const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      categories,
      thresholds,
    });
  } catch (error: any) {
    console.error('GET categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
