import { cookies } from 'next/headers';
import { verifyToken, JWTPayload } from './auth';
import dbConnect from './mongodb';
import User from './models/User';

export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    
    const payload = verifyToken(token);
    if (!payload || !payload.userId) return null;

    // Verify user exists in the active database connection
    await dbConnect();
    const userDoc = await User.findById(payload.userId).select('_id role name email assignedLocations');
    if (!userDoc) return null;

    return {
      userId: userDoc._id.toString(),
      email: userDoc.email,
      role: userDoc.role,
      name: userDoc.name,
      assignedLocations: userDoc.assignedLocations || [],
    };
  } catch (error) {
    return null;
  }
}
