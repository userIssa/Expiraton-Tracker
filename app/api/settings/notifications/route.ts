import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NotificationConfig from '@/lib/models/NotificationConfig';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: only managers and admins can view notification settings' },
        { status: 403 }
      );
    }

    await dbConnect();
    const _u = User;
    let config = await NotificationConfig.findOne();
    if (!config) {
      // Fallback defaults
      config = await NotificationConfig.create({
        digestFrequency: 'daily',
        recipients: [user.email],
        alertThresholdDays: 7,
        enabledUrgencyColors: ['red', 'maroon'],
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('GET notification config error:', error);
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
        { error: 'Forbidden: only managers and admins can edit notification settings' },
        { status: 403 }
      );
    }

    await dbConnect();
    const _u = User;
    const body = await request.json();
    const { digestFrequency, recipients, alertThresholdDays, enabledUrgencyColors } = body;

    if (!digestFrequency || !recipients || alertThresholdDays === undefined || !enabledUrgencyColors) {
      return NextResponse.json({ error: 'Missing configuration fields' }, { status: 400 });
    }

    // Clean recipients
    const cleanRecipients = Array.isArray(recipients)
      ? recipients.map((r) => r.trim()).filter((r) => r.includes('@'))
      : [];

    let config = await NotificationConfig.findOne();
    if (config) {
      config.digestFrequency = digestFrequency;
      config.recipients = cleanRecipients;
      config.alertThresholdDays = Number(alertThresholdDays);
      config.enabledUrgencyColors = enabledUrgencyColors;
      await config.save();
    } else {
      config = await NotificationConfig.create({
        digestFrequency,
        recipients: cleanRecipients,
        alertThresholdDays: Number(alertThresholdDays),
        enabledUrgencyColors,
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('PUT notification config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
