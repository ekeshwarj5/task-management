import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config';
import { verifyToken, type JwtPayload } from '../utils/jwt';

/**
 * Augment FastifyRequest so routes can read request.user without casts.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * preHandler that verifies the JWT cookie and attaches the decoded
 * payload to request.user. Rejects with 401 if the cookie is missing
 * or the token is invalid / expired.
 */
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const token = request.cookies[config.COOKIE_NAME];
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
  }
  try {
    request.user = verifyToken(token);
  } catch {
    return reply
      .code(401)
      .send({ error: 'Unauthorized', message: 'Invalid or expired session' });
  }
};
