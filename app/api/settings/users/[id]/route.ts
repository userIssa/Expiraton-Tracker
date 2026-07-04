import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getCurrentUser } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    // Prevent deleting oneself
    if (id === user.userId) {
      return NextResponse.json({ error: 'Cannot delete your own superadmin account' }, { status: 400 });
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('DELETE user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    const editUser = await User.findById(id);
    if (!editUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, role, assignedLocations, password } = body;

    if (name !== undefined) editUser.name = name.trim();
    if (role !== undefined) {
      // Prevent demoting oneself
      if (id === user.userId && role !== 'superadmin') {
        return NextResponse.json({ error: 'Cannot change your own superadmin role' }, { status: 400 });
      }
      editUser.role = role;
    }
    if (assignedLocations !== undefined) {
      editUser.assignedLocations = Array.isArray(assignedLocations) ? assignedLocations : [];
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      editUser.password = await bcrypt.hash(password, salt);
    }

    await editUser.save();

    const userObj = editUser.toObject();
    delete userObj.password;

    return NextResponse.json(userObj);
  } catch (error: any) {
    console.error('PATCH user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
