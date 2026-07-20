import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const _forceUser = User;

    // If manager, quality-assurance, or superadmin, they get the full list of users (excluding passwordHash)
    if (['manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
      const users = await User.find().select('-passwordHash').sort({ name: 1 });
      return NextResponse.json(users);
    }

    // Otherwise, they can only fetch supervisors, managers, quality-assurance, and superadmins for escalation dropdowns
    const assignableUsers = await User.find({
      role: { $in: ['supervisor', 'manager', 'quality-assurance', 'superadmin'] }
    }).select('name email role').sort({ name: 1 });

    return NextResponse.json(assignableUsers);
  } catch (error: any) {
    console.error('GET users error:', error);
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

    // Only manager, quality-assurance, and superadmin can register new users
    if (!['manager', 'quality-assurance', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: only managers can register users' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const { name, email, role, password, assignedLocations } = body;

    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: 'Missing required user fields' }, { status: 400 });
    }

    // Check duplicate email
    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ error: 'User email is already registered' }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      role,
      passwordHash: hashedPassword,
      assignedLocations: Array.isArray(assignedLocations) ? assignedLocations : [],
    });

    const userObj = newUser.toObject();
    delete userObj.passwordHash;

    return NextResponse.json(userObj, { status: 201 });
  } catch (error: any) {
    console.error('POST user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
