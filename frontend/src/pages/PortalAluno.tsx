import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Route, Routes } from 'react-router-dom';

const nav = [
  { to: '/aluno', label: 'Início' },
  { to: '/aluno/historico', label: 'Histórico' },
  { to: '/aluno/matriculas', label: 'Matrículas' },
  { to: '/aluno/requerimentos', label: 'Requerimentos' },
  { to: '/aluno/diploma', label: 'Diploma' },
];

interface MeData {
  user: { id: string; email: string };
  aluno: { id: string; matricula: string; nome_completo: string } | null;
}

function Inicio() {
  const { data: me } = useQuery<MeData>({
    queryKey: ['me'],
    queryFn: () => apiFetch('/api/me'),
  });
  const { data: cra } = useQuery<{ cra: number | null }>({
    queryKey: ['me', 'cra'],
    queryFn: () => apiFetch('/api/me/cra'),
  });

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">
        Olá, {me?.aluno?.nome_completo ?? me?.user?.email ?? '…'}
      </h2>
      {me && !me.aluno && (
        <Card className="mb-4 border-amber-300 bg-amber-50">
          <div className="text-sm text-amber-800">
            Sua conta não está vinculada a um registro de aluno. Procure a Secretaria.
          </div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">CRA</div>
          <div className="text-3xl font-bold">{cra?.cra?.toFixed(2) ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Matrícula</div>
          <div className="text-xl font-medium">{me?.aluno?.matricula ?? '—'}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">E-mail</div>
          <div className="truncate text-sm font-medium">{me?.user?.email}</div>
        </Card>
      </div>
    </>
  );
}

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

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Histórico acadêmico</h2>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Disciplina</th>
              <th className="px-4 py-2">CH</th>
              <th className="px-4 py-2">Período</th>
              <th className="px-4 py-2">Nota</th>
              <th className="px-4 py-2">Freq.</th>
              <th className="px-4 py-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && (data?.data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Sem lançamentos.
                </td>
              </tr>
            )}
            {data?.data.map((h, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{h.disciplina_codigo}</td>
                <td className="px-4 py-2">{h.disciplina_nome}</td>
                <td className="px-4 py-2">{h.carga_horaria}h</td>
                <td className="px-4 py-2">{h.periodo_letivo}</td>
                <td className="px-4 py-2">{h.nota_final?.toFixed(1) ?? '—'}</td>
                <td className="px-4 py-2">
                  {h.frequencia_final != null ? `${h.frequencia_final}%` : '—'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      h.aprovado
                        ? 'rounded bg-green-100 px-2 py-0.5 text-xs text-green-800'
                        : 'rounded bg-red-100 px-2 py-0.5 text-xs text-red-800'
                    }
                  >
                    {h.aprovado ? 'Aprovado' : 'Reprovado'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

interface MatriculaItem {
  id: string;
  status: string;
  turma: { codigo: string; ano: number; semestre: number } | null;
}

function Matriculas() {
  const { data, isLoading } = useQuery<{ data: MatriculaItem[] }>({
    queryKey: ['me', 'matriculas'],
    queryFn: () => apiFetch('/api/me/matriculas'),
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Minhas matrículas</h2>
      {isLoading && <Card>Carregando…</Card>}
      {!isLoading && (data?.data?.length ?? 0) === 0 && (
        <Card>Nenhuma matrícula encontrada.</Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.data.map((m) => (
          <Card key={m.id}>
            <div className="text-xs uppercase text-slate-500">
              {m.turma?.ano}.{m.turma?.semestre}
            </div>
            <div className="font-medium">{m.turma?.codigo}</div>
            <div className="mt-2 text-xs">
              <span className="rounded bg-slate-100 px-2 py-0.5">{m.status}</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

interface ReqItem {
  id: string;
  numero_protocolo: string;
  status: string;
  created_at: string;
  tipo: { nome: string } | null;
}

function Requerimentos() {
  const { data, isLoading } = useQuery<{ data: ReqItem[] }>({
    queryKey: ['me', 'requerimentos'],
    queryFn: () => apiFetch('/api/me/requerimentos'),
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Meus requerimentos</h2>
      {isLoading && <Card>Carregando…</Card>}
      {!isLoading && (data?.data?.length ?? 0) === 0 && (
        <Card>Nenhum requerimento aberto.</Card>
      )}
      <div className="space-y-3">
        {data?.data.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">{r.numero_protocolo}</div>
                <div className="font-medium">{r.tipo?.nome ?? '—'}</div>
                <div className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <span className="rounded bg-slate-100 px-3 py-1 text-xs font-medium">
                {r.status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

interface DiplomaItem {
  id: string;
  numero_registro: string;
  data_colacao: string;
  status: string;
  url_publica_validador: string;
}

function Diploma() {
  const { data, isLoading } = useQuery<{ data: DiplomaItem[] }>({
    queryKey: ['me', 'diplomas'],
    queryFn: () => apiFetch('/api/me/diplomas'),
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Meu diploma</h2>
      {isLoading && <Card>Carregando…</Card>}
      {!isLoading && (data?.data?.length ?? 0) === 0 && (
        <Card>Nenhum diploma emitido ainda. Aguarde a colação.</Card>
      )}
      {data?.data.map((d) => (
        <Card key={d.id} className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Registro</div>
              <div className="font-bold">{d.numero_registro}</div>
              <div className="text-sm text-slate-600">Colação: {d.data_colacao}</div>
            </div>
            <a
              href={d.url_publica_validador}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Validar
            </a>
          </div>
        </Card>
      ))}
    </>
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
      </Routes>
    </Shell>
  );
}
