import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [params] = useSearchParams();
  const linkErr = params.get('error');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Painel esquerdo — branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl font-black">α</span>
            <span className="text-xl font-bold tracking-wide">ACAD-SaaS</span>
          </div>
          <p className="mt-1 text-sm text-brand-200">Faculdade Alpha — Recife, PE</p>
        </div>
        <div className="space-y-8">
          <blockquote className="text-2xl font-light leading-snug text-white/90">
            "Educação é o passaporte para o futuro, pois o amanhã pertence àqueles que se preparam hoje."
          </blockquote>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Cursos', v: '12+' },
              { label: 'Alunos', v: '800+' },
              { label: 'Diplomas', v: 'MEC 554' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 p-4">
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-xs text-brand-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-brand-300">
          Sistema ERP Acadêmico · Portaria MEC 554/2019 · LGPD
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-lg font-black text-white">α</span>
            <span className="text-lg font-bold text-slate-800 dark:text-white">Faculdade Alpha</span>
          </div>

          <h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-white">Acesse sua conta</h1>
          <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
            Enviamos um link mágico para o seu e-mail institucional.
          </p>

          {linkErr === 'link_invalido' && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              Link de acesso inválido ou expirado. Solicite um novo abaixo.
            </div>
          )}

          {sent ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/30">
              <div className="mb-3 text-4xl">📬</div>
              <p className="font-semibold text-green-800 dark:text-green-300">Link enviado!</p>
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                Verifique <strong>{email}</strong>.<br />
                Clique no link para entrar.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-4 text-xs text-slate-500 underline hover:text-slate-700"
              >
                Usar outro e-mail
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  E-mail institucional
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@alpha.edu.br"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-900"
                />
              </div>
              {err && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {err}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                {loading ? 'Enviando…' : 'Enviar link mágico'}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            Sem conta? Procure a Secretaria Acadêmica.
          </p>
        </div>
      </div>
    </div>
  );
}
