import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Route, Routes } from 'react-router-dom';
import { useState } from 'react';

const nav = [
  { to: '/admin', label: '📊 Dashboard' },
  { to: '/admin/alunos', label: '🎓 Alunos' },
  { to: '/admin/cursos', label: '📚 Cursos' },
  { to: '/admin/turmas', label: '👥 Turmas' },
  { to: '/admin/diplomas', label: '🎖️ Diplomas' },
  { to: '/admin/usuarios', label: '👤 Usuários' },
  { to: '/admin/cofre', label: '🔐 Cofre A1' },
  { to: '/admin/auditoria', label: '🔍 Auditoria' },
  { to: '/admin/configuracoes', label: '⚙️ Configurações' },
];

/* ─── utilidade ─── */
function StatCard({ label, value, icon, color = 'brand' }: { label: string; value: string | number; icon: string; color?: string }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <Card className="flex items-center gap-4">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${colors[color]}`}>{icon}</span>
      <div>
        <div className="text-2xl font-bold text-slate-800 dark:text-white">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </Card>
  );
}

/* ─── Dashboard ─── */
function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [alunos, diplomas, docs, reqs, turmas, cursos] = await Promise.all([
        supabase.from('alunos').select('*', { count: 'exact', head: true }),
        supabase.from('diplomas_emitidos').select('*', { count: 'exact', head: true }),
        supabase.from('documentos_acervo').select('*', { count: 'exact', head: true }),
        supabase.from('requerimentos').select('*', { count: 'exact', head: true }).in('status', ['aberto', 'em_analise']),
        supabase.from('turmas').select('*', { count: 'exact', head: true }),
        supabase.from('cursos').select('*', { count: 'exact', head: true }),
      ]);
      return {
        alunos: alunos.count ?? 0,
        diplomas: diplomas.count ?? 0,
        docs: docs.count ?? 0,
        reqs: reqs.count ?? 0,
        turmas: turmas.count ?? 0,
        cursos: cursos.count ?? 0,
      };
    },
  });

  const { data: recentDiplomas } = useQuery({
    queryKey: ['admin', 'recent-diplomas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('diplomas_emitidos')
        .select('id, numero_registro, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentReqs } = useQuery({
    queryKey: ['admin', 'recent-reqs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('requerimentos')
        .select('id, tipo, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Visão geral</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Faculdade Alpha — Recife, PE</p>
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Alunos ativos" value={data?.alunos ?? 0} icon="🎓" color="brand" />
          <StatCard label="Cursos" value={data?.cursos ?? 0} icon="📚" color="brand" />
          <StatCard label="Turmas" value={data?.turmas ?? 0} icon="👥" color="green" />
          <StatCard label="Diplomas emitidos" value={data?.diplomas ?? 0} icon="🎖️" color="green" />
          <StatCard label="Docs no acervo" value={data?.docs ?? 0} icon="📄" color="brand" />
          <StatCard label="Requerimentos abertos" value={data?.reqs ?? 0} icon="📋" color={data?.reqs ? 'amber' : 'brand'} />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Diplomas recentes</h3>
          {!recentDiplomas?.length ? (
            <p className="text-sm text-slate-400">Nenhum diploma emitido ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentDiplomas.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{d.numero_registro}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={d.status === 'emitido' ? 'success' : 'default'}>{d.status}</Badge>
                    <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">Requerimentos recentes</h3>
          {!recentReqs?.length ? (
            <p className="text-sm text-slate-400">Nenhum requerimento.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentReqs.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{r.tipo}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'aberto' ? 'warning' : r.status === 'concluido' ? 'success' : 'default'}>{r.status}</Badge>
                    <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Alunos ─── */
function Alunos() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'alunos', search],
    queryFn: async () => {
      let q = supabase
        .from('alunos')
        .select('id, matricula, nome_completo, cpf, status_matricula, created_at')
        .order('nome_completo')
        .limit(50);
      if (search) q = q.ilike('nome_completo', `%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    ativo: 'success', trancado: 'warning', formado: 'default', evadido: 'danger',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Alunos</h2>
      </div>
      <input
        type="search"
        placeholder="Buscar por nome…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon="🎓" title="Nenhum aluno encontrado" description={search ? 'Tente outro nome.' : 'Importe alunos pela Secretaria.'} />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{a.matricula}</td>
                  <td className="px-4 py-3 font-medium">{a.nome_completo}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColors[a.status_matricula] ?? 'default'}>{a.status_matricula}</Badge>
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

