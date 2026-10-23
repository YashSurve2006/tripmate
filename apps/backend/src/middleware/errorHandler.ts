import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): Response {
  // Handle AppError
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation error', 422, 'VALIDATION_ERROR', formatted);
  }

  // Handle Prisma known request errors
  if (err.code === 'P2002') {
    return sendError(res, 'A record with this unique value already exists', 409, 'CONFLICT', {
      target: err.meta?.target,
    });
  }

  if (err.code === 'P2025') {
    return sendError(res, 'Record not found in database', 404, 'NOT_FOUND');
  }

  // Handle generic error
  console.error('Unhandled internal server error:', err);
  return sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'Internal Server Error',
    500,
    'INTERNAL_SERVER_ERROR'
  );
}
