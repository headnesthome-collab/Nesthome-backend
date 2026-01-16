// esbuild configuration for production builds
import { build } from 'esbuild';

const isProduction = process.env.NODE_ENV === 'production';

build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external', // Keep all npm packages external
  sourcemap: !isProduction,
  minify: isProduction,
  target: 'node20',
  logLevel: 'info',
}).catch(() => process.exit(1));
