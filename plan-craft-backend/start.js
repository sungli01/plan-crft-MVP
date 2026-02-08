// Railway entry point — spawns tsx to run TypeScript
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsx = join(__dirname, 'node_modules', '.bin', 'tsx');

const child = spawn(tsx, ['src/index.ts'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env },
});

child.on('exit', (code) => process.exit(code || 0));
