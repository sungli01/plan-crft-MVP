// Bridge: Railway runs "node src/index.js" — this spawns tsx to load TypeScript
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tsx = join(root, 'node_modules', '.bin', 'tsx');

const child = spawn(tsx, [join(__dirname, 'index.ts')], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env },
});

child.on('exit', (code) => process.exit(code || 0));
child.on('error', (err) => {
  console.error('Failed to start tsx:', err.message);
  process.exit(1);
});
