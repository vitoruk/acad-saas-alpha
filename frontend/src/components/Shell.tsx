import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/Button';
import { ThemeToggle } from './ui/ThemeToggle';
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="w-64 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Faculdade Alpha
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</div>
        </div>
        <nav className="space-y-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== '/' && loc.pathname.startsWith(n.to + '/'));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition',
                  active
                    ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {user?.email} · <span className="font-medium">{role ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={signOut}>
              Sair
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 text-slate-900 dark:text-slate-100">{children}</main>
      </div>
    </div>
  );
}
