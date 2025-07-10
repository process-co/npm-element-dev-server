import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/'],
  format: ['esm'],
  dts: false,
  minify: true,
  target: 'node20',
  bundle: true,
  // external: [], // ← disables all externals (bundles everything)
  //  // Optional but recommended in monorepos:
  noExternal: ['@process.co/element-types', '@process.co/elements', '@process.co/compatibility'],

})