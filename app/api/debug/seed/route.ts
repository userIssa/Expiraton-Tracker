import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import StatusHistory from '@/lib/models/StatusHistory';
import Escalation from '@/lib/models/Escalation';
import CategoryThreshold from '@/lib/models/CategoryThreshold';
import NotificationConfig from '@/lib/models/NotificationConfig';
import { calculateUrgencyColor } from '@/lib/urgency';
import bcrypt from 'bcryptjs';

export async function GET() {
  // Only allow in development environment for safety
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Seeding is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    await dbConnect();

    // 1. Clear Existing Data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Batch.deleteMany({});
    await StatusHistory.deleteMany({});
    await Escalation.deleteMany({});
    await CategoryThreshold.deleteMany({});
    await NotificationConfig.deleteMany({});

    // 2. Hash Seed Passwords
    const passwordHash = bcrypt.hashSync('Password123', 10);

    // 3. Create Users
    const users = await User.create([
      {
        name: 'John Storehand',
        email: 'storehand1@example.com',
        passwordHash,
        role: 'store-hand',
        assignedLocations: ['Warehouse A', 'Zone B'],
        notifyByEmail: true,
      },
      {
        name: 'Sarah Supervisor',
        email: 'supervisor1@example.com',
        passwordHash,
        role: 'supervisor',
        assignedLocations: ['Warehouse A', 'Zone B'],
        notifyByEmail: true,
      },
      {
        name: 'Michael Manager',
        email: 'manager1@example.com',
        passwordHash,
        role: 'manager',
        assignedLocations: ['Warehouse A', 'Zone B', 'Zone C'],
        notifyByEmail: true,
      },
      {
        name: 'Alice Superadmin',
        email: 'admin1@example.com',
        passwordHash,
        role: 'superadmin',
        assignedLocations: [],
        notifyByEmail: true,
      },
    ]);

    const storehand = users.find((u: any) => u.role === 'store-hand');
    const supervisor = users.find((u: any) => u.role === 'supervisor');
    const manager = users.find((u: any) => u.role === 'manager');

    // 4. Create Category Thresholds
    const thresholds = await CategoryThreshold.create([
      {
        category: 'Dairy',
        greenMinDays: 30,
        yellowMinDays: 15,
        orangeMinDays: 7,
        redMinDays: 3,
      },
      {
        category: 'Bakery',
        greenMinDays: 7,
        yellowMinDays: 4,
        orangeMinDays: 2,
        redMinDays: 1,
      },
      {
        category: 'Meat & Seafood',
        greenMinDays: 14,
        yellowMinDays: 7,
        orangeMinDays: 3,
        redMinDays: 1,
      },
      {
        category: 'Canned Goods',
        greenMinDays: 120,
        yellowMinDays: 60,
        orangeMinDays: 30,
        redMinDays: 15,
      },
    ]);

    const getThresholdForCategory = (catName: string) => {
      return thresholds.find((t: any) => t.category === catName);
    };

    // 5. Create Products
    const products = await Product.create([
      {
        name: 'Organic Whole Milk',
        SKU: 'DAIRY-001',
        category: 'Dairy',
        unit: 'Litre Bottle',
        defaultShelfLifeDays: 14,
      },
      {
        name: 'Cheddar Cheese Block',
        SKU: 'DAIRY-002',
        category: 'Dairy',
        unit: '500g Pack',
        defaultShelfLifeDays: 60,
      },
      {
        name: 'Sourdough Bread',
        SKU: 'BAKE-001',
        category: 'Bakery',
        unit: 'Loaf',
        defaultShelfLifeDays: 5,
      },
      {
        name: 'Croissants Pack of 4',
        SKU: 'BAKE-002',
        category: 'Bakery',
        unit: 'Pack',
        defaultShelfLifeDays: 3,
      },
      {
        name: 'Fresh Salmon Fillet',
        SKU: 'MEAT-001',
        category: 'Meat & Seafood',
        unit: '200g Portion',
        defaultShelfLifeDays: 4,
      },
      {
        name: 'Ground Beef 80/20',
        SKU: 'MEAT-002',
        category: 'Meat & Seafood',
        unit: '1kg Tray',
        defaultShelfLifeDays: 6,
      },
      {
        name: 'Canned Tomato Paste',
        SKU: 'CANN-001',
        category: 'Canned Goods',
        unit: '400g Can',
        defaultShelfLifeDays: 365,
      },
      {
        name: 'Sweet Corn Kernel',
        SKU: 'CANN-002',
        category: 'Canned Goods',
        unit: '340g Can',
        defaultShelfLifeDays: 540,
      },
    ]);

    // Helpers to find products
    const milk = products.find((p: any) => p.SKU === 'DAIRY-001');
    const cheese = products.find((p: any) => p.SKU === 'DAIRY-002');
    const sourdough = products.find((p: any) => p.SKU === 'BAKE-001');
    const salmon = products.find((p: any) => p.SKU === 'MEAT-001');
    const beef = products.find((p: any) => p.SKU === 'MEAT-002');
    const corn = products.find((p: any) => p.SKU === 'CANN-002');

    // 6. Create Batches relative to today's date
    const today = new Date();
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    // Construct batches with dynamic expiry dates to guarantee urgency states
    const batchData = [
      {
        product: milk,
        batchNumber: 'B-MILK-99',
        quantity: 120,
        location: 'Warehouse A',
        purchaseDate: addDays(today, -2),
        manufactureDate: addDays(today, -3),
        expiryDate: addDays(today, 45), // Fresh (Dairy green threshold is 30)
        status: 'active' as const,
      },
      {
        product: milk,
        batchNumber: 'B-MILK-98',
        quantity: 60,
        location: 'Warehouse A',
        purchaseDate: addDays(today, -5),
        manufactureDate: addDays(today, -6),
        expiryDate: addDays(today, 20), // Yellow (Dairy yellow threshold is 15)
        status: 'active' as const,
      },
      {
        product: cheese,
        batchNumber: 'B-CHZ-01',
        quantity: 40,
        location: 'Zone B',
        purchaseDate: addDays(today, -10),
        manufactureDate: addDays(today, -15),
        expiryDate: addDays(today, 5), // Orange (Dairy orange threshold is 7)
        status: 'active' as const,
      },
      {
        product: sourdough,
        batchNumber: 'B-SDR-54',
        quantity: 12,
        location: 'Zone B',
        purchaseDate: addDays(today, -1),
        manufactureDate: addDays(today, -1),
        expiryDate: addDays(today, 0), // Expired today/0 days (maroon)
        status: 'expired' as const,
      },
      {
        product: salmon,
        batchNumber: 'B-SAL-12',
        quantity: 25,
        location: 'Warehouse A',
        purchaseDate: addDays(today, -6),
        manufactureDate: addDays(today, -7),
        expiryDate: addDays(today, -2), // Expired 2 days ago (maroon)
        status: 'expired' as const,
      },
      {
        product: beef,
        batchNumber: 'B-BEF-07',
        quantity: 35,
        location: 'Warehouse A',
        purchaseDate: addDays(today, -3),
        manufactureDate: addDays(today, -4),
        expiryDate: addDays(today, 1), // Red (Meat red threshold is 1)
        status: 'escalated' as const,
      },
      {
        product: corn,
        batchNumber: 'B-CRN-400',
        quantity: 500,
        location: 'Warehouse A',
        purchaseDate: addDays(today, -100),
        manufactureDate: addDays(today, -120),
        expiryDate: addDays(today, -5), // Expired but cleared
        status: 'cleared' as const,
      },
    ];

    const seededBatches = [];
    const seededHistory = [];

    for (const data of batchData) {
      if (!data.product) continue;

      const threshold = getThresholdForCategory(data.product.category);
      const color = calculateUrgencyColor(data.expiryDate, threshold!);

      const batch = await Batch.create({
        productId: data.product._id,
        batchNumber: data.batchNumber,
        quantity: data.quantity,
        location: data.location,
        purchaseDate: data.purchaseDate,
        manufactureDate: data.manufactureDate,
        expiryDate: data.expiryDate,
        status: data.status,
        currentUrgencyColor: color,
        createdBy: storehand!._id,
      });

      seededBatches.push(batch);

      // Create history trail
      if (data.status === 'active') {
        const hist = await StatusHistory.create({
          batchId: batch._id,
          fromStatus: 'none',
          toStatus: 'active',
          actorId: storehand!._id,
          note: 'Initial batch registration.',
          timestamp: data.purchaseDate,
        });
        seededHistory.push(hist);
      } else if (data.status === 'expired') {
        // Initial active
        await StatusHistory.create({
          batchId: batch._id,
          fromStatus: 'none',
          toStatus: 'active',
          actorId: storehand!._id,
          note: 'Initial batch registration.',
          timestamp: data.purchaseDate,
        });
        // Expired transition
        const hist = await StatusHistory.create({
          batchId: batch._id,
          fromStatus: 'active',
          toStatus: 'expired',
          actorId: manager!._id, // simulated cron run
          note: 'System auto-transition: batch reached expiry date without action.',
          timestamp: data.expiryDate,
        });
        seededHistory.push(hist);
      } else if (data.status === 'escalated') {
        // Initial active
        await StatusHistory.create({
          batchId: batch._id,
          fromStatus: 'none',
          toStatus: 'active',
          actorId: storehand!._id,
          note: 'Initial batch registration.',
          timestamp: data.purchaseDate,
        });
        // Escalated transition
        const hist = await StatusHistory.create({
          batchId: batch._id,
          fromStatus: 'active',
          toStatus: 'escalated',
          actorId: storehand!._id,
          note: 'Escalated to supervisor - quantity exceeds expected sales prior to expiry.',
          timestamp: today,
        });
        seededHistory.push(hist);

        // Also create Escalation document
        await Escalation.create({
          batchId: batch._id,
          raisedBy: storehand!._id,
          assignedTo: supervisor!._id,
          reason: 'Quantity too high to clear before expiry date.',
          status: 'open',
          createdAt: today,
        });
      } else if (data.status === 'cleared') {
        // Initial active
        await StatusHistory.create({
          batchId: batch._id,
          fromStatus: 'none',
          toStatus: 'active',
          actorId: storehand!._id,
          note: 'Initial batch registration.',
          timestamp: data.purchaseDate,
        });
        // Cleared transition
        const hist = await StatusHistory.create({
          batchId: batch._id,
          fromStatus: 'active',
          toStatus: 'cleared',
          actorId: storehand!._id,
          note: 'Cleared: batch discarded due to expiration.',
          timestamp: today,
        });
        seededHistory.push(hist);
      }
    }

    // Seed default Notification Config
    await NotificationConfig.create({
      digestFrequency: 'daily',
      recipients: ['manager1@example.com', 'supervisor1@example.com'],
      alertThresholdDays: 7,
      enabledUrgencyColors: ['red', 'maroon', 'orange'],
    });

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      seeded: {
        users: users.length,
        thresholds: thresholds.length,
        products: products.length,
        batches: seededBatches.length,
        historyEntries: seededHistory.length + seededBatches.length, // total history
      },
    });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: error.message },
      { status: 500 }
    );
  }
}
