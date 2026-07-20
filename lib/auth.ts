import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('WARNING: JWT_SECRET environment variable is missing. Using fallback secret.');
    return 'fallback-secret-for-dev';
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'store-hand' | 'supervisor' | 'manager' | 'quality-assurance' | 'superadmin';
  name: string;
  assignedLocations: string[];
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}
