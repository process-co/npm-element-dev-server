# Monorepo Development Mode

## Overview

The element-dev-server automatically detects when running in the monorepo and overrides the published `@process.co/ui` npm package with the local source code for hot reloading during development.

## How It Works

### Automatic Detection

When you launch the dev server from within the monorepo, it will:

1. **Detect** the local `@process.co/ui` source at `process-co/ui/src`
2. **Override** any `@process.co/ui` imports to use the local source instead of npm
3. **Watch** the local source for changes
4. **Hot reload** when you make changes to UI components

### What Gets Overridden

All imports of `@process.co/ui` in your external element projects (like `process-partners/process-internal`) will be redirected to:

```
/Users/.../proc-app/process-co/ui/src
```

Instead of:
```
node_modules/@process.co/ui
```

### Console Output

When you start the dev server, you'll see:

```bash
🎨 Using local @process.co/ui source from monorepo: /path/to/proc-app/process-co/ui/src
🔍 Setting up file watching for @process.co/ui source: /path/to/proc-app/process-co/ui/src
```

If the local source isn't found:
```bash
📦 Using published @process.co/ui from npm
```

## Benefits

1. **No Build Step**: Changes to UI components are instantly reflected
2. **Hot Module Replacement**: Browser updates automatically without full reload (when possible)
3. **Seamless Workflow**: Works transparently with your existing element development
4. **No Configuration**: Automatically enables when in monorepo, disabled when published

## Debug Mode

To see detailed logging about module resolution and hot reloading:

```bash
PROC_DEV_DEBUG=true proc-dev /path/to/your/element
```

Debug logs include:
- Path resolution details
- File watching setup
- CSS rebuild triggers
- Module invalidation

Normal mode (without the flag) shows only essential messages:
- ✅ Using local @process.co/ui source confirmation
- 🎨 CSS rebuild notifications
- ❌ Errors

## Development Workflow

### Example Scenario

You're developing `process-internal` element which uses `@process.co/ui`:

```tsx
// In process-partners/process-internal/actions/something/index.tsx
import { Button } from '@process.co/ui';
import '@process.co/ui/styles';

export default function MyAction() {
  return <Button>Click me</Button>;
}
```

### What Happens

1. Start the dev server: `proc-dev /path/to/process-partners/process-internal`
2. The server detects it's in the monorepo
3. All `@process.co/ui` imports use the local source
4. Edit `/proc-app/process-co/ui/src/components/ui/button.tsx`
5. Browser automatically updates with your changes! 🎉

## CSS Handling

CSS from `@process.co/ui/styles` is handled with automatic rebuilding:

```tsx
import '@process.co/ui/styles';  // ← Loads pre-built CSS from dist/ui.css
```

**How CSS Updates Work:**
1. Edit CSS source files in `process-co/ui/src/styles/` or `process-co/ui/src/themes/`
2. Dev server detects the change and automatically runs `pnpm run generate:css`
3. Browser reloads with the updated styles

The CSS is imported globally and styles all components on the page, including remote components.

**Note:** CSS changes require a rebuild (happens automatically), while component changes use hot module replacement.

## Technical Details

### Vite Alias Configuration

```javascript
alias: {
  '@process.co/ui': '/path/to/monorepo/process-co/ui/src',
  '@process.co/ui/styles': '/path/to/monorepo/process-co/ui/dist/ui.css'
}
```

### Context-Aware Path Resolution

The plugin intelligently resolves the `@` alias based on context:
- Files in the UI package source use `@` → UI source (`@/lib/utils` → `process-co/ui/src/lib/utils.ts`)
- Files in your element use `@` → Element source (`@/components/X` → `element/src/components/X`)

### File Watching

The dev server watches the entire `process-co/ui/src` directory for changes and triggers HMR when files are modified.

### Optimization

The local UI source is excluded from Vite's dependency optimization to ensure:
- Changes are picked up immediately
- TypeScript files are processed correctly
- Hot reloading works properly

## Troubleshooting

### Changes Not Reflecting

1. Check console for "Using local @process.co/ui source" message
2. Make sure you're running from the monorepo directory
3. Try a full browser refresh (Cmd/Ctrl + Shift + R)

### Module Not Found Errors

The local source must be at `process-co/ui/src` relative to element-dev-server. If you've reorganized the monorepo, update the path in `vite.config.cjs`:

```javascript
const localUISource = path.resolve(elementDevServerRoot, '..', 'ui', 'src');
```

### Type Errors

Make sure your IDE is using the workspace TypeScript version and has indexed the monorepo properly.

## Publishing

When you publish `element-dev-server` to npm, users outside the monorepo will automatically use the published `@process.co/ui` package from npm - no configuration changes needed!

