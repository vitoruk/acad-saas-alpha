import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Dados de entrada inválidos',
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Erro não tratado');
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor',
  });
}
