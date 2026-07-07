import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import StatusHistory from '@/lib/models/StatusHistory';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/session';

// Helper to get simulated cost per unit by category
function getCategoryCost(category: string): number {
  return 0.0;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['manager', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only managers and admins can access analytics' },
        { status: 403 }
      );
    }

    await dbConnect();
    const _forceUser = User;
    const _forceProduct = Product;

    // 1. Fetch all batches and populate product
    const allBatches = await Batch.find().populate('productId');

    let valueAtRisk = 0;
    let totalClearedUnits = 0;
    let totalLostValue = 0;
    let totalTimeToClearDiff = 0;
    let clearedCountForAvg = 0;

    // Chart aggregations
    const urgencyCounts = { critical: 0, warning: 0, safe: 0 };
    const categoryValues: Record<string, number> = {
      'Dairy': 0,
      'Bakery': 0,
      'Meat & Seafood': 0,
      'Canned Goods': 0,
    };

    // 2. Fetch all StatusHistory to compute waste/clear trends
    const history = await StatusHistory.find().populate({
      path: 'batchId',
      populate: { path: 'productId' }
    });

    // Resolve lost batches from history: expired or cleared with reason 'discarded'
    // To avoid double-counting, we can group by batchId
    const batchFinalHistory: Record<string, any[]> = {};
    history.forEach((h) => {
      if (!h.batchId) return;
      const bId = h.batchId._id.toString();
      if (!batchFinalHistory[bId]) {
        batchFinalHistory[bId] = [];
      }
      batchFinalHistory[bId].push(h);
    });

    // Track products lost
    const productLossMap: Record<string, { name: string; category: string; units: number; cost: number }> = {};

    // 3. Process batches for current state KPIs
    allBatches.forEach((batch: any) => {
      const category = batch.productId?.category || 'Other';
      const cost = batch.productId?.cost !== undefined && batch.productId.cost > 0 
        ? batch.productId.cost 
        : getCategoryCost(category);

      // Value at Risk (active inventory close to expiry: red, maroon, orange, yellow)
      if (['active', 'escalated', 'expired'].includes(batch.status)) {
        if (['maroon', 'red', 'orange', 'yellow'].includes(batch.currentUrgencyColor)) {
          valueAtRisk += batch.quantity * cost;
        }

        // Urgency Breakdown (donut chart)
        if (['maroon', 'red'].includes(batch.currentUrgencyColor)) {
          urgencyCounts.critical += batch.quantity;
        } else if (['orange', 'yellow'].includes(batch.currentUrgencyColor)) {
          urgencyCounts.warning += batch.quantity;
        } else {
          urgencyCounts.safe += batch.quantity;
        }
      }
    });

    // 4. Process history for actions and waste KPIs
    Object.keys(batchFinalHistory).forEach((bId) => {
      const entries = batchFinalHistory[bId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const firstEntry = entries[0];
      const lastEntry = entries[entries.length - 1];

      const batchDoc = lastEntry.batchId;
      if (!batchDoc || !batchDoc.productId) return;

      const category = batchDoc.productId.category || 'Other';
      const cost = batchDoc.productId.cost !== undefined && batchDoc.productId.cost > 0 
        ? batchDoc.productId.cost 
        : getCategoryCost(category);

      // Average Time to Clear
      if (lastEntry.toStatus === 'cleared') {
        const timeDiff = new Date(lastEntry.timestamp).getTime() - new Date(firstEntry.timestamp).getTime();
        totalTimeToClearDiff += timeDiff;
        clearedCountForAvg++;

        const noteLower = (lastEntry.note || '').toLowerCase();
        if (noteLower.includes('sold') || noteLower.includes('used')) {
          totalClearedUnits += batchDoc.quantity;
        } else if (noteLower.includes('discarded')) {
          const lossAmt = batchDoc.quantity * cost;
          totalLostValue += lossAmt;
          categoryValues[category] = (categoryValues[category] || 0) + lossAmt;

          // Track top loss products
          const prodId = batchDoc.productId._id.toString();
          if (!productLossMap[prodId]) {
            productLossMap[prodId] = {
              name: batchDoc.productId.name,
              category: category,
              units: 0,
              cost: cost,
            };
          }
          productLossMap[prodId].units += batchDoc.quantity;
        }
      } else if (lastEntry.toStatus === 'expired') {
        // Expired count as loss
        const lossAmt = batchDoc.quantity * cost;
        totalLostValue += lossAmt;
        categoryValues[category] = (categoryValues[category] || 0) + lossAmt;

        const prodId = batchDoc.productId._id.toString();
        if (!productLossMap[prodId]) {
          productLossMap[prodId] = {
            name: batchDoc.productId.name,
            category: category,
            units: 0,
            cost: cost,
          };
        }
        productLossMap[prodId].units += batchDoc.quantity;
      }
    });

    const avgTimeToClearDays = clearedCountForAvg > 0 
      ? Number((totalTimeToClearDiff / (1000 * 60 * 60 * 24) / clearedCountForAvg).toFixed(1))
      : 0;

    // 5. Build Top 5 Wasted Products
    const topLossProducts = Object.values(productLossMap)
      .map((item) => ({
        name: item.name,
        category: item.category,
        unitsLost: item.units,
        valueImpact: item.units * item.cost,
      }))
      .sort((a, b) => b.valueImpact - a.valueImpact)
      .slice(0, 5);

    // 6. Build Loss Trend (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const lossTrend: { month: string; value: number }[] = [];
    
    // Generate past 6 months list
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      lossTrend.push({
        month: monthNames[date.getMonth()],
        value: 0,
      });
    }

    // Accumulate history discarded/expired values into months
    Object.keys(batchFinalHistory).forEach((bId) => {
      const entries = batchFinalHistory[bId];
      const lastEntry = entries[entries.length - 1];
      if (lastEntry.toStatus === 'expired' || (lastEntry.toStatus === 'cleared' && (lastEntry.note || '').toLowerCase().includes('discarded'))) {
        const entryDate = new Date(lastEntry.timestamp);
        const entryMonthName = monthNames[entryDate.getMonth()];

        const trendItem = lossTrend.find((item) => item.month === entryMonthName);
        if (trendItem) {
          const category = lastEntry.batchId?.productId?.category || 'Other';
          const cost = lastEntry.batchId?.productId?.cost !== undefined && lastEntry.batchId.productId.cost > 0 
            ? lastEntry.batchId.productId.cost 
            : getCategoryCost(category);
          trendItem.value += lastEntry.batchId?.quantity * cost;
        }
      }
    });

    return NextResponse.json({
      valueAtRisk: Math.round(valueAtRisk),
      totalClearedUnits,
      totalLostValue: Math.round(totalLostValue),
      avgTimeToClearDays,
      urgencyBreakdown: {
        total: urgencyCounts.critical + urgencyCounts.warning + urgencyCounts.safe,
        critical: urgencyCounts.critical,
        warning: urgencyCounts.warning,
        safe: urgencyCounts.safe,
        criticalPercent: urgencyCounts.critical + urgencyCounts.warning + urgencyCounts.safe > 0
          ? Math.round((urgencyCounts.critical / (urgencyCounts.critical + urgencyCounts.warning + urgencyCounts.safe)) * 100)
          : 0,
        warningPercent: urgencyCounts.critical + urgencyCounts.warning + urgencyCounts.safe > 0
          ? Math.round((urgencyCounts.warning / (urgencyCounts.critical + urgencyCounts.warning + urgencyCounts.safe)) * 100)
          : 0,
        safePercent: urgencyCounts.critical + urgencyCounts.warning + urgencyCounts.safe > 0
          ? Math.round((urgencyCounts.safe / (urgencyCounts.critical + urgencyCounts.warning + urgencyCounts.safe)) * 100)
          : 0,
      },
      categoryValues: [
        { category: 'Dairy', value: Math.round(categoryValues['Dairy'] || 0) },
        { category: 'Bakery', value: Math.round(categoryValues['Bakery'] || 0) },
        { category: 'Meat & Seafood', value: Math.round(categoryValues['Meat & Seafood'] || 0) },
        { category: 'Canned Goods', value: Math.round(categoryValues['Canned Goods'] || 0) },
      ],
      lossTrend,
      topLossProducts,
    });
  } catch (error: any) {
    console.error('GET analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
