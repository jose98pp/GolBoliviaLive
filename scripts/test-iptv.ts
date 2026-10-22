import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'node_modules/.cache/golbolivia-tests/iptv-suite.mjs');
await mkdir(path.dirname(output), { recursive: true });
try {
  const buildResult = await build({
    metafile: true,
    entryPoints: [path.join(root, 'scripts/fixtures/iptv-suite.ts')],
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    plugins: [{
      name: 'isolated-iptv-dependencies',
      setup(builder) {
        builder.onResolve({ filter: /(?:^|\/)firebase$/ }, () => ({ path: path.join(root, 'scripts/fixtures/iptv-persistence.ts') }));
        // Resolver DNS sintético público; mantiene activas las comprobaciones SSRF del proxy.
        builder.onResolve({ filter: /^node:dns\/promises$/ }, () => ({ path: 'test-dns', namespace: 'fixture' }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export async function lookup() { return [{ address: "93.184.216.34", family: 4 }]; }' }));
      },
    }],
  });
  if (Object.keys(buildResult.metafile.inputs).some((input) => path.resolve(input) === path.join(root, 'src/services/firebase.ts'))) {
    throw new Error('La suite IPTV no puede cargar la persistencia real de Firebase');
  }
  await import(pathToFileURL(output).href);
} finally {
  await rm(output, { force: true });
}
