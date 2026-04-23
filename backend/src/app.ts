/**
 * app.ts — Application factory do Express.
 * Separado de server.ts para permitir testes (supertest) sem subir porta.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import rateLimit from 'express-rate-limit';
import { env, corsOrigins } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';

// Rotas
import { diplomaRouter } from './modules/diplomas/diploma.routes.js';
import { validadorPublicoRouter } from './modules/diplomas/validador-publico.routes.js';
import { cursoRouter } from './modules/academico/cursos/curso.routes.js';
import { turmaRouter } from './modules/academico/turmas/turma.routes.js';
import { matriculaRouter } from './modules/academico/matriculas/matricula.routes.js';
import { diarioRouter } from './modules/academico/diario/diario.routes.js';
import { requerimentoRouter } from './modules/academico/requerimentos/requerimento.routes.js';
import { historicoRouter } from './modules/academico/historico/historico.routes.js';
import { meRouter } from './modules/me/me.routes.js';

export function createApp(): express.Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // APIs não precisam de CSP
  }));
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(pinoHttp({ logger }));

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Health checks
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
  app.get('/healthz', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
  app.get('/ready', (_req, res) => res.json({ status: 'ready' }));

  // Validador público (sem auth, acessível ao público)
  app.use('/public/validar', validadorPublicoRouter);

  // APIs privadas (autenticadas via authMiddleware em cada router)
  app.use('/api/diplomas', diplomaRouter);
  app.use('/api/cursos', cursoRouter);
  app.use('/api/turmas', turmaRouter);
  app.use('/api/matriculas', matriculaRouter);
  app.use('/api/diario', diarioRouter);
  app.use('/api/requerimentos', requerimentoRouter);
  app.use('/api/historico', historicoRouter);
  app.use('/api/me', meRouter);

  // Error handler (SEMPRE por último)
  app.use(errorHandler);

  return app;
}
