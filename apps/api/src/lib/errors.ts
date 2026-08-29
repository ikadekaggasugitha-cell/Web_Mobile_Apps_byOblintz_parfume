import { FastifyReply } from 'fastify';
import { ZodError } from 'zod';

/**
 * Application-level error with an explicit HTTP status and machine-readable code.
 * Use this for *intended* business failures (e.g. empty cart) so the message is
 * safe to surface to the client. Unexpected errors should NOT use this — let them
 * propagate to the global error handler, which returns a generic 500.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Shared route-level error translator.
 * - ZodError            -> 400 VALIDATION_ERROR (schema messages are safe)
 * - AppError            -> its own status/code/message (author-controlled, safe)
 * - anything else       -> re-thrown so the global error handler returns a
 *                          generic 500 WITHOUT leaking internal details.
 */
export function handleRouteError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors.map((e) => e.message).join('; '),
      },
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }

  // Unexpected error: hand off to the global handler (generic 500, no leak).
  throw error;
}
