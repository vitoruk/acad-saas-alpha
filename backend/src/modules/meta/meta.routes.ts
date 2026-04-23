import type { Request, Response } from 'express';
import { Router, type Router as RouterType } from 'express';
import { supabaseAdmin } from '../../lib/supabase.js';

export const publicMetaRouter: RouterType = Router();

/**
 * security.txt conforme RFC 9116.
 */
publicMetaRouter.get('/.well-known/security.txt', (_req: Request, res: Response) => {
  res.type('text/plain').send(
    [
      'Contact: mailto:security@alpha.edu.br',
      'Expires: 2027-12-31T23:59:59Z',
      'Preferred-Languages: pt-BR, en',
      'Canonical: https://api.alpha.edu.br/.well-known/security.txt',
      'Policy: https://alpha.edu.br/seguranca',
      '',
    ].join('\n'),
  );
});

/**
 * robots.txt mínimo — permite indexar apenas o validador público.
 */
publicMetaRouter.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Disallow: /api/', 'Allow: /public/', ''].join('\n'),
  );
});

/**
 * Healthcheck estendido: testa conectividade com Supabase.
 */
publicMetaRouter.get('/healthz/deep', async (_req: Request, res: Response) => {
  const started = Date.now();
  let supabaseOk = false;
  let supabaseLatency = 0;
  try {
    const t0 = Date.now();
    const { error } = await supabaseAdmin.from('ies').select('id').limit(1);
    supabaseLatency = Date.now() - t0;
    supabaseOk = !error;
  } catch {
    supabaseOk = false;
  }
  const status = supabaseOk ? 'ok' : 'degraded';
  res.status(supabaseOk ? 200 : 503).json({
    status,
    ts: new Date().toISOString(),
    uptime_s: Math.round(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    deps: {
      supabase: { ok: supabaseOk, latency_ms: supabaseLatency },
    },
    took_ms: Date.now() - started,
  });
});
