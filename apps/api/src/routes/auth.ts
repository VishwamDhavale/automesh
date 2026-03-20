import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';
import { generateToken } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';

const scryptAsync = promisify(scrypt);

// ─── Password Helpers ───────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');
  return timingSafeEqual(derived, keyBuffer);
}

// ─── Auth Routes ────────────────────────────────────────────────

/**
 * Auth routes for login/register.
 * Uses email + password auth with scrypt hashing, backed by Postgres.
 */
export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register — Create a new user account
  app.post('/api/auth/register', async (request, reply) => {
    const body = request.body as { email?: string; password?: string; name?: string };

    if (!body.email) {
      return reply.status(400).send({ error: 'Email is required' });
    }
    if (!body.password || body.password.length < 6) {
      return reply.status(400).send({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, body.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({ error: 'An account with this email already exists' });
    }

    const userId = `user_${nanoid(12)}`;
    const passwordHash = await hashPassword(body.password);

    await db.insert(schema.users).values({
      id: userId,
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name ?? null,
    });

    const token = generateToken(userId, body.email.toLowerCase());

    return reply.status(201).send({
      token,
      user: { id: userId, email: body.email.toLowerCase(), name: body.name ?? null },
    });
  });

  // POST /api/auth/login — Authenticate an existing user
  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };

    if (!body.email) {
      return reply.status(400).send({ error: 'Email is required' });
    }
    if (!body.password) {
      return reply.status(400).send({ error: 'Password is required' });
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, body.email.toLowerCase()))
      .limit(1);

    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.email);

    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });

  // GET /api/auth/me — Returns current user info from JWT + DB
  app.get('/api/auth/me', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const jwtUser = (request as any).user;

    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, jwtUser.sub))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send(user);
  });
}
