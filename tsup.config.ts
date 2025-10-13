import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/'],
  format: ['esm'],
  dts: false,
  minify: true,
  target: 'node20',
  bundle: true,
  // Only bundle the core element packages that define types and compatibility
  // Let the consuming project provide UI libraries and their dependencies
  noExternal: ['@process.co/element-types', '@process.co/elements', '@process.co/compatibility'],
  
})