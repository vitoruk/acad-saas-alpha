import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Route, Routes, Link } from 'react-router-dom';
import { useState } from 'react';

const nav = [
  { to: '/aluno', label: '🏠 Início' },
  { to: '/aluno/historico', label: '📋 Histórico' },
  { to: '/aluno/matriculas', label: '📝 Matrículas' },
  { to: '/aluno/requerimentos', label: '📨 Requerimentos' },
  { to: '/aluno/diploma', label: '🎖️ Diploma' },
  { to: '/aluno/dados', label: '👤 Meus Dados' },
];

interface MeData {
  user: { id: string; email: string };
  aluno: { id: string; matricula: string; nome_completo: string; cpf: string; status_matricula: string } | null;
}

/* ─── Início ─── */
function Inicio() {
  const { data: me, isLoading } = useQuery<MeData>({
    queryKey: ['me'],
    queryFn: () => apiFetch('/api/me'),
  });
  const { data: cra } = useQuery<{ cra: number | null }>({
    queryKey: ['me', 'cra'],
    queryFn: () => apiFetch('/api/me/cra'),
  });
  const { data: diplomas } = useQuery<{ data: { id: string }[] }>({
    queryKey: ['me', 'diplomas'],
    queryFn: () => apiFetch('/api/me/diplomas'),
  });
  const { data: reqs } = useQuery<{ data: { id: string; status: string }[] }>({
    queryKey: ['me', 'requerimentos'],
    queryFn: () => apiFetch('/api/me/requerimentos'),
  });

  const nome = me?.aluno?.nome_completo ?? me?.user?.email ?? '';
  const firstName = nome.split(' ')[0];

  return (
    <div className="space-y-6">
      <div>
        {isLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Olá, {firstName}! 👋</h2>
            <p className="text-sm text-slate-500">{me?.user.email}</p>
          </>
        )}
      </div>

      {me && !me.aluno && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            ⚠️ Sua conta não está vinculada a um aluno. Procure a Secretaria Acadêmica com seu CPF e número de matrícula.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="text-center">
          <div className="text-3xl font-black text-brand-700 dark:text-brand-400">{cra?.cra?.toFixed(2) ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-1">CRA (Coef. Rendimento)</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{me?.aluno?.matricula ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-1">Matrícula</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{reqs?.data?.filter(r => r.status === 'aberto').length ?? 0}</div>
          <div className="text-xs text-slate-500 mt-1">Requerimentos abertos</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{diplomas?.data?.length ?? 0}</div>
          <div className="text-xs text-slate-500 mt-1">Diploma(s)</div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Acesso rápido</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/aluno/historico', icon: '📋', label: 'Ver histórico' },
              { to: '/aluno/matriculas', icon: '📝', label: 'Minhas matrículas' },
              { to: '/aluno/requerimentos', icon: '📨', label: 'Requerimentos' },
              { to: '/aluno/diploma', icon: '🎖️', label: 'Meu diploma' },
            ].map((item) => (
              <Link key={item.to} to={item.to} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/20">
                <span>{item.icon}</span>
                <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Status da matrícula</h3>
          {me?.aluno ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Situação atual</span>
                <Badge variant={me.aluno.status_matricula === 'ativo' ? 'success' : 'warning'}>
                  {me.aluno.status_matricula}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">CPF</span>
                <span className="font-mono text-xs">{me.aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.***-**')}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Dados não disponíveis.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Histórico ─── */
interface HistoricoItem {
  disciplina_codigo: string;
  disciplina_nome: string;
  carga_horaria: number;
  nota_final: number | null;
  frequencia_final: number | null;
  periodo_letivo: string;
  aprovado: boolean;
}

function Historico() {
  const { data, isLoading } = useQuery<{ data: HistoricoItem[] }>({
    queryKey: ['me', 'historico'],
    queryFn: () => apiFetch('/api/me/historico'),
  });
  const items = data?.data ?? [];
  const aprovadas = items.filter(h => h.aprovado).length;
  const reprovadas = items.filter(h => !h.aprovado && h.nota_final !== null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Histórico acadêmico</h2>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-green-100 px-2 py-1 text-green-800 dark:bg-green-900/30 dark:text-green-300">{aprovadas} aprovadas</span>
          {reprovadas > 0 && <span className="rounded-full bg-red-100 px-2 py-1 text-red-800 dark:bg-red-900/30 dark:text-red-300">{reprovadas} reprovadas</span>}
        </div>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : items.length === 0 ? (
        <EmptyState icon="📋" title="Sem lançamentos" description="Seu histórico aparecerá aqui após o término do primeiro período letivo." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Disciplina</th>
                <th className="px-4 py-3">CH</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3 text-center">Nota</th>
                <th className="px-4 py-3 text-center">Freq.</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {items.map((h, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{h.disciplina_codigo}</td>
                  <td className="px-4 py-3">{h.disciplina_nome}</td>
                  <td className="px-4 py-3 text-slate-500">{h.carga_horaria}h</td>
                  <td className="px-4 py-3 text-xs">{h.periodo_letivo}</td>
                  <td className="px-4 py-3 text-center font-bold">{h.nota_final?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3 text-center">{h.frequencia_final != null ? `${h.frequencia_final}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={h.aprovado ? 'success' : 'danger'}>{h.aprovado ? 'Aprovado' : 'Reprovado'}</Badge>
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

/* ─── Matrículas ─── */
function Matriculas() {
  const { data, isLoading } = useQuery<{ data: { id: string; status: string; turma: { codigo: string; ano: number; semestre: number } | null }[] }>({
    queryKey: ['me', 'matriculas'],
    queryFn: () => apiFetch('/api/me/matriculas'),
  });
  const items = data?.data ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Minhas matrículas</h2>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon="📝" title="Nenhuma matrícula" description="Suas matrículas em turmas aparecerão aqui." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <Card key={m.id}>
              <div className="text-xs text-slate-500 dark:text-slate-400">{m.turma?.ano}/{m.turma?.semestre}º semestre</div>
              <div className="font-semibold text-slate-800 dark:text-white">{m.turma?.codigo ?? '—'}</div>
              <div className="mt-2">
                <Badge variant={m.status === 'ativo' ? 'success' : m.status === 'trancado' ? 'warning' : 'default'}>{m.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Requerimentos ─── */
function Requerimentos() {
  const { data, isLoading } = useQuery<{ data: { id: string; numero_protocolo: string; status: string; created_at: string; tipo: { nome: string } | null }[] }>({
    queryKey: ['me', 'requerimentos'],
    queryFn: () => apiFetch('/api/me/requerimentos'),
  });
  const items = data?.data ?? [];
  const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    aberto: 'warning', em_analise: 'default', concluido: 'success', indeferido: 'danger',
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Meus requerimentos</h2>
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon="📨" title="Nenhum requerimento" description="Você ainda não abriu nenhum requerimento junto à Secretaria." />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">{r.tipo?.nome ?? 'Requerimento'}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">{r.numero_protocolo}</div>
                  <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <Badge variant={statusVariant[r.status] ?? 'default'}>{r.status.replace('_', ' ')}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Diploma ─── */
function Diploma() {
  const { data, isLoading } = useQuery<{ data: { id: string; numero_registro: string; data_colacao: string; status: string; url_publica_validador: string }[] }>({
    queryKey: ['me', 'diplomas'],
    queryFn: () => apiFetch('/api/me/diplomas'),
  });
  const items = data?.data ?? [];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Meu diploma</h2>
      {isLoading ? <Skeleton className="h-40" /> : items.length === 0 ? (
        <EmptyState
          icon="🎖️"
          title="Diploma ainda não emitido"
          description="Seu diploma digital (Portaria MEC 554/2019) aparecerá aqui após a colação de grau e emissão pela Secretaria."
        />
      ) : (
        <div className="space-y-4">
          {items.map((d) => (
            <Card key={d.id} className="border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">Diploma Digital · MEC 554/2019</div>
                  <div className="mt-1 text-2xl font-black text-brand-800 dark:text-brand-300">{d.numero_registro}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Colação: {new Date(d.data_colacao).toLocaleDateString('pt-BR')}</div>
                  <div className="mt-2">
                    <Badge variant={d.status === 'emitido' ? 'success' : 'warning'}>{d.status}</Badge>
                  </div>
                </div>
                <a
                  href={d.url_publica_validador}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  🔍 Validar
                </a>
              </div>
            </Card>
          ))}
          <Card className="text-sm text-slate-500 dark:text-slate-400">
            <p>O diploma digital tem validade jurídica equivalente ao físico, com assinatura ICP-Brasil. Para verificar a autenticidade, use o link "Validar" acima ou acesse o Validador Público.</p>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─── Meus Dados ─── */
function MeusDados() {
  const { data: me, isLoading } = useQuery<MeData>({
    queryKey: ['me'],
    queryFn: () => apiFetch('/api/me'),
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/me/export`, {
        headers: { Authorization: `Bearer ${(await import('@/lib/supabase').then(m => m.supabase.auth.getSession())).data.session?.access_token}` },
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'meus-dados.json'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!confirm('Solicitar eliminação da conta? O prazo legal é de 15 dias úteis.')) return;
    const session = (await import('@/lib/supabase').then(m => m.supabase.auth.getSession())).data.session;
    await fetch(`${import.meta.env.VITE_API_URL}/api/me/delete-request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    setDeleteRequested(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Meus dados</h2>
        <p className="text-sm text-slate-500">Direitos LGPD · Art. 18</p>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : (
        <Card>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">E-mail</span>
              <span className="font-medium">{me?.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nome</span>
              <span className="font-medium">{me?.aluno?.nome_completo ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Matrícula</span>
              <span className="font-mono">{me?.aluno?.matricula ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CPF</span>
              <span className="font-mono">{me?.aluno?.cpf ? me.aluno.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '***.$2.***-**') : '—'}</span>
            </div>
          </div>
        </Card>
      )}
      <Card>
        <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Privacidade (LGPD)</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Exporte todos os seus dados pessoais em formato JSON (Art. 18, II — portabilidade).</p>
            <button onClick={handleExport} disabled={exportLoading} className="mt-2 rounded-lg border border-brand-300 px-4 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-600 dark:text-brand-400">
              {exportLoading ? 'Exportando…' : '⬇️ Exportar meus dados'}
            </button>
          </div>
          <hr className="border-slate-100 dark:border-slate-700" />
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Solicite a eliminação dos seus dados (Art. 18, VI). O prazo é de 15 dias úteis.</p>
            {deleteRequested ? (
              <p className="mt-2 text-sm text-green-600">✅ Solicitação enviada. Você receberá uma resposta em até 15 dias úteis.</p>
            ) : (
              <button onClick={handleDeleteRequest} className="mt-2 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400">
                🗑️ Solicitar eliminação da conta
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function PortalAluno() {
  return (
    <Shell title="Portal do Aluno" nav={nav}>
      <Routes>
        <Route index element={<Inicio />} />
        <Route path="historico" element={<Historico />} />
        <Route path="matriculas" element={<Matriculas />} />
        <Route path="requerimentos" element={<Requerimentos />} />
        <Route path="diploma" element={<Diploma />} />
        <Route path="dados" element={<MeusDados />} />
      </Routes>
    </Shell>
  );
}
