import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtPayload } from '../middleware/auth.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: JwtPayload;
  }
}
