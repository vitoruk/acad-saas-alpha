import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express';
import { supabaseAdmin } from '../../lib/supabase.js';
import { NotFoundError } from '../../lib/errors.js';

export const validadorPublicoRouter: RouterType = Router();

/**
 * GET /:numeroRegistro — retorna dados públicos do diploma + status de revogação.
 * Usado pelo QR Code no PDF (RVDD).
 */
validadorPublicoRouter.get('/:numeroRegistro', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { numeroRegistro } = req.params;
    const { data, error } = await supabaseAdmin
      .from('vw_diplomas_publicos')
      .select('*')
      .eq('numero_registro', numeroRegistro)
      .single();

    if (error || !data) throw new NotFoundError('Diploma não localizado');

    // Busca log blockchain mais recente para exibir prova
    const { data: logs } = await supabaseAdmin
      .from('logs_blockchain')
      .select('provider, timestamp_utc, confirmado, anchor_info')
      .eq('diploma_id', data.id)
      .order('created_at', { ascending: false })
      .limit(1);

    res.json({
      diploma: data,
      prova_existencia: logs?.[0] ?? null,
    });
  } catch (err) {
    next(err);
  }
});
