import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const nav = [
  { to: '/professor', label: 'Turmas' },
  { to: '/professor/notas', label: 'Notas' },
];

interface Turma {
  id: string;
  codigo: string;
  ano: number;
  semestre: number;
}

function Turmas() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<Turma[]>({
    queryKey: ['professor', 'turmas', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: prof } = await supabase
        .from('professores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!prof) return [];
      const { data } = await supabase
        .from('turmas')
        .select('id, codigo, ano, semestre')
        .eq('professor_id', prof.id)
        .order('ano', { ascending: false });
      return data ?? [];
    },
  });
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Minhas turmas</h2>
      {isLoading && <Card>Carregando…</Card>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card>Nenhuma turma associada à sua conta.</Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((t) => (
          <Card key={t.id}>
            <div className="text-xs uppercase text-slate-500">
              {t.ano}.{t.semestre}
            </div>
            <div className="font-medium">{t.codigo}</div>
          </Card>
        ))}
      </div>
    </>
  );
}

function Notas() {
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Lançamento de notas</h2>
      <Card>
        <div className="text-sm text-slate-600">
          Em breve: lançamento em lote via planilha. Por ora use os endpoints{' '}
          <code className="rounded bg-slate-100 px-1">POST /api/diario/notas</code>.
        </div>
      </Card>
    </>
  );
}

export default function PortalProfessor() {
  return (
    <Shell title="Portal do Professor" nav={nav}>
      <Routes>
        <Route index element={<Turmas />} />
        <Route path="notas" element={<Notas />} />
      </Routes>
    </Shell>
  );
}