/* ─── Cursos ─── */
function Cursos() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'cursos'],
    queryFn: async () => {
      const { data } = await supabase.from('cursos').select('*').order('nome');
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cursos</h2>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon="📚" title="Nenhum curso cadastrado" description="Cadastre o primeiro curso pelo banco de dados." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c: any) => (
            <Card key={c.id}>
              <div className="font-semibold text-slate-800 dark:text-white">{c.nome}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="default">{c.grau}</Badge>
                <Badge variant="default">{c.modalidade}</Badge>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {c.carga_horaria_total}h · {c.duracao_semestres} semestres
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Turmas ─── */
function Turmas() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'turmas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('turmas')
        .select('id, codigo, semestre, ano, ativo, cursos(nome)')
        .order('ano', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Turmas</h2>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon="👥" title="Nenhuma turma" description="Crie turmas na secretaria." />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Ativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono font-semibold">{t.codigo}</td>
                  <td className="px-4 py-3">{t.cursos?.nome ?? '—'}</td>
                  <td className="px-4 py-3">{t.semestre}º/{t.ano}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.ativo ? 'success' : 'default'}>{t.ativo ? 'Ativa' : 'Encerrada'}</Badge>
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

/* ─── Diplomas ─── */
function Diplomas() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'diplomas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('diplomas_emitidos')
        .select('id, numero_registro, data_colacao, data_expedicao, status, created_at, alunos(nome_completo), cursos(nome)')
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Diplomas emitidos</h2>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon="🎖️" title="Nenhum diploma emitido" description="Use o módulo de Secretaria para emitir diplomas (Portaria MEC 554/2019)." />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nº Registro</th>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Expedição</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{d.numero_registro}</td>
                  <td className="px-4 py-3">{d.alunos?.nome_completo ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{d.cursos?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{d.data_expedicao ? new Date(d.data_expedicao).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={d.status === 'emitido' ? 'success' : d.status === 'revogado' ? 'danger' : 'warning'}>{d.status}</Badge>
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

/* ─── Usuários ─── */
function Usuarios() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'usuarios'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome_completo, created_at, is_super_admin')
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Usuários (50 mais recentes)</h2>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3">Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data?.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium">{u.nome_completo ?? <span className="text-slate-400 italic">sem nome</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    {u.is_super_admin && <Badge variant="danger">Super Admin</Badge>}
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

/* ─── Cofre ─── */
function Cofre() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'cofre'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cofre_certificados')
        .select('id, nome, data_validade, ativo, revogado, created_at')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cofre de certificados A1</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Certificados ICP-Brasil para assinatura digital de diplomas (Portaria MEC 554/2019)</p>
      </div>
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          🔐 Certificados são armazenados cifrados com AES-256-GCM. A chave de criptografia (KEK) fica somente no ambiente do servidor. Nenhum PFX trafega pelo frontend.
        </p>
      </Card>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data?.length ? (
        <EmptyState icon="🔐" title="Nenhum certificado cadastrado" description="Use o endpoint POST /api/cofre/import via API para importar um arquivo PFX." />
      ) : (
        <div className="space-y-2">
          {data.map((c: any) => (
            <Card key={c.id} className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.nome}</div>
                <div className="text-xs text-slate-500">Validade: {new Date(c.data_validade).toLocaleDateString('pt-BR')}</div>
              </div>
              <div className="flex gap-2">
                {c.revogado
                  ? <Badge variant="danger">revogado</Badge>
                  : <Badge variant={c.ativo ? 'success' : 'default'}>{c.ativo ? 'ativo' : 'inativo'}</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Auditoria ─── */
function Auditoria() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('id, created_at, table_name, action, user_id, record_id')
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });
  const actionColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    INSERT: 'success', UPDATE: 'warning', DELETE: 'danger',
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Log de auditoria</h2>
        <p className="text-sm text-slate-500">100 últimas ações · LGPD Art. 37</p>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Tabela</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Autor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data?.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-xs">{new Date(a.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.table_name}</td>
                  <td className="px-4 py-3"><Badge variant={actionColors[a.action] ?? 'default'}>{a.action}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs">{a.user_id ? a.user_id.slice(0, 8) + '…' : 'system'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ─── Configurações ─── */
function Configuracoes() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Configurações da IES</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: 'Nome da IES', value: 'Faculdade Alpha' },
          { label: 'CNPJ', value: '00.000.000/0001-00' },
          { label: 'Código e-MEC', value: '9999' },
          { label: 'UF', value: 'PE' },
          { label: 'Município', value: 'Recife' },
          { label: 'Portaria diploma', value: 'MEC 554/2019' },
          { label: 'Portaria acervo', value: 'MEC 315/2018' },
        ].map((item) => (
          <Card key={item.label}>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</div>
            <div className="mt-1 font-semibold text-slate-800 dark:text-white">{item.value}</div>
          </Card>
        ))}
      </div>
      <Card className="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Para alterar configurações da IES, edite as variáveis de ambiente <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">IES_*</code> no Render e reimplante.
        </p>
      </Card>
    </div>
  );
}

/* ─── Export ─── */
export default function PortalAdmin() {
  return (
    <Shell title="Administração" nav={nav}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="alunos" element={<Alunos />} />
        <Route path="cursos" element={<Cursos />} />
        <Route path="turmas" element={<Turmas />} />
        <Route path="diplomas" element={<Diplomas />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="cofre" element={<Cofre />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Routes>
    </Shell>
  );
}

