import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      PFX_KEK_BASE64: 'kdDNqpHrbFaU3Ri1w4SP86C9hPJYuxriT0gwT6QgfDc=', // 32 bytes
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'test-anon-key-placeholder',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-placeholder',
      SUPABASE_JWT_SECRET: 'test-jwt-secret-placeholder',
    },
  },
});
