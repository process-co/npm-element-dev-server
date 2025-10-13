# @process.co/element-dev-server

A development harness for previewing and testing Process.co element UI components without needing to set up a full development environment.

## ✨ Features

- **Zero Configuration**: Just install and run - no need to install UI dependencies separately
- **Auto-Discovery**: Automatically finds and serves all required UI library dependencies
- **FontAwesome Pro Included**: All FontAwesome Pro icon sets bundled (if you have access)
- **Hot Reload**: Instant updates as you modify your element UI components
- **Interactive Selection**: Visual interface to select elements, actions, and properties to test

## 📦 Installation

```bash
# In your element project
pnpm add -D @process.co/element-dev-server
```

That's it! No need to install:
- ❌ `@process.co/ui`
- ❌ `@radix-ui/*` components
- ❌ `@fortawesome/*` packages
- ❌ `zustand`, `@monaco-editor/react`, etc.

All dependencies are automatically provided by the dev server! 🎉

## 🚀 Usage

### Basic Usage

```bash
npx proc-dev
```

This will:
1. Scan your project for elements
2. Show an interactive menu to select an element
3. Let you choose an action/signal and property to preview
4. Launch a Vite dev server at `http://localhost:5173`

### What You'll See

```
╭─────────────────────────────────────────╮
│ Process.co Element Development Server  │
╰─────────────────────────────────────────╯

Select an element to develop:
> process_internal
  my-custom-element
  another-element

Select an action/signal:
> Action: Switch
  Action: Transform
  Signal: DataReceived

Select a property to preview:
> cases (ui.switch)
  defaultValue (text)
```

The dev server will then launch with your selected UI component loaded and ready to test!

## 🔍 How It Works

### Automatic Dependency Resolution

The dev server uses a smart resolution strategy to find UI dependencies:

1. **Searches multiple locations**:
   - In the element-dev-server package itself
   - One level up (for pnpm hoisting)
   - Two levels up (for npm/yarn nesting)

2. **Provides all dependencies** including:
   - ✅ `@process.co/ui` - Complete UI library
   - ✅ All `@radix-ui/*` components (18+ packages)
   - ✅ FontAwesome Pro icons (regular, solid, light, duotone)
   - ✅ `@monaco-editor/react` - Code editor
   - ✅ `zustand` - State management
   - ✅ Common utilities (bundled: `clsx`, `tailwind-merge`, `class-variance-authority`)

3. **Logs the resolution**:
   ```
   🔍 Resolving UI dependencies from: /path/to/node_modules
   ```

### Vite Configuration

The dev server automatically configures Vite to:
- Allow serving files from outside the project root
- Resolve modules from the discovered dependency location
- Pre-bundle and optimize all UI dependencies
- Watch your element files for changes and hot-reload

## 📁 Project Structure Expected

Your element project should have this structure:

```
your-element-project/
├── package.json
├── node_modules/
│   └── @process.co/element-dev-server/  # Installed here
└── elements/
    └── your-element/
        ├── index.ts (or .mts)
        ├── actions/
        │   └── someAction/
        │       ├── index.ts
        │       └── ui/
        │           └── someProperty.tsx  # Your UI component
        └── signals/
            └── someSignal/
                ├── index.ts
                └── ui/
                    └── someProperty.tsx
```

## 🎨 Developing UI Components

### Example UI Component

```typescript
// elements/your-element/actions/transform/ui/config.tsx
import { Button, Input } from '@process.co/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWand } from '@fortawesome/pro-solid-svg-icons';

export default function ConfigUI({ value, onChange, readonly }) {
  return (
    <div className="space-y-4">
      <Input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        disabled={readonly}
        placeholder="Enter name..."
      />
      <Button onClick={() => console.log('Transform!')}>
        <FontAwesomeIcon icon={faWand} className="mr-2" />
        Transform
      </Button>
    </div>
  );
}
```

All imports work automatically - no additional setup required!

## 🛠️ Troubleshooting

### Dependencies Not Found

If you see errors like:
```
ERROR: Could not resolve "@radix-ui/react-slot"
```

**Solution**: Check the console output for the dependency resolution path:
```
🔍 Resolving UI dependencies from: /path/to/node_modules
```

Verify that path contains the expected packages. If not, try:
```bash
rm -rf node_modules
pnpm install
```

### Vite Port Already in Use

The dev server uses port `5173` by default. If it's in use, you'll see an error.

**Solution**: Stop any other Vite servers or modify the port in `.process/vite.config.cjs`

### FontAwesome Icons Not Working

If you don't have FontAwesome Pro access, some icons won't be available.

**Solution**: The dev server gracefully handles missing FontAwesome packages. If you need specific icon sets, ensure you have access to FontAwesome Pro and they're installed in the monorepo.

## 📝 Package Manager Compatibility

### pnpm (Recommended) ✅
Works perfectly with pnpm's hoisting strategy.

### npm ✅
Works with npm's nested node_modules.

### yarn ✅
Works with yarn's hoisting.

## 🔐 FontAwesome Pro

If you have FontAwesome Pro access configured in your `.npmrc`:

```ini
@fortawesome:registry=https://npm.fontawesome.com/
//npm.fontawesome.com/:_authToken=YOUR-TOKEN
```

The dev server automatically includes these icon sets:
- `@fortawesome/pro-regular-svg-icons`
- `@fortawesome/pro-solid-svg-icons`
- `@fortawesome/pro-light-svg-icons`
- `@fortawesome/pro-duotone-svg-icons`

## 📚 Additional Documentation

- [Dependency Resolution](./DEPENDENCY-RESOLUTION.md) - Deep dive into how dependencies are discovered and served
- [UI Library Peer Dependencies](../ui/PEER_DEPENDENCIES.md) - Complete list of available UI components

## 🤝 Contributing

When publishing to npm, this package should include:
- All Radix UI components
- FontAwesome React wrapper
- Monaco Editor
- Zustand
- The `.process/` directory with Vite config

The `tsup` build only bundles the CLI code - dependencies are included via package.json.

## 📄 License

ISC
