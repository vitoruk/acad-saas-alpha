import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';

const nav = [
  { to: '/professor', label: 'Turmas' },
  { to: '/professor/frequencia', label: 'Frequência' },
  { to: '/professor/notas', label: 'Notas' },
  { to: '/professor/pauta', label: 'Fechar pauta' },
];

export default function PortalProfessor() {
  return (
    <Shell title="Portal do Professor" nav={nav}>
      <h2 className="mb-4 text-xl font-semibold">Minhas turmas</h2>
      <Card>
        <p className="text-sm text-slate-600">Carregando turmas…</p>
      </Card>
    </Shell>
  );
}
