#!/usr/bin/env node
/**
 * scripts/validate-sql.mjs
 * Valida sintaxe SQL das migrations concatenando todos os arquivos
 * e passando por um parser básico. NÃO executa no banco — somente parseia.
 *
 * Uso: node scripts/validate-sql.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'database/migrations';
const SEEDS_DIR = 'database/seeds';

function listSqlFiles(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    return [];
  }
}

function basicSqlSanityCheck(content, file) {
  const errors = [];
  // Remove blocos $$...$$, strings 'literal' (tratando '' como escape) e comentários --
  let stripped = content
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/--[^\n]*/g, '')
    .replace(/'(?:''|[^'])*'/g, "''");
  const opens = (stripped.match(/\(/g) || []).length;
  const closes = (stripped.match(/\)/g) || []).length;
  if (opens !== closes) {
    errors.push(`${file}: parênteses desbalanceados (${opens} abrem, ${closes} fecham)`);
  }
  // Checa CREATE TRIGGER com FOR EACH ROW
  const triggers = content.match(/CREATE TRIGGER [\s\S]*?;/gi) || [];
  for (const t of triggers) {
    if (!/FOR EACH (ROW|STATEMENT)/i.test(t)) {
      errors.push(`${file}: CREATE TRIGGER sem FOR EACH ROW/STATEMENT`);
    }
  }
  return errors;
}

function main() {
  const all = [
    ...listSqlFiles(MIGRATIONS_DIR).map((f) => join(MIGRATIONS_DIR, f)),
    ...listSqlFiles(SEEDS_DIR).map((f) => join(SEEDS_DIR, f)),
  ];
  let totalErrors = 0;
  console.log(`🔎 Validando ${all.length} arquivos SQL...\n`);
  for (const f of all) {
    const content = readFileSync(f, 'utf8');
    const errs = basicSqlSanityCheck(content, f);
    if (errs.length === 0) {
      console.log(`  ✅ ${f}`);
    } else {
      totalErrors += errs.length;
      errs.forEach((e) => console.log(`  ❌ ${e}`));
    }
  }
  console.log(`\n${totalErrors === 0 ? '✅' : '❌'} ${totalErrors} problema(s) encontrado(s).`);
  process.exit(totalErrors === 0 ? 0 : 1);
}

main();
