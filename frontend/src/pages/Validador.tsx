import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Resultado {
  diploma: {
    numero_registro: string;
    data_colacao: string;
    aluno_nome?: string;
    curso_nome?: string;
    status: string;
  };
  prova_existencia?: {
    provider: string;
    timestamp_utc: string;
    confirmado: boolean;
  } | null;
}

export default function Validador() {
  const { numeroRegistro } = useParams();
  const [numero, setNumero] = useState(numeroRegistro ?? '');
  const [res, setRes] = useState<Resultado | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const consultar = async (n: string) => {
    setLoading(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch(`${API_BASE}/public/validar/${encodeURIComponent(n)}`);
      if (!r.ok) throw new Error(r.status === 404 ? 'Diploma não encontrado' : 'Erro');
      setRes(await r.json());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold">Validador de Diploma Digital</h1>
        <p className="mb-6 text-sm text-slate-600">
          Faculdade Alpha — Portaria MEC 554/2019
        </p>
        <Card>
          <div className="flex gap-2">
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Número do registro"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <Button onClick={() => consultar(numero)} disabled={!numero || loading}>
              {loading ? '...' : 'Consultar'}
            </Button>
          </div>
          {err && <div className="mt-4 text-sm text-red-600">{err}</div>}
          {res && (
            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-md bg-green-50 p-3 text-green-800">
                Diploma localizado. Status: <strong>{res.diploma.status}</strong>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                <dt className="text-slate-500">Registro</dt>
                <dd>{res.diploma.numero_registro}</dd>
                <dt className="text-slate-500">Data colação</dt>
                <dd>{res.diploma.data_colacao}</dd>
                {res.diploma.aluno_nome && (
                  <>
                    <dt className="text-slate-500">Aluno</dt>
                    <dd>{res.diploma.aluno_nome}</dd>
                  </>
                )}
                {res.diploma.curso_nome && (
                  <>
                    <dt className="text-slate-500">Curso</dt>
                    <dd>{res.diploma.curso_nome}</dd>
                  </>
                )}
              </dl>
              {res.prova_existencia && (
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="mb-1 text-xs uppercase text-slate-500">
                    Prova de existência
                  </div>
                  <div>Provedor: {res.prova_existencia.provider}</div>
                  <div>Carimbo: {res.prova_existencia.timestamp_utc}</div>
                  <div>
                    Confirmado: {res.prova_existencia.confirmado ? 'Sim' : 'Pendente'}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
