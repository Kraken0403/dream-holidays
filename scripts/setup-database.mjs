import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const apiDir = join(rootDir, 'apps', 'api');
const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  console.log(`Dream Holidays database setup

Usage:
  npm run db:setup
  npm run db:setup -- --seed
  npm run db:setup -- --create-database --seed

Options:
  --create-database  Create the database named in DATABASE_URL when the MySQL
                     account has server-level CREATE DATABASE permission.
  --seed             Load the initial company, settings, categories and vendors.
                     Admin credentials come only from INITIAL_ADMIN_* variables.

DATABASE_URL is read from the current environment first, then apps/api/.env.`);
  process.exit(0);
}

const envPath = join(apiDir, '.env');
if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('DATABASE_URL is missing. Set it in the environment or apps/api/.env.');
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL is not a valid URL.');
  process.exit(1);
}

if (parsedUrl.protocol !== 'mysql:') {
  console.error(`Unsupported database protocol "${parsedUrl.protocol}". This project currently uses MySQL.`);
  process.exit(1);
}

const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
if (!databaseName) {
  console.error('DATABASE_URL must include a database name.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');

function runPrisma(commandArgs, input) {
  const result = spawnSync(process.execPath, [prismaCli, ...commandArgs], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    input,
    encoding: input ? 'utf8' : undefined,
    stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

if (args.has('--create-database')) {
  const serverUrl = new URL(parsedUrl);
  serverUrl.pathname = '/mysql';
  const escapedName = databaseName.replace(/`/g, '``');
  console.log(`Creating MySQL database "${databaseName}" if it does not exist...`);
  runPrisma(
    ['db', 'execute', '--url', serverUrl.toString(), '--stdin'],
    `CREATE DATABASE IF NOT EXISTS \`${escapedName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`,
  );
}

console.log(`Preparing database "${databaseName}"...`);
runPrisma(['generate']);
runPrisma(['migrate', 'deploy']);

if (args.has('--seed')) {
  runPrisma(['db', 'seed']);
}

console.log(`Database "${databaseName}" is ready.`);
