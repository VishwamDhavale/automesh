import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

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
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
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
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Auth routes (login endpoint for development)
export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/token', async (request, reply) => {
    const { email } = request.body as { email?: string };

    if (!email) {
      return reply.status(400).send({ error: 'Email required' });
    }

    // In dev mode, generate token directly
    // In production, implement proper authentication
    const token = generateToken(`user_${Date.now()}`, email);

    return reply.send({ token, expiresIn: '24h' });
  });
}
