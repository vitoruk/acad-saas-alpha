import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Supabase injeta tokens no hash (#) ou query (?token_hash=)
    // O cliente JS processa automaticamente via getSession()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/', { replace: true });
      } else {
        // Tenta trocar o código PKCE se vier via query param
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash || window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type') as 'magiclink' | 'recovery' | null;

        if (tokenHash && type) {
          supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
            if (error) navigate('/login?error=link_invalido', { replace: true });
            else navigate('/', { replace: true });
          });
        } else {
          // Já tem sessão após processamento do hash
          setTimeout(() => navigate('/', { replace: true }), 500);
        }
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      <p className="text-sm text-slate-500 dark:text-slate-400">Autenticando…</p>
    </div>
  );
}
