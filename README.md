# Process.co Element Dev Server

A CLI tool for developing Process.co elements with an interactive development server.

## Installation

```bash

npm i @process.co/element-dev-server -g

```

## Usage

The CLI accepts an optional path argument to specify which directory to scan for Process.co element modules:

or you can run from within your element's directory or one directory above run the following command

```bash

proc-dev

```


## Features

- **Interactive UI**: Uses Ink to provide a beautiful terminal interface
- **Path Validation**: Automatically validates that the provided path exists and is a directory
- **Element Discovery**: Uses the @process.co/elements library to discover and load element modules
- **Dev Server Launch**: Launches a Vite development server for the selected element
- **Smart Directory Detection**: Automatically finds the appropriate dev directory for each element

## How It Works

The CLI uses the `@process.co/elements` library to:

1. **Scan for Elements**: Looks for `.mjs` or `.mts` files in the specified directory
2. **Load Modules**: Imports each element module using the elements library
3. **Display Information**: Shows element names and types in an interactive list
4. **Launch Dev Server**: Starts a Vite server in the appropriate directory

## Development

```bash
# Build the project
pnpm build

# Run in development mode
pnpm cli

# Watch for changes
pnpm dev
```

## Requirements

- Node.js 18+
- A directory containing Process.co element modules (`.mjs` or `.mts` files)
- Each element should have proper exports with `name` and `type` properties
- Elements should have a `dev/` directory with a `vite.config.js` file (optional)

## Element Module Format

Elements should be exported as modules with the following structure:

```javascript
// example-element.mjs
export default {
  name: 'Example Element',
  type: 'app', // or 'action', 'signal', 'credential'
  description: 'An example element',
  // ... other properties
};
```

## Error Handling

The CLI provides clear error messages for common issues:

- **Path doesn't exist**: Shows the full path that was not found
- **Path is not a directory**: Validates that the path points to a directory
- **No elements found**: Provides guidance when no valid element modules are found
- **Module loading errors**: Shows specific errors when element modules fail to load

## Examples

```bash
# From a project root with element modules
process-element

# From anywhere, pointing to a specific project
process-element ~/projects/my-process-app

# Using relative paths
process-element ./elements
```

## Element Discovery

The CLI will automatically discover elements that:

- Are `.mjs` or `.mts` files in the specified directory
- Have proper exports with `name` and `type` properties
- Can be successfully imported by the `@process.co/elements` library

Elements are displayed with their name and type for easy identification. 