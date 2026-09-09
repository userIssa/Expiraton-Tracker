import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import CategoryThreshold from '@/lib/models/CategoryThreshold';
import StatusHistory from '@/lib/models/StatusHistory';
import { calculateUrgencyColor } from '@/lib/urgency';
import { getCurrentUser } from '@/lib/session';

interface ImportBatchItem {
  name: string;
  SKU?: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  category?: string;
  location?: string;
  cost?: number;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const _forceUser = User; // Ensure User model registered

    const body = await request.json();
    const { batches, defaultCategory, defaultLocation } = body;

    if (!Array.isArray(batches) || batches.length === 0) {
      return NextResponse.json(
        { error: 'No batch items provided for import' },
        { status: 400 }
      );
    }

    let importedCount = 0;
    let createdProductsCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const thresholdCache: Record<string, any> = {};

    const fallbackCat = defaultCategory || 'Dry Foods';
    const fallbackLoc = defaultLocation || 'Dry Warehouse';

    for (let i = 0; i < batches.length; i++) {
      const item: ImportBatchItem = batches[i];
      const rowNum = i + 1;

      if (!item.name || !item.batchNumber || !item.expiryDate) {
        errors.push(`Row #${rowNum}: Missing required fields (Item Name, Batch Number, or Expiry Date).`);
        skippedCount++;
        continue;
      }

      try {
        const itemCategory = (item.category || fallbackCat).trim();
        const itemLocation = (item.location || fallbackLoc).trim();
        const itemUnit = (item.unit || 'Bag').trim();
        const itemQty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;

        // 1. Resolve or create Product
        const cleanName = item.name.trim();
        let productDoc = await Product.findOne({
          name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });

        if (!productDoc) {
          // Generate unique SKU
          const cleanCatPrefix = itemCategory.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'GEN';
          const cleanNamePrefix = cleanName
            .toUpperCase()
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .slice(0, 3)
            .join('-');
          const skuBase = item.SKU ? item.SKU.toUpperCase().trim() : `${cleanCatPrefix}-${cleanNamePrefix}`;
          
          let finalSku = skuBase;
          let skuCounter = 1;
          while (await Product.findOne({ SKU: finalSku })) {
            finalSku = `${skuBase}-${skuCounter++}`;
          }

          // Calculate default shelf life in days if dates present
          let shelfLife = 365;
          if (item.manufactureDate && item.expiryDate) {
            const mfg = new Date(item.manufactureDate);
            const exp = new Date(item.expiryDate);
            const diffDays = Math.round((exp.getTime() - mfg.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) shelfLife = diffDays;
          }

          productDoc = await Product.create({
            name: cleanName,
            SKU: finalSku,
            category: itemCategory,
            unit: itemUnit,
            defaultShelfLifeDays: shelfLife,
            cost: item.cost !== undefined && !isNaN(item.cost) ? Number(item.cost) : 0,
          });
          createdProductsCount++;
        }

        // 2. Resolve Threshold for urgency calculation
        let threshold = thresholdCache[itemCategory];
        if (!threshold) {
          threshold = await CategoryThreshold.findOne({ category: itemCategory });
          if (!threshold) {
            threshold = await CategoryThreshold.create({
              category: itemCategory,
              greenMinDays: 30,
              yellowMinDays: 15,
              orangeMinDays: 7,
              redMinDays: 3,
            });
          }
          thresholdCache[itemCategory] = threshold;
        }

        // 3. Compute Urgency & Status
        const parsedExpiry = new Date(item.expiryDate);
        const urgencyColor = calculateUrgencyColor(parsedExpiry, threshold);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parsedExpiryMidnight = new Date(parsedExpiry);
        parsedExpiryMidnight.setHours(0, 0, 0, 0);
        const initialStatus = parsedExpiryMidnight <= today ? 'expired' : 'active';

        const parsedMfg = item.manufactureDate ? new Date(item.manufactureDate) : new Date();
        const purchaseDate = new Date();

        // 4. Create Batch
        const newBatch = await Batch.create({
          productId: productDoc._id,
          batchNumber: item.batchNumber.trim(),
          quantity: itemQty,
          location: itemLocation,
          purchaseDate: purchaseDate,
          manufactureDate: parsedMfg,
          expiryDate: parsedExpiry,
          status: initialStatus,
          currentUrgencyColor: urgencyColor,
          createdBy: user.userId,
        });

        // 5. Write StatusHistory entry
        await StatusHistory.create({
          batchId: newBatch._id,
          fromStatus: 'none',
          toStatus: initialStatus,
          actorId: user.userId,
          note: `Bulk spreadsheet import: registered ${itemQty} ${itemUnit}.`,
          timestamp: new Date(),
        });

        importedCount++;
      } catch (rowErr: any) {
        errors.push(`Row #${rowNum} ("${item.name}"): ${rowErr.message}`);
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      createdProductsCount,
      skippedCount,
      errors,
    });
  } catch (error: any) {
    console.error('Batch import error:', error);
    return NextResponse.json(
      { error: 'Internal server error during import', details: error.message },
      { status: 500 }
    );
  }
}
