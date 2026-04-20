import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';

const nav = [
  { to: '/secretaria', label: 'Início' },
  { to: '/secretaria/acervo', label: 'Acervo digital' },
  { to: '/secretaria/assinaturas', label: 'Assinaturas em lote' },
  { to: '/secretaria/diplomas', label: 'Diplomas' },
  { to: '/secretaria/requerimentos', label: 'Requerimentos' },
];

export default function PortalSecretaria() {
  return (
    <Shell title="Secretaria" nav={nav}>
      <h2 className="mb-4 text-xl font-semibold">Painel da Secretaria</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Documentos pendentes</div>
          <div className="text-3xl font-bold">—</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Requerimentos abertos</div>
          <div className="text-3xl font-bold">—</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Diplomas este mês</div>
          <div className="text-3xl font-bold">—</div>
        </Card>
      </div>
    </Shell>
  );
}
