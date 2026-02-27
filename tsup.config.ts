import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/'],
  format: ['esm'],
  dts: false,
  minify: true,
  target: 'node20',
  bundle: true,
  // Only bundle the core element packages that define types and compatibility.
  // Bundle FontAwesome so the CLI works without requiring @fortawesome in the consumer's node_modules
  // (e.g. @process.co/ui uses FontAwesome for expression editor and inputs).
  noExternal: [
    '@process.co/element-types',
    '@process.co/elements',
    '@process.co/ui',
    '@process.co/compatibility',
    '@process.co/utilities',
    /^@fortawesome\//,
  ],

})