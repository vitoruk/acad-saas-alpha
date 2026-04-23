import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useToast } from '@/lib/toast';
import { maskCPFPublic } from '@/lib/masks';

interface Resultado {
  diploma: {
    numero_registro: string;
    data_colacao: string;
    data_expedicao?: string;
    aluno_nome?: string;
    aluno_cpf?: string;
    curso_nome?: string;
    ies_nome?: string;
    status: string;
  };
  xml_hash?: string;
  assinaturas?: Array<{
    signatario: string;
    tipo: string;
    valido: boolean;
    timestamp?: string;
  }>;
  prova_existencia?: {
    provider: string;
    timestamp_utc: string;
    confirmado: boolean;
  } | null;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Validador() {
  const { numeroRegistro } = useParams();
  const [numero, setNumero] = useState(numeroRegistro ?? '');
  const [res, setRes] = useState<Resultado | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hashMatch, setHashMatch] = useState<boolean | null>(null);
  const toast = useToast();

  const consultar = async (n: string) => {
    if (!n.trim()) return;
    setLoading(true);
    setErr(null);
    setRes(null);
    setHashMatch(null);
    try {
      const r = await fetch(`${API_BASE}/public/validar/${encodeURIComponent(n.trim())}`);
      if (!r.ok) {
        throw new Error(r.status === 404 ? 'Diploma não encontrado no registro da IES' : `Erro ${r.status}`);
      }
      const data: Resultado = await r.json();
      setRes(data);
      if (fileHash && data.xml_hash) {
        setHashMatch(fileHash.toLowerCase() === data.xml_hash.toLowerCase());
      }
      toast.success('Diploma encontrado', `Status: ${data.diploma.status}`);
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg);
      toast.error('Não foi possível validar', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (numeroRegistro) consultar(numeroRegistro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroRegistro]);

  const onFile = async (f: File) => {
    setFileName(f.name);
    const buf = await f.arrayBuffer();
    const hex = await sha256Hex(buf);
    setFileHash(hex);
    if (res?.xml_hash) {
      setHashMatch(hex.toLowerCase() === res.xml_hash.toLowerCase());
    }
    toast.info('Hash calculado', `SHA-256: ${hex.slice(0, 16)}…`);
  };

  const share = async () => {
    if (!res) return;
    const url = `${window.location.origin}/validar/${res.diploma.numero_registro}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Diploma verificado', text: res.diploma.aluno_nome, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado', url);
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Faculdade Alpha · MEC 554/2019
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Validador de Diploma Digital
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Card className="mb-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Input
              label="Número do registro"
              placeholder="Ex.: REG-2025-0001"
              value={numero}
              onChange={setNumero}
              onKeyDown={(e) => e.key === 'Enter' && consultar(numero)}
              hint="Encontra-se no PDF do diploma ou no QR Code"
            />
            <div className="flex items-end">
              <Button onClick={() => consultar(numero)} disabled={!numero || loading}>
                {loading ? 'Consultando…' : 'Validar'}
              </Button>
            </div>
          </div>

          <div className="mt-6 border-t border-dashed border-slate-200 pt-4 dark:border-slate-800">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Verificar integridade do arquivo XML (opcional)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Envie o XML ou PDF/A-3 recebido para conferir o hash SHA-256.
            </p>
            <input
              type="file"
              accept=".xml,.pdf,application/xml,application/pdf,text/xml"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-brand-700"
            />
            {fileHash && (
              <div className="mt-3 rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-800">
                <div className="font-medium text-slate-700 dark:text-slate-200">{fileName}</div>
                <div className="mt-1 break-all font-mono text-slate-600 dark:text-slate-400">{fileHash}</div>
                {hashMatch !== null && (
                  <div className="mt-2">
                    {hashMatch ? (
                      <Badge variant="success">✓ Hash confere com o registro oficial</Badge>
                    ) : (
                      <Badge variant="danger">✗ Hash NÃO confere — arquivo pode ter sido alterado</Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {loading && (
          <Card>
            <Skeleton className="mb-3 h-6 w-40" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        )}

        {err && !loading && (
          <EmptyState
            title="Diploma não localizado"
            description={err}
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            }
          />
        )}

        {res && !loading && (
          <div className="space-y-4">
            <Card>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <Badge variant={res.diploma.status === 'registrado' ? 'success' : 'warning'}>
                    {res.diploma.status}
                  </Badge>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Diploma verificado
                  </h2>
                </div>
                <Button variant="secondary" onClick={share}>
                  Compartilhar
                </Button>
              </div>

              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-slate-500">Registro</dt>
                  <dd className="font-mono text-slate-900 dark:text-slate-100">
                    {res.diploma.numero_registro}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Data de colação</dt>
                  <dd>{res.diploma.data_colacao}</dd>
                </div>
                {res.diploma.aluno_nome && (
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Diplomado</dt>
                    <dd className="font-medium">{res.diploma.aluno_nome}</dd>
                    {res.diploma.aluno_cpf && (
                      <dd className="text-xs text-slate-500">
                        CPF: {maskCPFPublic(res.diploma.aluno_cpf)}
                      </dd>
                    )}
                  </div>
                )}
                {res.diploma.curso_nome && (
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Curso</dt>
                    <dd>{res.diploma.curso_nome}</dd>
                  </div>
                )}
                {res.diploma.ies_nome && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase text-slate-500">Instituição</dt>
                    <dd>{res.diploma.ies_nome}</dd>
                  </div>
                )}
              </dl>
            </Card>

            {res.assinaturas && res.assinaturas.length > 0 && (
              <Card>
                <h3 className="mb-3 text-base font-semibold">Assinaturas digitais</h3>
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {res.assinaturas.map((s, i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <div className="font-medium">{s.signatario}</div>
                        <div className="text-xs text-slate-500">
                          {s.tipo} {s.timestamp && `· ${s.timestamp}`}
                        </div>
                      </div>
                      <Badge variant={s.valido ? 'success' : 'danger'}>
                        {s.valido ? 'válida' : 'inválida'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {res.prova_existencia && (
              <Card>
                <h3 className="mb-2 text-base font-semibold">Prova de existência (OpenTimestamps)</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Provedor</dt>
                    <dd>{res.prova_existencia.provider}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Carimbo</dt>
                    <dd className="text-xs">{res.prova_existencia.timestamp_utc}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Status</dt>
                    <dd>
                      <Badge variant={res.prova_existencia.confirmado ? 'success' : 'warning'}>
                        {res.prova_existencia.confirmado ? 'confirmado' : 'pendente'}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </Card>
            )}

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Este validador atende à Portaria MEC 554/2019 e utiliza assinatura digital ICP-Brasil
              (MP 2.200-2/2001).
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
