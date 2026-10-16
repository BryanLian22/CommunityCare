import { spawn } from 'node:child_process';
const children = [spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' }), spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { stdio: 'inherit' })];
let ending = false;
function stop(code = 0) {
  if (ending) return;
  ending = true;
  for (const c of children) c.kill();
  setTimeout(() => process.exit(code), 300).unref()
}
children.forEach(c => {
  c.on('error', e => {
    console.error(e.message);
    stop(1)
  });
  c.on('exit', code => stop(code || 0))
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
