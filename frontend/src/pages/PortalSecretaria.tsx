import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { Route, Routes } from 'react-router-dom';
import { useState } from 'react';

const nav = [
  { to: '/secretaria', label: 'Início' },
  { to: '/secretaria/acervo', label: 'Acervo' },
  { to: '/secretaria/requerimentos', label: 'Requerimentos' },
  { to: '/secretaria/diplomas', label: 'Diplomas' },
];

function Inicio() {
  const { data } = useQuery({
    queryKey: ['secretaria', 'stats'],
    queryFn: async () => {
      const [docs, reqs, dips] = await Promise.all([
        supabase.from('documentos_acervo').select('*', { count: 'exact', head: true }),
        supabase
          .from('requerimentos')
          .select('*', { count: 'exact', head: true })
          .in('status', ['aberto', 'em_analise']),
        supabase.from('diplomas_emitidos').select('*', { count: 'exact', head: true }),
      ]);
      return { docs: docs.count ?? 0, reqs: reqs.count ?? 0, dips: dips.count ?? 0 };
    },
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Painel da Secretaria</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Documentos no acervo</div>
          <div className="text-3xl font-bold">{data?.docs ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Requerimentos abertos</div>
          <div className="text-3xl font-bold">{data?.reqs ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Diplomas emitidos</div>
          <div className="text-3xl font-bold">{data?.dips ?? '—'}</div>
        </Card>
      </div>
    </>
  );
}

interface Doc {
  id: string;
  nome_arquivo: string;
  hash_sha256: string;
  status: string;
  created_at: string;
}

function Acervo() {
  const { data, isLoading } = useQuery<Doc[]>({
    queryKey: ['secretaria', 'acervo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('documentos_acervo')
        .select('id, nome_arquivo, hash_sha256, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Acervo digital (CONARQ)</h2>
      {isLoading && <Card>Carregando…</Card>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card>Nenhum documento arquivado. Upload via API.</Card>
      )}
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Arquivo</th>
              <th className="px-4 py-2">SHA-256</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{d.nome_arquivo}</td>
                <td className="px-4 py-2 font-mono text-xs">{d.hash_sha256?.slice(0, 16)}…</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{d.status}</span>
                </td>
                <td className="px-4 py-2 text-xs">
                  {new Date(d.created_at).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

interface Req {
  id: string;
  numero_protocolo: string;
  status: string;
  created_at: string;
  sla_horas: number | null;
}

function Requerimentos() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Req[]>({
    queryKey: ['secretaria', 'reqs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('requerimentos')
        .select('id, numero_protocolo, status, created_at, sla_horas')
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from('requerimentos').update({ status }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secretaria', 'reqs'] }),
  });

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Requerimentos</h2>
      {isLoading && <Card>Carregando…</Card>}
      <div className="space-y-2">
        {data?.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">{r.numero_protocolo}</div>
                <div className="text-sm text-slate-600">
                  {new Date(r.created_at).toLocaleDateString('pt-BR')} · SLA {r.sla_horas}h
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.status}</span>
                {r.status === 'aberto' && (
                  <Button
                    variant="secondary"
                    onClick={() => mut.mutate({ id: r.id, status: 'em_analise' })}
                  >
                    Iniciar análise
                  </Button>
                )}
                {r.status === 'em_analise' && (
                  <Button onClick={() => mut.mutate({ id: r.id, status: 'deferido' })}>
                    Deferir
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

interface Diploma {
  id: string;
  numero_registro: string;
  data_colacao: string;
  status: string;
  created_at: string;
  url_publica_validador: string;
}

function Diplomas() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Diploma[]>({
    queryKey: ['secretaria', 'diplomas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('diplomas_emitidos')
        .select('id, numero_registro, data_colacao, status, created_at, url_publica_validador')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const emit = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/api/diplomas/emitir', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['secretaria', 'diplomas'] });
      setShowForm(false);
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Diplomas emitidos</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Emitir diploma'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              emit.mutate(Object.fromEntries(fd) as Record<string, string>);
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <input name="alunoId" required placeholder="Aluno UUID" className="rounded border px-3 py-2 text-sm" />
            <input name="certificadoEmissoraId" required placeholder="Certificado UUID" className="rounded border px-3 py-2 text-sm" />
            <input name="dataColacao" required type="date" className="rounded border px-3 py-2 text-sm" />
            <input name="numeroRegistro" required placeholder="Nº registro (ex: 2026-001)" className="rounded border px-3 py-2 text-sm" />
            <input name="livroRegistro" placeholder="Livro (opcional)" className="rounded border px-3 py-2 text-sm" />
            <input name="folhaRegistro" placeholder="Folha (opcional)" className="rounded border px-3 py-2 text-sm" />
            <div className="md:col-span-2">
              <Button type="submit" disabled={emit.isPending}>
                {emit.isPending ? 'Emitindo…' : 'Confirmar emissão'}
              </Button>
              {emit.error && (
                <div className="mt-2 text-sm text-red-600">{(emit.error as Error).message}</div>
              )}
            </div>
          </form>
        </Card>
      )}

      {isLoading && <Card>Carregando…</Card>}
      <div className="space-y-2">
        {data?.map((d) => (
          <Card key={d.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Registro</div>
                <div className="font-bold">{d.numero_registro}</div>
                <div className="text-sm text-slate-600">Colação: {d.data_colacao}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{d.status}</span>
                <a
                  href={d.url_publica_validador}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand-600 hover:underline"
                >
                  validar
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function PortalSecretaria() {
  return (
    <Shell title="Secretaria" nav={nav}>
      <Routes>
        <Route index element={<Inicio />} />
        <Route path="acervo" element={<Acervo />} />
        <Route path="requerimentos" element={<Requerimentos />} />
        <Route path="diplomas" element={<Diplomas />} />
      </Routes>
    </Shell>
  );
}
