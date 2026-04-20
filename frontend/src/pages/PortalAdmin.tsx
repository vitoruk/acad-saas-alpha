import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Route, Routes } from 'react-router-dom';

const nav = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/cursos', label: 'Cursos' },
  { to: '/admin/usuarios', label: 'Usuários' },
  { to: '/admin/cofre', label: 'Cofre A1' },
  { to: '/admin/auditoria', label: 'Auditoria' },
];

function Dashboard() {
  const { data } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [alunos, diplomas, docs, reqs] = await Promise.all([
        supabase.from('alunos').select('*', { count: 'exact', head: true }),
        supabase.from('diplomas_emitidos').select('*', { count: 'exact', head: true }),
        supabase.from('documentos_acervo').select('*', { count: 'exact', head: true }),
        supabase
          .from('requerimentos')
          .select('*', { count: 'exact', head: true })
          .in('status', ['aberto', 'em_analise']),
      ]);
      return {
        alunos: alunos.count ?? 0,
        diplomas: diplomas.count ?? 0,
        docs: docs.count ?? 0,
        reqs: reqs.count ?? 0,
      };
    },
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Visão geral</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="text-sm text-slate-500">Alunos</div>
          <div className="text-3xl font-bold">{data?.alunos ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Diplomas emitidos</div>
          <div className="text-3xl font-bold">{data?.diplomas ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Docs no acervo</div>
          <div className="text-3xl font-bold">{data?.docs ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Requerimentos abertos</div>
          <div className="text-3xl font-bold">{data?.reqs ?? '—'}</div>
        </Card>
      </div>
    </>
  );
}

function Cursos() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'cursos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cursos')
        .select('*')
        .order('nome');
      return data ?? [];
    },
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Cursos</h2>
      {isLoading && <Card>Carregando…</Card>}
      <div className="space-y-2">
        {data?.map((c: { id: string; nome: string; grau: string; modalidade: string; carga_horaria_total: number }) => (
          <Card key={c.id}>
            <div className="font-medium">{c.nome}</div>
            <div className="text-sm text-slate-500">
              {c.grau} · {c.modalidade} · {c.carga_horaria_total}h
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

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
    <>
      <h2 className="mb-4 text-xl font-semibold">Usuários (50 mais recentes)</h2>
      {isLoading && <Card>Carregando…</Card>}
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Criado em</th>
              <th className="px-4 py-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u: { id: string; nome_completo: string | null; created_at: string; is_super_admin: boolean }) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{u.nome_completo ?? '—'}</td>
                <td className="px-4 py-2">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-2">{u.is_super_admin ? 'SIM' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

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
    <>
      <h2 className="mb-4 text-xl font-semibold">Cofre de certificados A1</h2>
      {isLoading && <Card>Carregando…</Card>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card className="border-amber-300 bg-amber-50 text-sm text-amber-800">
          Nenhum certificado cadastrado. Use o endpoint de upload (backend) para importar um PFX.
        </Card>
      )}
      {data?.map((c: { id: string; nome: string; data_validade: string; ativo: boolean; revogado: boolean }) => (
        <Card key={c.id} className="mb-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{c.nome}</div>
              <div className="text-xs text-slate-500">Validade: {c.data_validade}</div>
            </div>
            <div className="flex gap-2">
              <span className={c.ativo ? 'rounded bg-green-100 px-2 py-0.5 text-xs text-green-800' : 'rounded bg-slate-100 px-2 py-0.5 text-xs'}>
                {c.ativo ? 'ativo' : 'inativo'}
              </span>
              {c.revogado && (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                  revogado
                </span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}

function Auditoria() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Auditoria (100 últimas ações)</h2>
      {isLoading && <Card>Carregando…</Card>}
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Quando</th>
              <th className="px-4 py-2">Tabela</th>
              <th className="px-4 py-2">Ação</th>
              <th className="px-4 py-2">Autor</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((a: { id: string; created_at: string; table_name: string; action: string; user_id: string | null }) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-xs">
                  {new Date(a.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{a.table_name}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{a.action}</span>
                </td>
                <td className="px-4 py-2 text-xs">{a.user_id?.slice(0, 8) ?? 'system'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export default function PortalAdmin() {
  return (
    <Shell title="Admin" nav={nav}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="cursos" element={<Cursos />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="cofre" element={<Cofre />} />
        <Route path="auditoria" element={<Auditoria />} />
      </Routes>
    </Shell>
  );
}
