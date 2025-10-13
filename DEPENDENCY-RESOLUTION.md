# Dependency Resolution Strategy

## Overview

The `element-dev-server` provides all UI library dependencies so developers don't need to install them in their own projects. This is achieved through automatic dependency resolution in the Vite dev server.

## How It Works

### 1. Dependencies Are Bundled with element-dev-server

When developers install `@process.co/element-dev-server`, all the UI library dependencies come with it:

```bash
pnpm add @process.co/element-dev-server
# This automatically includes:
# - @process.co/ui
# - All @radix-ui/* components
# - @fortawesome/react-fontawesome
# - @monaco-editor/react
# - zustand
# - etc.
```

### 2. Vite Auto-Discovers Dependencies

The `.process/vite.config.cjs` includes a `findNodeModulesWithDeps()` function that automatically discovers where the UI dependencies are installed:

```javascript
function findNodeModulesWithDeps() {
  const possiblePaths = [
    // In the element-dev-server package itself
    path.join(elementDevServerRoot, 'node_modules'),
    // One level up (for pnpm hoisting in user's project)
    path.join(elementDevServerRoot, '..', '..'),
    // Two levels up (for npm/yarn in user's project)
    path.join(elementDevServerRoot, '..', '..', '..'),
  ];
  
  // Test each path to find where @radix-ui/react-slot exists
  for (const basePath of possiblePaths) {
    const testPath = path.join(basePath, '@radix-ui', 'react-slot');
    if (fs.existsSync(testPath)) {
      return basePath;
    }
  }
  
  return path.join(elementDevServerRoot, 'node_modules');
}
```

### 3. Vite Uses the Discovered Path

Once the dependency location is found, Vite is configured to resolve modules from that location:

- **File System Access**: Allows serving files from the discovered `node_modules`
- **Cache Directory**: Uses `.vite` cache in the discovered `node_modules`
- **Esbuild Resolution**: Configures esbuild's `nodePaths` to use the discovered location

## Developer Experience

### What Developers Need to Install

**Minimum setup:**
```json
{
  "dependencies": {
    "@process.co/element-dev-server": "latest"
  }
}
```

That's it! No need to install:
- ❌ `@radix-ui/*` components
- ❌ `@fortawesome/*` packages
- ❌ `zustand`, `@monaco-editor/react`, etc.

### What Gets Logged

When the dev server starts, you'll see:
```
🔍 Resolving UI dependencies from: /path/to/node_modules
```

This confirms where Vite found the dependencies.

## Package Manager Compatibility

### pnpm (Recommended)
With pnpm's hoisting, dependencies are typically at:
```
user-project/
  node_modules/
    @process.co/element-dev-server/  (symlink)
    @radix-ui/                       (hoisted here)
    @fortawesome/                    (hoisted here)
    etc.
```

### npm/yarn
Dependencies may be nested:
```
user-project/
  node_modules/
    @process.co/
      element-dev-server/
        node_modules/
          @radix-ui/
          @fortawesome/
          etc.
```

The auto-discovery handles both scenarios!

## Troubleshooting

### If dependencies aren't found

1. Check the console output for: `🔍 Resolving UI dependencies from: ...`
2. Verify that path contains the expected packages
3. Try reinstalling element-dev-server:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

### If Vite fails to resolve a module

The error will look like:
```
ERROR: Could not resolve "@radix-ui/react-slot"
```

This means the auto-discovery failed. File an issue with:
- Package manager (pnpm/npm/yarn) and version
- The logged dependency path from console
- Your project structure

## Benefits

✅ **Simple Developer Setup**: Just install one package  
✅ **Consistent Versions**: UI dependencies are locked to tested versions  
✅ **No Peer Dependency Warnings**: Everything is self-contained  
✅ **Works Everywhere**: Compatible with pnpm, npm, and yarn  
✅ **Monorepo Friendly**: Handles workspace scenarios  

## Technical Details

### Why Not Just Use peerDependencies?

Traditional peer dependencies would require:
1. Developers install element-dev-server
2. See peer dependency warnings
3. Manually install 20+ packages
4. Keep versions in sync

This approach eliminates steps 2-4!

### Why Not Bundle Everything?

We could bundle all dependencies into element-dev-server's dist, but:
- ❌ Huge bundle size (50+ MB)
- ❌ Slower builds
- ❌ Can't leverage Vite's hot module replacement
- ❌ Duplicate React instances cause problems

Instead, we provide the dependencies separately but resolve them automatically.

### How This Differs from Regular Vite Projects

Normal Vite projects resolve from `process.cwd()` node_modules. We extend this to also check where element-dev-server is installed, giving priority to element-dev-server's dependencies while still allowing user overrides if needed.

