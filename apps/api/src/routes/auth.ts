import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { generateToken } from '../middleware/auth.js';

/**
 * Auth routes for login/register.
 * Uses simple email-based auth with JWT tokens for local development.
 * In production, replace with OAuth2/SSO provider.
 */
export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login — returns a JWT for the given email
  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };

    if (!body.email) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    // For local dev: accept any email with any password (or no password).
    // In production, validate credentials against a user store.
    const userId = `user_${nanoid(12)}`;
    const token = generateToken(userId, body.email);

    return reply.send({
      token,
      user: { id: userId, email: body.email },
    });
  });

  // POST /api/auth/register — same as login for now (creates a new user)
  app.post('/api/auth/register', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };

    if (!body.email) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    const userId = `user_${nanoid(12)}`;
    const token = generateToken(userId, body.email);

    return reply.status(201).send({
      token,
      user: { id: userId, email: body.email },
    });
  });

  // GET /api/auth/me — returns current user info from JWT
  app.get('/api/auth/me', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    return reply.send({ id: user.sub, email: user.email });
  });
}
