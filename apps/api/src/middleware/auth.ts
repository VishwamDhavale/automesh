import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const ACTUAL_SECRET = JWT_SECRET ?? 'dev-secret-only-for-local-development';

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
}


export async function authMiddleware(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authentication token' });
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, ACTUAL_SECRET) as JwtPayload;
      (request as any).user = payload;
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
}

// Helper to generate tokens (for dev/testing)
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email } as JwtPayload,
    ACTUAL_SECRET,
    { expiresIn: '24h' }
  );
}

// Auth routes removed for security (SEC-01)
