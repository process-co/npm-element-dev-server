// process-co/element-dev-server/.process/vite.config.js

const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');
const fs = require('fs');

// Find where element-dev-server is installed
// This could be in the user's node_modules or in a monorepo
const elementDevServerRoot = path.resolve(__dirname, '..');

// Function to find node_modules that contains our dependencies
function findNodeModulesWithDeps() {
  const possiblePaths = [
    // In the element-dev-server package itself
    path.join(elementDevServerRoot, 'node_modules'),
    // One level up (for pnpm hoisting in user's project)
    path.join(elementDevServerRoot, '..', '..'),
    // Two levels up (for npm/yarn in user's project)
    path.join(elementDevServerRoot, '..', '..', '..'),
  ];
  
  for (const basePath of possiblePaths) {
    const testPath = path.join(basePath, '@radix-ui', 'react-slot');
    if (fs.existsSync(testPath)) {
      return basePath;
    }
  }
  
  // Default to element-dev-server's node_modules
  return path.join(elementDevServerRoot, 'node_modules');
}

const depsNodeModules = findNodeModulesWithDeps();
console.log('🔍 Resolving UI dependencies from:', depsNodeModules);
 
// Access environment variables passed from CLI
const elementPath = process.env.VITE_ELEMENT_PATH;
const elementType = process.env.VITE_ELEMENT_TYPE;
const elementName = process.env.VITE_ELEMENT_NAME;
const actionSignalKey = process.env.VITE_ACTION_SIGNAL_KEY;
const propertyKey = process.env.VITE_PROPERTY_KEY;
const propertyType = process.env.VITE_PROPERTY_TYPE;
const propertyUIPath = process.env.VITE_PROPERTY_UI_PATH;

// console.log('Vite config received:', {
//   elementPath,
//   elementType,
//   elementName,
//   actionSignalKey,
//   propertyKey,
//   propertyType,
//   propertyUIPath
// });

// console.log('Vite config root directory:', __dirname);
// console.log('Vite config index.html path:', path.resolve(__dirname, 'index.html'));
// console.log('Vite config index.tsx path:', path.resolve(__dirname, 'index.tsx'));

