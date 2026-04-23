import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Adiciona X-Request-ID a cada request.
 * Reutiliza o valor enviado pelo cliente/proxy se presente.
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header('x-request-id');
    const id = incoming && /^[\w.-]{8,128}$/.test(incoming) ? incoming : randomUUID();
    req.id = id;
    res.setHeader('X-Request-ID', id);
    next();
  };
}
