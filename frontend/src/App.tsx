import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Validador from './pages/Validador';
import PortalAluno from './pages/PortalAluno';
import PortalProfessor from './pages/PortalProfessor';
import PortalSecretaria from './pages/PortalSecretaria';
import PortalAdmin from './pages/PortalAdmin';

function Protected({ children, allow }: { children: ReactNode; allow?: string[] }) {
  const { session, role, loading } = useAuth();
  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (allow && role && !allow.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Home() {
  const { session, role } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  switch (role) {
    case 'admin':
    case 'super_admin':
      return <Navigate to="/admin" replace />;
    case 'secretaria':
      return <Navigate to="/secretaria" replace />;
    case 'professor':
      return <Navigate to="/professor" replace />;
    default:
      return <Navigate to="/aluno" replace />;
  }
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/validar" element={<Validador />} />
      <Route path="/validar/:numeroRegistro" element={<Validador />} />
      <Route
        path="/aluno/*"
        element={
          <Protected allow={['aluno', 'admin', 'super_admin']}>
            <PortalAluno />
          </Protected>
        }
      />
      <Route
        path="/professor/*"
        element={
          <Protected allow={['professor', 'admin', 'super_admin']}>
            <PortalProfessor />
          </Protected>
        }
      />
      <Route
        path="/secretaria/*"
        element={
          <Protected allow={['secretaria', 'admin', 'super_admin']}>
            <PortalSecretaria />
          </Protected>
        }
      />
      <Route
        path="/admin/*"
        element={
          <Protected allow={['admin', 'super_admin']}>
            <PortalAdmin />
          </Protected>
        }
      />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
