import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import CategoryThreshold from '@/lib/models/CategoryThreshold';
import StatusHistory from '@/lib/models/StatusHistory';
import { calculateUrgencyColor } from '@/lib/urgency';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const _forceUser = User;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status'); // e.g. "active,escalated,expired" or "cleared"
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const urgencyColor = searchParams.get('urgencyColor');
    const search = searchParams.get('search'); // product name or SKU or batchNumber search

    // Build query filter
    const query: any = {};

    // 1. Status Filter
    if (statusParam) {
      query.status = { $in: statusParam.split(',') };
    } else {
      // By default, show active inventory: active, escalated, expired (exclude cleared)
      query.status = { $in: ['active', 'escalated', 'expired'] };
    }

    // 2. Location Filter
    if (location) {
      query.location = location;
    }

    // 3. Urgency Color Filter
    if (urgencyColor) {
      query.currentUrgencyColor = urgencyColor;
    }

    // 4. Product Category Filter
    if (category) {
      // Find all products matching the category
      const matchedProducts = await Product.find({ category: category }).select('_id');
      const productIds = matchedProducts.map((p) => p._id);
      query.productId = { $in: productIds };
    }

    // 5. Search text (SKU, Product Name, Batch Number)
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      
      // Find products matching name or SKU
      const matchingProducts = await Product.find({
        $or: [{ name: searchRegex }, { SKU: searchRegex }],
      }).select('_id');
      const productIds = matchingProducts.map((p) => p._id);

      query.$or = [
        { batchNumber: searchRegex },
        { productId: { $in: productIds } },
      ];
    }

    // Query batches and populate product/creator details
    // Default FEFO sorting: expiryDate ascending (soonest first)
    const batches = await Batch.find(query)
      .populate('productId')
      .populate({ path: 'createdBy', select: 'name email role' })
      .sort({ expiryDate: 1 });

    return NextResponse.json(batches);
  } catch (error: any) {
    console.error('GET batches error:', error);
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

    await dbConnect();
    const _forceUser = User;
    const body = await request.json();
    const {
      productId,
      productDetails, // { name, SKU, category, unit, defaultShelfLifeDays }
      batchNumber,
      quantity,
      location,
      purchaseDate,
      manufactureDate,
      expiryDate,
    } = body;

    // Check required batch parameters
    if (
      !batchNumber ||
      quantity === undefined ||
      !location ||
      !purchaseDate ||
      !manufactureDate ||
      !expiryDate
    ) {
      return NextResponse.json(
        { error: 'Missing required batch fields' },
        { status: 400 }
      );
    }

    let productDoc = null;

    // 1. Resolve product
    if (productId) {
      productDoc = await Product.findById(productId);
      if (!productDoc) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
    } else if (productDetails && productDetails.SKU) {
      // Find or create product on-the-fly
      const cleanSKU = productDetails.SKU.toUpperCase().trim();
      productDoc = await Product.findOne({ SKU: cleanSKU });
      
      if (!productDoc) {
        if (!productDetails.name || !productDetails.category || !productDetails.unit) {
          return NextResponse.json(
            { error: 'Product SKU not found. Full product details (name, category, unit) are required to create a new product.' },
            { status: 400 }
          );
        }
        productDoc = await Product.create({
          name: productDetails.name.trim(),
          SKU: cleanSKU,
          category: productDetails.category.trim(),
          unit: productDetails.unit.trim(),
          defaultShelfLifeDays: Number(productDetails.defaultShelfLifeDays || 0),
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Either productId or productDetails.SKU must be provided' },
        { status: 400 }
      );
    }

    // 2. Fetch or create category thresholds
    let threshold = await CategoryThreshold.findOne({ category: productDoc.category });
    if (!threshold) {
      // Fallback defaults if no threshold config is registered
      threshold = await CategoryThreshold.create({
        category: productDoc.category,
        greenMinDays: 30,
        yellowMinDays: 15,
        orangeMinDays: 7,
        redMinDays: 3,
      });
    }

    // 3. Compute Urgency Color
    const parsedExpiry = new Date(expiryDate);
    const urgencyColor = calculateUrgencyColor(parsedExpiry, threshold);

    // 4. Resolve initial status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedExpiryMidnight = new Date(parsedExpiry);
    parsedExpiryMidnight.setHours(0, 0, 0, 0);
    const initialStatus = parsedExpiryMidnight <= today ? 'expired' : 'active';

    // 5. Create Batch
    const newBatch = await Batch.create({
      productId: productDoc._id,
      batchNumber: batchNumber.trim(),
      quantity: Number(quantity),
      location: location.trim(),
      purchaseDate: new Date(purchaseDate),
      manufactureDate: new Date(manufactureDate),
      expiryDate: parsedExpiry,
      status: initialStatus,
      currentUrgencyColor: urgencyColor,
      createdBy: user.userId,
    });

    // 6. Write StatusHistory entry
    await StatusHistory.create({
      batchId: newBatch._id,
      fromStatus: 'none',
      toStatus: initialStatus,
      actorId: user.userId,
      note: 'Initial batch registration.',
      timestamp: new Date(),
    });

    // Populate and return
    const populatedBatch = await Batch.findById(newBatch._id)
      .populate('productId')
      .populate({ path: 'createdBy', select: 'name email role' });

    return NextResponse.json(populatedBatch, { status: 201 });
  } catch (error: any) {
    console.error('POST batch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
