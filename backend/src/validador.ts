/**
 * validador.ts — Entry point separado para o serviço público de validação.
 * Deploy isolado no Render para que rate limits / escala sejam independentes.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { validadorPublicoRouter } from './modules/diplomas/validador-publico.routes.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(pinoHttp({ logger }));

const limiter = rateLimit({
  windowMs: 60_000,
  max: 60, // 60/min por IP (Cloudflare protege acima disso)
  standardHeaders: 'draft-7',
});
app.use('/validar', limiter);

app.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'validador_publico' }));
app.use('/validar', validadorPublicoRouter);
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, '🛡️  Validador Público iniciado');
});
