import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';

const nav = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/ies', label: 'IES & Cursos' },
  { to: '/admin/cofre', label: 'Cofre de certificados' },
  { to: '/admin/usuarios', label: 'Usuários' },
  { to: '/admin/auditoria', label: 'Auditoria' },
];

export default function PortalAdmin() {
  return (
    <Shell title="Admin" nav={nav}>
      <h2 className="mb-4 text-xl font-semibold">Dashboard</h2>
      <Card>
        <p className="text-sm text-slate-600">
          Painel administrativo — configuração da IES, cofre de certificados, auditoria.
        </p>
      </Card>
    </Shell>
  );
}
