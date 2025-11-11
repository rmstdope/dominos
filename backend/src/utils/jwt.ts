import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}

export function generateToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (_error) {
    return null;
  }
}
