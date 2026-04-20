import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/Button';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
}

export function Shell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const { user, role, signOut } = useAuth();
  const loc = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <div className="text-sm uppercase tracking-wider text-slate-500">
            Faculdade Alpha
          </div>
          <div className="text-lg font-bold">{title}</div>
        </div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                'block rounded-md px-3 py-2 text-sm',
                loc.pathname === n.to
                  ? 'bg-brand-50 font-medium text-brand-700'
                  : 'text-slate-700 hover:bg-slate-100',
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-600">
            {user?.email} · <span className="font-medium">{role ?? '—'}</span>
          </div>
          <Button variant="ghost" onClick={signOut}>
            Sair
          </Button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