module.exports = defineConfig({
  plugins: [
    react(),
    {
      name: 'element-virtual-modules',
      resolveId(source) {
        // Main element module
        if (source === '/element-main') {
          // Try to find the main app file
          const candidates = [
            path.join(elementPath, `${elementName}.app.mts`),
            path.join(elementPath, `${elementName}.app.mjs`),
            path.join(elementPath, 'process_internal.app.mts'),
            path.join(elementPath, 'process_internal.app.mjs')
          ];
          for (const file of candidates) {
            if (fs.existsSync(file)) return file;
          }
        }
        // Action modules
        if (source.startsWith('/element-action/')) {
          const actionKey = source.replace('/element-action/', '');
          // Look for the action file in the actions directory
          const actionsDir = path.join(elementPath, 'actions');
          if (fs.existsSync(actionsDir)) {
            const subdirs = fs.readdirSync(actionsDir).filter(f => fs.statSync(path.join(actionsDir, f)).isDirectory());
            for (const subdir of subdirs) {
              // Try to match the action key
              if (subdir === actionKey) {
                // Look for index.ts, index.mts, index.js, index.mjs, or {actionKey}.ts, etc.
                const candidates = [
                  path.join(actionsDir, subdir, 'index.ts'),
                  path.join(actionsDir, subdir, 'index.mts'),
                  path.join(actionsDir, subdir, 'index.js'),
                  path.join(actionsDir, subdir, 'index.mjs'),
                  path.join(actionsDir, subdir, `${subdir}.ts`),
                  path.join(actionsDir, subdir, `${subdir}.mts`),
                  path.join(actionsDir, subdir, `${subdir}.js`),
                  path.join(actionsDir, subdir, `${subdir}.mjs`)
                ];
                for (const file of candidates) {
                  if (fs.existsSync(file)) return file;
                }
              }
            }
          }
        }
        return null;
      }
    },
    {
      name: 'external-element-loader',

      configureServer(server) {
        // Set up file watching for the element directory
        if (elementPath) {
          const elementDir = fs.statSync(elementPath).isDirectory() 
            ? elementPath 
            : path.dirname(elementPath);
          
          // console.log(`🔍 Setting up file watching for element directory: ${elementDir}`);
          
          // Watch the entire element directory for changes
          server.watcher.add(elementDir);
          
          // Set up HMR for external files
          server.watcher.on('change', (file) => {
            // console.log(`📝 File changed: ${file}`);
            
            // Check if the changed file is in the element directory
            if (file.startsWith(elementDir)) {
              // console.log(`🔄 Element file changed: ${file}`);
              
              // Trigger HMR for any modules that depend on this file
              server.moduleGraph.invalidateModule(file);
              
              // Notify clients about the change
              server.ws.send({
                type: 'update',
                path: file,
                timestamp: Date.now()
              });
            }
          });
        }
      },

      resolveId(source, importer) {
        // console.log(`resolveId called with source: ${source}, importer: ${importer}`);

        // Handle virtual element paths
        if (source.startsWith('/')) {
          const relativePath = source.replace('/element/', '');
          const fullPath = path.join(elementPath ??'', relativePath);
          if (fs.existsSync(fullPath)) {
            // console.log(`Resolving element path: ${source} -> ${fullPath}`);
            return fullPath;
          }
        }

        // Handle virtual element-ui paths
        if (source.startsWith('/element-ui/')) {
          const relativePath = source.replace('/element-ui/', '');
          const elementDir = fs.statSync(elementPath).isDirectory() 
            ? elementPath 
            : path.dirname(elementPath);
          const uiDir = path.join(elementDir, 'ui');
          const fullPath = path.join(uiDir, relativePath);
          // console.log(`🎨 Trying to resolve element-ui path: ${source} -> ${fullPath}`);
          // console.log(`🎨 Element path: ${elementPath}, Element dir: ${elementDir}, UI dir: ${uiDir}`);
          // console.log(`🎨 Relative path: ${relativePath}`);
          if (fs.existsSync(fullPath)) {
            // console.log(`✅ Resolving element-ui path: ${source} -> ${fullPath}`);
            return fullPath;
          } else {
            // console.log(`❌ Element-ui path not found: ${fullPath}`);
            // console.log(`❌ Checking if UI dir exists: ${fs.existsSync(uiDir)}`);
            // if (fs.existsSync(uiDir)) {
            //   console.log(`❌ UI dir contents:`, fs.readdirSync(uiDir));
            // }
          }
        }

        // Handle external element file imports (absolute paths)
        if (source.startsWith('/') && fs.existsSync(source)) {
          const stats = fs.statSync(source);
          if (stats.isFile()) {
            // console.log(`Resolving external file: ${source}`);
            return source;
          } else if (stats.isDirectory()) {
            // console.log(`Skipping directory in resolveId: ${source}`);
            return null;
          }
        }

        // Handle relative imports from the element directory
        if (elementPath && !source.startsWith('/') && !source.startsWith('.')) {
          const elementDir = fs.statSync(elementPath).isDirectory() 
            ? elementPath 
            : path.dirname(elementPath);
          const possiblePath = path.join(elementDir, source);
          if (fs.existsSync(possiblePath)) {
            // console.log(`Resolving relative import: ${source} -> ${possiblePath}`);
            return possiblePath;
          }
        }

        return null;
      },
      
      load(id) {
        // console.log(`load called with id: ${id}`);

        // Load external files when they're requested
        if (id.startsWith('/') && fs.existsSync(id)) {
          const stats = fs.statSync(id);
          if (stats.isFile()) {
            const content = fs.readFileSync(id, 'utf-8');
            // console.log(`Loading external file: ${id}`);
            return content;
          } else if (stats.isDirectory()) {
            // console.log(`Skipping directory: ${id}`);
            return null;
          }
        }

        // Load files from element directory
        if (fs.existsSync(id)) {
          const stats = fs.statSync(id);
          if (stats.isFile()) {
            const content = fs.readFileSync(id, 'utf-8');
            // console.log(`✅ Loading element file: ${id}`);
            return content;
          } else {
            // console.log(`❌ Path exists but is not a file: ${id}`);
          }
        } else {
          // console.log(`❌ Path does not exist: ${id}`);
        }

        return null;
      },

      handleHotUpdate(ctx) {
        // Handle HMR for external files
        const { file, server } = ctx;
        
        if (elementPath && file.startsWith(elementPath)) {
          // console.log(`🔥 HMR triggered for element file: ${file}`);
          
          // Invalidate the module in the module graph
          const module = server.moduleGraph.getModuleById(file);
          if (module) {
            server.moduleGraph.invalidateModule(module);
          }
          
          // Return the modules that need to be updated
          return ctx.modules;
        }
        
        return ctx.modules;
      }
    }
  ],
  // root is set programmatically in the CLI
  server: {
    port: 5173,
    open: true,
    host: true,
    fs: {
      // Allow serving files from outside the root, including our deps node_modules
      allow: [
        '..',
        elementDevServerRoot,
        depsNodeModules,
        // Allow the user's element directory
        ...(elementPath ? [elementPath, path.dirname(elementPath)] : [])
      ]
    },
    watch: {
      // Watch external directories for changes
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      usePolling: false
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      // Dynamically map element paths based on the elementPath from CLI
      ...(elementPath && {
        // Map the element directory to a virtual path that Vite can resolve
        '/element': elementPath,
        // Also map the element's UI directory if it exists
        '/element-ui': path.join(
          fs.statSync(elementPath).isDirectory() ? elementPath : path.dirname(elementPath),
          'ui'
        )
      })
    },
    // Resolve modules from the element-dev-server's node_modules
    // This allows the dev server to provide all dependencies
    preserveSymlinks: false,
  },
  // Tell Vite where to find dependencies - use the discovered node_modules
  cacheDir: path.join(depsNodeModules, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom', 'clsx', 'tailwind-merge', 'zustand', '@monaco-editor/react', '@fortawesome/react-fontawesome', '@fortawesome/pro-regular-svg-icons', '@fortawesome/pro-solid-svg-icons', '@fortawesome/pro-duotone-svg-icons', '@fortawesome/pro-light-svg-icons', '@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-separator', '@radix-ui/react-tooltip', '@radix-ui/react-popover', '@radix-ui/react-accordion', '@radix-ui/react-tabs', '@radix-ui/react-toggle', '@radix-ui/react-toggle-group', '@radix-ui/react-progress', '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area', '@radix-ui/react-select', '@radix-ui/react-slider', '@radix-ui/react-switch'],
    // Force Vite to look in element-dev-server's node_modules for these deps
    esbuildOptions: {
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
      // Use the discovered node_modules path
      nodePaths: [depsNodeModules]
    }
  },
  // Environment variables will be passed programmatically
});
