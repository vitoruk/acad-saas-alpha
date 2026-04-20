import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SUPABASE_JWT_SECRET: z.string().min(10),

  PFX_KEK_BASE64: z.string().min(43), // 32 bytes base64 = 44 chars
  PFX_KEK_VERSION: z.coerce.number().int().positive().default(1),
  SIGN_TOKEN_SECRET: z.string().min(16).default('dev-sign-token-secret-change-me-123'),
  SIGN_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(72),

  IES_CODIGO_EMEC: z.string().default('9999'),
  IES_CNPJ: z.string().default('00.000.000/0001-00'),
  IES_NOME: z.string().default('Faculdade Alpha'),
  IES_UF: z.string().length(2).default('PE'),
  IES_MUNICIPIO: z.string().default('Recife'),

  VALIDADOR_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  VALIDADOR_MODE: z.coerce.boolean().default(false),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('ACAD-SaaS <noreply@example.com>'),

  OTS_CALENDARS: z.string().default('https://alice.btc.calendar.opentimestamps.org'),

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Variáveis de ambiente inválidas:');
    console.error(parsed.error.flatten().fieldErrors);
    // Em dev, permitimos defaults parciais para dev local sem Supabase real
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Continuando em modo dev com defaults — alguns recursos não funcionarão.');
      return EnvSchema.parse({
        ...process.env,
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_ANON_KEY: 'dev-anon-key-placeholder',
        SUPABASE_SERVICE_ROLE_KEY: 'dev-service-role-placeholder',
        SUPABASE_JWT_SECRET: 'dev-jwt-secret-placeholder',
        PFX_KEK_BASE64: 'devdevdevdevdevdevdevdevdevdevdevdevdevdev==',
      });
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
