import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Each build gets its own id: the app knows its own (__BUILD__) and reads the one online
// (/version.json) to update itself when a new version is out (src/lib/update.ts).
const build = Date.now().toString(36);

const version = (): Plugin => ({
  name: 'marc-hq-version',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) });
  },
});

export default defineConfig({
  plugins: [react(), version()],
  define: { __BUILD__: JSON.stringify(build) },
});
