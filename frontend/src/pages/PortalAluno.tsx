import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';

const nav = [
  { to: '/aluno', label: 'Início' },
  { to: '/aluno/notas', label: 'Notas' },
  { to: '/aluno/frequencia', label: 'Frequência' },
  { to: '/aluno/requerimentos', label: 'Requerimentos' },
  { to: '/aluno/diploma', label: 'Diploma' },
];

export default function PortalAluno() {
  return (
    <Shell title="Portal do Aluno" nav={nav}>
      <h2 className="mb-4 text-xl font-semibold">Bem-vindo(a)</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm text-slate-500">CRA</div>
          <div className="text-3xl font-bold">—</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Status matrícula</div>
          <div className="text-xl font-medium">Ativa</div>
        </Card>
      </div>
    </Shell>
  );
}
