import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { Route, Routes } from 'react-router-dom';
import { useState } from 'react';

const nav = [
  { to: '/secretaria', label: '🏠 Painel' },
  { to: '/secretaria/alunos', label: '🎓 Alunos' },
  { to: '/secretaria/acervo', label: '📁 Acervo' },
  { to: '/secretaria/requerimentos', label: '📨 Requerimentos' },
  { to: '/secretaria/diplomas', label: '🎖️ Diplomas' },
  { to: '/secretaria/historico', label: '📋 Histórico' },
];

function Inicio() {
  const { data, isLoading } = useQuery({
    queryKey: ['secretaria', 'stats'],
    queryFn: async () => {
      const [docs, reqs, dips, alunos] = await Promise.all([
        supabase.from('documentos_acervo').select('*', { count: 'exact', head: true }),
        supabase.from('requerimentos').select('*', { count: 'exact', head: true }).in('status', ['aberto', 'em_analise']),
        supabase.from('diplomas_emitidos').select('*', { count: 'exact', head: true }),
        supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('status_matricula', 'ativo'),
      ]);
      return { docs: docs.count ?? 0, reqs: reqs.count ?? 0, dips: dips.count ?? 0, alunos: alunos.count ?? 0 };
    },
  });
  const { data: pendentes } = useQuery({
    queryKey: ['secretaria', 'reqs-pendentes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('requerimentos')
        .select('id, numero_protocolo, tipo, status, created_at, sla_horas')
        .in('status', ['aberto', 'em_analise'])
        .order('created_at')
        .limit(5);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Painel da Secretaria</h2>
        <p className="text-sm text-slate-500">Portaria MEC 315/2018 · 554/2019</p>
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Alunos ativos', value: data?.alunos ?? 0, icon: '🎓' },
            { label: 'Docs no acervo', value: data?.docs ?? 0, icon: '📁' },
            { label: 'Requerimentos abertos', value: data?.reqs ?? 0, icon: '📨' },
            { label: 'Diplomas emitidos', value: data?.dips ?? 0, icon: '🎖️' },
          ].map(s => (
            <Card key={s.label} className="flex items-center gap-4">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {(pendentes?.length ?? 0) > 0 && (
        <Card>
          <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">⚠️ Requerimentos aguardando ação</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {pendentes?.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">{r.tipo}</span>
                  <span className="ml-2 font-mono text-xs text-slate-400">{r.numero_protocolo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === 'aberto' ? 'warning' : 'default'}>{r.status}</Badge>
                  {r.sla_horas && <span className="text-xs text-slate-400">SLA {r.sla_horas}h</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function AlunosSecretaria() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['secretaria', 'alunos', search],
    queryFn: async () => {
      let q = supabase
        .from('alunos')
        .select('id, matricula, nome_completo, cpf, email, status_matricula, created_at')
        .order('nome_completo')
        .limit(50);
      if (search) q = q.or(`nome_completo.ilike.%${search}%,matricula.ilike.%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Gestão de Alunos</h2>
      <input type="search" placeholder="Buscar por nome ou matrícula…" value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
      {isLoading ? <Skeleton className="h-64" /> : !data?.length ? (
        <EmptyState icon="🎓" title="Nenhum aluno encontrado" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ingresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{a.matricula}</td>
                  <td className="px-4 py-3 font-medium">{a.nome_completo}</td>
                  <td className="px-4 py-3 text-xs">{a.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={a.status_matricula === 'ativo' ? 'success' : a.status_matricula === 'trancado' ? 'warning' : 'default'}>{a.status_matricula}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Acervo() {
  const { data, isLoading } = useQuery({
    queryKey: ['secretaria', 'acervo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('documentos_acervo')
        .select('id, nome_arquivo, hash_sha256, status, tipo_documento, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Acervo digital</h2>
        <p className="text-sm text-slate-500">Portaria MEC 315/2018 · preservação CONARQ</p>
      </div>
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-sm text-blue-800 dark:text-blue-300">📁 Documentos são armazenados com hash SHA-256 para garantia de integridade. Cada arquivo é imutável após o arquivamento.</p>
      </Card>
      {isLoading ? <Skeleton className="h-64" /> : !data?.length ? (
        <EmptyState icon="📁" title="Acervo vazio" description="Faça upload de documentos via API: POST /api/acervo/upload" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Arquivo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Hash SHA-256</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="max-w-xs truncate px-4 py-3 text-sm">{d.nome_arquivo}</td>
                  <td className="px-4 py-3 text-xs">{d.tipo_documento ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.hash_sha256?.slice(0, 16)}…</td>
                  <td className="px-4 py-3"><Badge variant={d.status === 'ativo' ? 'success' : 'default'}>{d.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Requerimentos() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<'todos' | 'aberto' | 'em_analise'>('todos');
  const { data, isLoading } = useQuery({
    queryKey: ['secretaria', 'reqs', filtro],
    queryFn: async () => {
      let q = supabase
        .from('requerimentos')
        .select('id, numero_protocolo, tipo, status, created_at, sla_horas')
        .order('created_at', { ascending: false })
        .limit(100);
      if (filtro !== 'todos') q = q.eq('status', filtro);
      const { data } = await q;
      return data ?? [];
    },
  });
  const atualizarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from('requerimentos').update({ status }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secretaria', 'reqs'] }),
  });
  const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    aberto: 'warning', em_analise: 'default', deferido: 'success', indeferido: 'danger', concluido: 'success',
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Requerimentos</h2>
        <div className="flex gap-2">
          {(['todos', 'aberto', 'em_analise'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${filtro === f ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}>
              {f === 'todos' ? 'Todos' : f === 'aberto' ? 'Abertos' : 'Em análise'}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : !data?.length ? <EmptyState icon="📨" title={`Nenhum requerimento${filtro !== 'todos' ? ' ' + filtro : ''}`} />
        : (
          <div className="space-y-2">
            {data.map((r: any) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-white">{r.tipo}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-slate-400">{r.numero_protocolo}</span>
                      <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                      {r.sla_horas && <span className="text-xs text-slate-400">SLA {r.sla_horas}h</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status.replace('_', ' ')}</Badge>
                    {r.status === 'aberto' && (
                      <button onClick={() => atualizarStatus.mutate({ id: r.id, status: 'em_analise' })}
                        className="rounded-lg border border-brand-300 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-600 dark:text-brand-400">
                        Iniciar análise
                      </button>
                    )}
                    {r.status === 'em_analise' && (
                      <div className="flex gap-1">
                        <button onClick={() => atualizarStatus.mutate({ id: r.id, status: 'deferido' })}
                          className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700">Deferir</button>
                        <button onClick={() => atualizarStatus.mutate({ id: r.id, status: 'indeferido' })}
                          className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700">Indeferir</button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

function Diplomas() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['secretaria', 'diplomas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('diplomas_emitidos')
        .select('id, numero_registro, data_colacao, data_expedicao, status, created_at, url_publica_validador, alunos(nome_completo), cursos(nome)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });
  const emit = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/api/diplomas/emitir', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['secretaria', 'diplomas'] }); setShowForm(false); },
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Diplomas digitais</h2>
          <p className="text-sm text-slate-500">Portaria MEC 554/2019 · ICP-Brasil</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancelar' : '+ Emitir diploma'}</Button>
      </div>
      {showForm && (
        <Card>
          <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Nova emissão</h3>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); emit.mutate(Object.fromEntries(fd) as Record<string, string>); }}
            className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">UUID do aluno</label>
              <input name="alunoId" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">UUID do certificado A1</label>
              <input name="certificadoEmissoraId" required placeholder="UUID do cofre" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Data da colação</label>
              <input name="dataColacao" required type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Nº de registro</label>
              <input name="numeroRegistro" required placeholder="2026.001.PE" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Livro de registro</label>
              <input name="livroRegistro" placeholder="Livro 1 (opcional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={emit.isPending}>{emit.isPending ? 'Emitindo…' : 'Confirmar emissão'}</Button>
              {emit.error && <span className="text-sm text-red-600">{(emit.error as Error).message}</span>}
              {emit.isSuccess && <span className="text-sm text-green-600">✅ Diploma emitido com sucesso!</span>}
            </div>
          </form>
        </Card>
      )}
      {isLoading ? <Skeleton className="h-64" /> : !data?.length ? (
        <EmptyState icon="🎖️" title="Nenhum diploma emitido" description="Use o formulário acima para emitir o primeiro diploma digital." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nº Registro</th>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Colação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{d.numero_registro}</td>
                  <td className="px-4 py-3">{d.alunos?.nome_completo ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{d.cursos?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{new Date(d.data_colacao).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3"><Badge variant={d.status === 'emitido' ? 'success' : 'warning'}>{d.status}</Badge></td>
                  <td className="px-4 py-3">
                    {d.url_publica_validador && (
                      <a href={d.url_publica_validador} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">🔍 Validar</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Historico() {
  const [alunoId, setAlunoId] = useState('');
  const [buscou, setBuscou] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['secretaria', 'historico', alunoId],
    queryFn: async () => {
      if (!alunoId) return [];
      const { data } = await supabase
        .from('lancamentos_diario')
        .select('id, nota_final, frequencia_final, aprovado, periodo_letivo, disciplinas(codigo, nome, carga_horaria)')
        .eq('aluno_id', alunoId)
        .order('periodo_letivo', { ascending: false });
      return data ?? [];
    },
    enabled: false,
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Histórico acadêmico</h2>
      <div className="flex gap-2">
        <input type="text" placeholder="UUID do aluno" value={alunoId} onChange={e => setAlunoId(e.target.value)}
          className="flex-1 max-w-sm rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
        <button onClick={() => { setBuscou(true); refetch(); }}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          Buscar
        </button>
      </div>
      {buscou && isLoading && <Skeleton className="h-40" />}
      {buscou && !isLoading && !data?.length && <EmptyState icon="📋" title="Sem lançamentos" description="Nenhum lançamento encontrado para este aluno." />}
      {buscou && (data?.length ?? 0) > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Disciplina</th>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-center">Nota</th>
                <th className="px-4 py-3 text-center">Freq.</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data?.map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">{l.disciplinas?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{l.periodo_letivo}</td>
                  <td className="px-4 py-3 text-center font-bold">{l.nota_final?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3 text-center">{l.frequencia_final != null ? `${l.frequencia_final}%` : '—'}</td>
                  <td className="px-4 py-3"><Badge variant={l.aprovado ? 'success' : 'danger'}>{l.aprovado ? 'Aprovado' : 'Reprovado'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function PortalSecretaria() {
  return (
    <Shell title="Secretaria Acadêmica" nav={nav}>
      <Routes>
        <Route index element={<Inicio />} />
        <Route path="alunos" element={<AlunosSecretaria />} />
        <Route path="acervo" element={<Acervo />} />
        <Route path="requerimentos" element={<Requerimentos />} />
        <Route path="diplomas" element={<Diplomas />} />
        <Route path="historico" element={<Historico />} />
      </Routes>
    </Shell>
  );
}
