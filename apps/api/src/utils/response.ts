import { FastifyReply } from 'fastify';

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode: number = 200): void {
  reply.status(statusCode).send({ success: true, data } as SuccessResponse<T>);
}

export function sendError(reply: FastifyReply, statusCode: number, code: string, message: string, details?: unknown): void {
  const response: ErrorResponse = {
    success: false,
    error: { code, message },
  };
  if (details) {
    response.error.details = details;
  }
  reply.status(statusCode).send(response);
}
