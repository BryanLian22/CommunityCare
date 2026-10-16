import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
let muted = false;
const output = new Writable({  
write(chunk, encoding, done) {
    if (!muted) process.stdout.write(chunk, encoding);
    done()
  }
});
const rl = createInterface({ input: process.stdin, output, terminal: !!process.stdin.isTTY });
export async function ask(label, secret = false) {
  const pending = rl.question(label);
  if (secret && process.stdin.isTTY) muted = true;
  try {
    return await pending
  } finally {
    if (muted) {
      muted = false;
      process.stdout.write('\n')
    }
  }
}
export const closePrompt = () => rl.close();
