import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import HttpStatus from 'http-status';
import { ZodError } from 'zod';
import AppError from '@/helpers/AppError';

type RequestWithId = Request & { requestId?: string };

const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as RequestWithId).requestId;
  let statusCode: number = Number(HttpStatus.INTERNAL_SERVER_ERROR);
  let message = 'Something went wrong!';
  let errorDetails: any = null;

  // Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        message = 'Duplicate key error';
        statusCode = Number(HttpStatus.CONFLICT);
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        statusCode = Number(HttpStatus.BAD_REQUEST);
        break;
      default:
        message = 'Database request error';
        statusCode = Number(HttpStatus.BAD_REQUEST);
        break;
    }
    errorDetails = err.meta;
  }

  // Prisma Validation
  else if (err instanceof Prisma.PrismaClientValidationError) {
    message = 'Validation error';
    statusCode = Number(HttpStatus.BAD_REQUEST);
    errorDetails = err.message;
  }

  // Zod Validation
  else if (err instanceof ZodError) {
    const zodErr = err as ZodError;
    message = 'Request validation failed';
    statusCode = Number(HttpStatus.BAD_REQUEST);
    errorDetails = zodErr.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }

  // Custom AppError
  else if (err instanceof AppError) {
    message = err.message;
    statusCode = err.statusCode;
  }

  // Default fallback
  else {
    message = err.message || message;
  }

  if (statusCode >= 500) {
    console.error('[error]', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      message,
      error: err,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId,
    error: errorDetails,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default globalErrorHandler;
