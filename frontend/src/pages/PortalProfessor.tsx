import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

const nav = [
  { to: '/professor', label: '🏠 Início' },
  { to: '/professor/turmas', label: '👥 Turmas' },
  { to: '/professor/notas', label: '📝 Notas' },
  { to: '/professor/frequencia', label: '📅 Frequência' },
];

/* ─── hook: buscar ID do professor pelo user ─── */
function useProfessorId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['professor-id', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('professores').select('id, nome_completo').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
}

/* ─── Início ─── */
function Inicio() {
  const { user } = useAuth();
  const { data: prof, isLoading } = useProfessorId();
  const { data: stats } = useQuery({
    queryKey: ['professor-stats', prof?.id],
    queryFn: async () => {
      const [turmas, pendentes] = await Promise.all([
        supabase.from('turmas').select('*', { count: 'exact', head: true }).eq('professor_id', prof!.id).eq('ativo', true),
        supabase.from('lancamentos_diario').select('*', { count: 'exact', head: true }).eq('professor_id', prof!.id).is('nota_final', null),
      ]);
      return { turmas: turmas.count ?? 0, pendentes: pendentes.count ?? 0 };
    },
    enabled: !!prof?.id,
  });
  return (
    <div className="space-y-6">
      <div>
        {isLoading ? <Skeleton className="h-8 w-48" /> : (
          <>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Olá, {prof?.nome_completo?.split(' ')[0] ?? user?.email?.split('@')[0]}! 👋
            </h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </>
        )}
      </div>
      {!isLoading && !prof && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">⚠️ Sua conta não está vinculada a um registro de professor. Procure a Coordenação.</p>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="text-center">
          <div className="text-3xl font-black text-brand-700 dark:text-brand-400">{stats?.turmas ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-1">Turmas ativas</div>
        </Card>
        <Card className="text-center">
          <div className={`text-3xl font-black ${(stats?.pendentes ?? 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>{stats?.pendentes ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-1">Notas pendentes</div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Turmas ─── */
function Turmas() {
  const { data: prof } = useProfessorId();
  const { data, isLoading } = useQuery({
    queryKey: ['professor', 'turmas', prof?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('turmas')
        .select('id, codigo, ano, semestre, ativo, cursos(nome), disciplinas(nome, codigo, carga_horaria)')
        .eq('professor_id', prof!.id)
        .order('ano', { ascending: false });
      return data ?? [];
    },
    enabled: !!prof?.id,
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Minhas turmas</h2>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon="👥" title="Nenhuma turma associada" description="Fale com a coordenação para associar turmas à sua conta." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t: any) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">{t.codigo}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.cursos?.nome ?? '—'}</div>
                  <div className="mt-1 text-xs text-slate-500">{t.disciplinas?.nome} · {t.disciplinas?.carga_horaria}h</div>
                </div>
                <Badge variant={t.ativo ? 'success' : 'default'}>{t.semestre}º/{t.ano}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Notas ─── */
function Notas() {
  const { data: prof } = useProfessorId();
  const qc = useQueryClient();
  const [selectedTurma, setSelectedTurma] = useState('');

  const { data: turmas } = useQuery({
    queryKey: ['professor', 'turmas-list', prof?.id],
    queryFn: async () => {
      const { data } = await supabase.from('turmas').select('id, codigo, ano, semestre').eq('professor_id', prof!.id).eq('ativo', true);
      return data ?? [];
    },
    enabled: !!prof?.id,
  });

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ['professor', 'notas', selectedTurma],
    queryFn: async () => {
      const { data } = await supabase
        .from('lancamentos_diario')
        .select('id, nota_final, frequencia_final, aprovado, alunos(nome_completo, matricula)')
        .eq('turma_id', selectedTurma)
        .order('alunos(nome_completo)');
      return data ?? [];
    },
    enabled: !!selectedTurma,
  });

  const salvarNota = useMutation({
    mutationFn: async ({ id, nota, freq }: { id: string; nota: number; freq: number }) => {
      const aprovado = nota >= 6 && freq >= 75;
      await supabase.from('lancamentos_diario').update({ nota_final: nota, frequencia_final: freq, aprovado }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professor', 'notas'] }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Lançamento de notas</h2>
      <select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
        <option value="">Selecione uma turma</option>
        {turmas?.map((t: any) => (
          <option key={t.id} value={t.id}>{t.codigo} — {t.semestre}º/{t.ano}</option>
        ))}
      </select>
      {selectedTurma && isLoading && <Skeleton className="h-40" />}
      {selectedTurma && !isLoading && !lancamentos?.length && (
        <EmptyState icon="📝" title="Sem alunos nesta turma" />
      )}
      {selectedTurma && (lancamentos?.length ?? 0) > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Nota</th>
                <th className="px-4 py-3">Freq. %</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {lancamentos?.map((l: any) => (
                <LancamentoRow key={l.id} lancamento={l} onSalvar={(nota, freq) => salvarNota.mutate({ id: l.id, nota, freq })} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function LancamentoRow({ lancamento, onSalvar }: {
  lancamento: { id: string; nota_final: number | null; frequencia_final: number | null; aprovado: boolean; alunos: { nome_completo: string; matricula: string } | null };
  onSalvar: (nota: number, freq: number) => void;
}) {
  const [nota, setNota] = useState(lancamento.nota_final?.toString() ?? '');
  const [freq, setFreq] = useState(lancamento.frequencia_final?.toString() ?? '');
  const dirty = nota !== (lancamento.nota_final?.toString() ?? '') || freq !== (lancamento.frequencia_final?.toString() ?? '');
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-3 font-mono text-xs">{lancamento.alunos?.matricula ?? '—'}</td>
      <td className="px-4 py-3">{lancamento.alunos?.nome_completo ?? '—'}</td>
      <td className="px-4 py-3">
        <input type="number" min="0" max="10" step="0.1" value={nota} onChange={e => setNota(e.target.value)}
          className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
      </td>
      <td className="px-4 py-3">
        <input type="number" min="0" max="100" value={freq} onChange={e => setFreq(e.target.value)}
          className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
      </td>
      <td className="px-4 py-3">
        {lancamento.nota_final != null
          ? <Badge variant={lancamento.aprovado ? 'success' : 'danger'}>{lancamento.aprovado ? 'Aprovado' : 'Reprovado'}</Badge>
          : <span className="text-xs text-slate-400">Pendente</span>}
      </td>
      <td className="px-4 py-3">
        {dirty && (
          <button onClick={() => onSalvar(parseFloat(nota), parseFloat(freq))}
            className="rounded bg-brand-700 px-2 py-1 text-xs font-medium text-white hover:bg-brand-800">
            Salvar
          </button>
        )}
      </td>
    </tr>
  );
}

/* ─── Frequência ─── */
function Frequencia() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Controle de frequência</h2>
      <Card className="border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20">
        <p className="text-sm text-brand-800 dark:text-brand-300">
          📅 Lance frequência por aula via <code className="rounded bg-brand-100 px-1 dark:bg-brand-800">POST /api/diario/frequencia</code>. O módulo de registro por QR Code e chamada digital está no roadmap (pillar 3 do todo.md).
        </p>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Regra de aprovação</h3>
        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <p>• Nota mínima: <strong>6,0</strong></p>
          <p>• Frequência mínima: <strong>75%</strong></p>
          <p>• Ambos os critérios devem ser atendidos para aprovação</p>
        </div>
      </Card>
    </div>
  );
}

export default function PortalProfessor() {
  return (
    <Shell title="Portal do Professor" nav={nav}>
      <Routes>
        <Route index element={<Inicio />} />
        <Route path="turmas" element={<Turmas />} />
        <Route path="notas" element={<Notas />} />
        <Route path="frequencia" element={<Frequencia />} />
      </Routes>
    </Shell>
  );
}
