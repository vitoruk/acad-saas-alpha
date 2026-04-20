import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Login() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <Card className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold">Faculdade Alpha</h1>
        <p className="mb-6 text-sm text-slate-600">
          Entre com seu e-mail institucional. Enviaremos um link mágico.
        </p>
        {sent ? (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
            Link enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@alpha.edu.br"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            {err && <div className="text-sm text-red-600">{err}</div>}
            <Button type="submit" className="w-full">
              Enviar link mágico
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
